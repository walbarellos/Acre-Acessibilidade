/**
 * Acre Acessível - Leitor de Voz v4
 * Correções:
 * - isSequentialReading flag: bloqueia click/hover/selection durante leitura sequencial
 * - scrollIntoView removido da leitura automática (só rola ao next/prev manual)
 * - SpeechSynthesis como primário, servidor como fallback
 * - v4: TextNormalizer expande números/siglas/datas antes de falar; leitura por frases
 *   (chunking) com pausas reais entre elas; pitch/rate adaptativo por tipo de elemento
 *   (título x parágrafo x item de lista) para reduzir a monotonia da voz nativa.
 */

import { TextNormalizer, type SentenceChunk } from './text-normalizer';

export interface VoiceReaderConfig {
  rate?: number;
  volume?: number;
  pitch?: number;
  lang?: string;
  onStateChange?: (state: 'idle' | 'speaking' | 'paused') => void;
  onElementHighlight?: (element: HTMLElement | null) => void;
}

export class VoiceReader {
  private synth: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private config: Required<VoiceReaderConfig>;
  private textElements: HTMLElement[] = [];
  private currentIndex: number = -1;
  private currentState: 'idle' | 'speaking' | 'paused' = 'idle';
  private highlightClassName = 'acre-reading-highlight';

  // Flag de modo sequencial — bloqueia triggers ad-hoc (click, hover, selection)
  private _isSequentialReading: boolean = false;

  // Fallback do servidor
  private useServerTts = false;
  private audioPlayer: HTMLAudioElement | null = null;

  constructor(config: VoiceReaderConfig = {}) {
    console.log('🦫 VoiceReader v4: Inicializando...');

    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : (null as any);

    this.config = {
      rate: config.rate ?? 1.0,
      volume: config.volume ?? 1.0,
      pitch: config.pitch ?? 1.0,
      lang: config.lang ?? 'pt-BR',
      onStateChange: config.onStateChange ?? (() => {}),
      onElementHighlight: config.onElementHighlight ?? (() => {}),
    };

    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }

    this.injectHighlightStyles();
    this.detectVoiceSupport();
  }

  /** Expõe se está em modo sequencial para o painel bloquear triggers externos */
  public get isSequentialReading(): boolean {
    return this._isSequentialReading;
  }

  /**
   * URL do backend de TTS (fallback neural quando não há voz pt-BR local).
   *
   * Quando o widget roda no MESMO domínio do backend (ex: ambiente de dev), o palpite
   * de porta 8001 no mesmo hostname funciona. Mas quando o widget é embutido em um
   * domínio de TERCEIROS (script embed em qualquer site, ou extensão de navegador),
   * o backend está em outro servidor — então a URL precisa ser configurada
   * explicitamente via window.AcreAcessivelConfig.backendUrl (setado pelo loader
   * a partir do atributo data-acre-backend da tag <script>, ou pela extensão).
   */
  private getBackendUrl(): string {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      const configured = window.AcreAcessivelConfig?.backendUrl;
      if (configured) return configured.replace(/\/$/, '');
      return `${window.location.protocol}//${window.location.hostname}:8001`;
    }
    return 'http://localhost:8001';
  }

  private injectHighlightStyles() {
    if (document.getElementById('acre-highlight-styles')) return;
    const style = document.createElement('style');
    style.id = 'acre-highlight-styles';
    style.innerHTML = `
    .${this.highlightClassName} {
      background-color: rgba(27, 67, 50, 0.12) !important;
      border-bottom: 2px solid #1b4332 !important;
      border-radius: 2px !important;
      transition: background-color 0.2s ease;
    }
    .acre-high-contrast-mode .${this.highlightClassName} {
      background-color: #FFFF00 !important;
      color: #000 !important;
      border-bottom: 2px solid #000 !important;
    }
    `;
    document.head.appendChild(style);
  }

  private detectVoiceSupport() {
    if (!this.synth) {
      console.warn('🦫 SpeechSynthesis indisponível. Usando servidor.');
      this.useServerTts = true;
      return;
    }

    const checkVoices = () => {
      const voices = this.synth.getVoices();
      if (voices.length === 0) {
        // Ainda carregando assincronamente — onvoiceschanged vai resolver
        this.useServerTts = false; // tenta local primeiro
        return;
      }
      const hasPt = voices.some(v => v.lang.toLowerCase().startsWith('pt'));
      this.useServerTts = !hasPt;
      if (!hasPt) {
        console.warn('🦫 Sem voz pt-BR local. Fallback para servidor.');
      }
    };

    checkVoices();
    this.synth.onvoiceschanged = checkVoices;
  }

  public setRate(rate: number) {
    this.config.rate = rate;
    if (this.currentState === 'speaking') {
      if (this.useServerTts && this.audioPlayer) {
        this.audioPlayer.playbackRate = rate;
      } else {
        const idx = this.currentIndex;
        this.stop();
        this._isSequentialReading = true;
        this.readElementAtIndex(idx, false);
      }
    }
  }

  public setVolume(volume: number) {
    this.config.volume = volume;
    if (this.useServerTts && this.audioPlayer) {
      this.audioPlayer.volume = volume;
    } else if (this.currentUtterance) {
      this.currentUtterance.volume = volume;
    }
  }

  /** Tom base da voz (1.0 = neutro). Combinado com o perfil por tipo de elemento (ver TextNormalizer). */
  public setPitch(pitch: number) {
    this.config.pitch = pitch;
  }

  private getReadableText(element: HTMLElement): string {
    const tag = element.tagName.toLowerCase();

    if (tag === 'img') {
      return element.getAttribute('alt') || element.getAttribute('title') || '';
    }

    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();

    const title = element.getAttribute('title');
    if (title && !(element.textContent || '').trim()) return title.trim();

    // textContent colapsa whitespace melhor que innerText para leitura
    const raw = (element.textContent || '').replace(/\s+/g, ' ').trim();
    return raw;
  }

  private scanReadableElements() {
    this.textElements = [];
    const selector =
    'h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption, img[alt]';
    // Separamos elementos interativos para não ler links/botões em sequência automática
    // (eles são lidos ao clicar/focar individualmente)
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));

    const filtered: HTMLElement[] = [];

    for (const el of elements) {
      if (
        el.closest('acre-accessibility-panel') ||
        el.closest('capi-mascot') ||
        el.closest('#vlibras-div') ||
        el.closest('.audio-player-wrapper') ||
        el.closest('audio')
      ) continue;

      const style = window.getComputedStyle(el);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0'
      ) continue;

      const text = this.getReadableText(el).trim();
      if (text.length < 2) continue;

      // Descarta se já tem um ancestral na lista (evita duplicata pai/filho)
      const hasAncestor = filtered.some(existing => existing.contains(el));
      if (hasAncestor) continue;

      // Remove descendentes já adicionados que são mais específicos que este (improvável mas seguro)
      for (let i = filtered.length - 1; i >= 0; i--) {
        if (el.contains(filtered[i])) filtered.splice(i, 1);
      }

      filtered.push(el);
    }

    this.textElements = filtered;
    console.log(`🦫 Varredura: ${this.textElements.length} elementos legíveis.`);
  }

  private updateState(state: 'idle' | 'speaking' | 'paused') {
    this.currentState = state;
    this.config.onStateChange(state);
    try {
      document.dispatchEvent(new CustomEvent('acre:voice:state', { detail: { state } }));
    } catch (e) {}
  }

  public play() {
    if (this.currentState === 'paused') {
      this.resume();
      return;
    }

    this.scanReadableElements();
    if (this.textElements.length === 0) {
      console.warn('🦫 Nenhum elemento legível encontrado.');
      return;
    }

    this._isSequentialReading = true;
    this.currentIndex = 0;
    this.readElementAtIndex(this.currentIndex, false);
  }

  public pause() {
    if (this.currentState !== 'speaking') return;
    if (this.useServerTts && this.audioPlayer) {
      this.audioPlayer.pause();
    } else if (this.synth) {
      this.synth.pause();
    }
    this.updateState('paused');
  }

  public resume() {
    if (this.currentState !== 'paused') return;
    if (this.useServerTts && this.audioPlayer) {
      this.audioPlayer.play().catch(err => console.error('🦫 Erro ao retomar:', err));
    } else if (this.synth) {
      this.synth.resume();
    }
    this.updateState('speaking');
  }

  public stop() {
    this._isSequentialReading = false;
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }
    this.removeHighlight();
    this.currentIndex = -1;
    this.updateState('idle');
  }

  public next() {
    if (this.textElements.length === 0) this.scanReadableElements();
    if (this.currentIndex < this.textElements.length - 1) {
      this.stopSpeechOnly();
      this.currentIndex++;
      // next/prev manual: scrolla para o elemento
      this.readElementAtIndex(this.currentIndex, true);
    } else {
      console.log('🦫 Fim dos elementos da página.');
      this.stop();
    }
  }

  public previous() {
    if (this.textElements.length === 0) this.scanReadableElements();
    if (this.currentIndex > 0) {
      this.stopSpeechOnly();
      this.currentIndex--;
      this.readElementAtIndex(this.currentIndex, true);
    }
  }

  private stopSpeechOnly() {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }
    this.removeHighlight();
  }

  private removeHighlight() {
    this.textElements.forEach(el => el.classList.remove(this.highlightClassName));
    this.config.onElementHighlight(null);
  }

  /**
   * shouldScroll = true apenas quando o usuário clicou next/prev manualmente.
   * Durante leitura automática sequencial: false (não move o mouse/viewport).
   */
  private readElementAtIndex(index: number, shouldScroll: boolean) {
    if (index < 0 || index >= this.textElements.length) {
      this.stop();
      return;
    }

    const element = this.textElements[index];
    this.removeHighlight();
    element.classList.add(this.highlightClassName);
    this.config.onElementHighlight(element);

    if (shouldScroll) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const rawText = this.getReadableText(element);
    if (!rawText.trim()) {
      // Pula elemento vazio
      if (this._isSequentialReading) {
        this.currentIndex++;
        this.readElementAtIndex(this.currentIndex, false);
      }
      return;
    }

    const tag = element.tagName.toLowerCase();
    const chunks = TextNormalizer.normalizeToChunks(rawText);
    const profile = TextNormalizer.profileForTag(tag);

    console.log(`🦫 [${index}] (${tag}) "${rawText.substring(0, 60)}${rawText.length > 60 ? '...' : ''}" — ${chunks.length} frase(s)`);

    if (this.useServerTts) {
      // Servidor recebe o texto já normalizado, porém como bloco único (a quebra em frases
      // com pausa fica a cargo do motor neural via pontuação real, ver backend tts.py)
      const normalizedFull = TextNormalizer.normalize(rawText);
      this.readViaServer(normalizedFull, () => {
        if (this._isSequentialReading && this.currentState === 'speaking' && this.currentIndex === index) {
          this.next();
        }
      });
      return;
    }

    this.speakChunks(chunks, profile, 0, index, () => {
      if (this._isSequentialReading && this.currentState === 'speaking' && this.currentIndex === index) {
        this.next();
      }
    }, (event) => this.handleSpeechError(event, () => this.readElementAtIndex(index, shouldScroll)));
  }

  /**
   * Fala uma lista de frases (chunks) em sequência, cada uma como utterance própria,
   * respeitando a pausa sugerida entre elas. Isso é o que dá à voz nativa uma entonação
   * de início/fim de frase real, em vez de uma leitura corrida e monotônica.
   */
  private speakChunks(
    chunks: SentenceChunk[],
    profile: { rateMultiplier: number; pitch: number },
    chunkIdx: number,
    elementIndex: number,
    onAllDone: () => void,
    onError: (event: any) => void
  ) {
    if (chunkIdx === 0) {
      this.updateState('speaking');
    }

    if (chunkIdx >= chunks.length) {
      onAllDone();
      return;
    }

    // Se o elemento mudou (ex: usuário pulou pra outro) ou parou de ler, aborta a cadeia
    if (this._isSequentialReading && this.currentIndex !== elementIndex) return;

    const chunk = chunks[chunkIdx];
    const utterance = new SpeechSynthesisUtterance(chunk.text);
    utterance.lang = this.config.lang;
    utterance.rate = this.config.rate * profile.rateMultiplier;
    utterance.volume = this.config.volume;
    utterance.pitch = this.clampPitch(this.config.pitch * profile.pitch);
    const voice = this.getBestPtVoice();
    if (voice) utterance.voice = voice;

    this.currentUtterance = utterance;

    utterance.onend = () => {
      if (chunk.pauseAfterMs > 0) {
        setTimeout(() => {
          this.speakChunks(chunks, profile, chunkIdx + 1, elementIndex, onAllDone, onError);
        }, chunk.pauseAfterMs);
      } else {
        this.speakChunks(chunks, profile, chunkIdx + 1, elementIndex, onAllDone, onError);
      }
    };

    utterance.onerror = event => {
      if (event.error === 'interrupted') return;
      onError(event);
    };

    this.synth.speak(utterance);
  }

  private clampPitch(pitch: number): number {
    return Math.min(2.0, Math.max(0.0, pitch));
  }

  /**
   * Lê um elemento específico ad-hoc (click ou hover).
   * Bloqueado se estiver em modo sequencial.
   */
  public readSpecificElement(element: HTMLElement, shouldScroll: boolean = false) {
    if (this._isSequentialReading) return;

    this.scanReadableElements();

    let idx = this.textElements.indexOf(element);
    if (idx === -1) {
      const selector =
      'h1, h2, h3, h4, h5, h6, p, li, blockquote, article span, label, figcaption, a, button, img[alt], [role="button"]';
      const closest = element.closest(selector) as HTMLElement;
      if (closest) {
        idx = this.textElements.indexOf(closest);
        element = closest;
      }
    }

    if (idx !== -1) {
      this.stopSpeechOnly();
      this.currentIndex = idx;
      this.readElementAtIndex(this.currentIndex, shouldScroll);
    } else {
      this.stopSpeechOnly();
      this.readSingleElement(element);
    }
  }

  private readSingleElement(element: HTMLElement) {
    this.removeHighlight();
    element.classList.add(this.highlightClassName);
    this.config.onElementHighlight(element);

    const rawText = this.getReadableText(element);
    if (!rawText.trim()) return;

    if (this.useServerTts) {
      const normalized = TextNormalizer.normalize(rawText);
      this.readViaServer(normalized, () => {
        this.removeHighlight();
        this.updateState('idle');
      });
      return;
    }

    const tag = element.tagName.toLowerCase();
    const chunks = TextNormalizer.normalizeToChunks(rawText);
    const profile = TextNormalizer.profileForTag(tag);

    this.speakChunks(chunks, profile, 0, this.currentIndex, () => {
      this.removeHighlight();
      this.updateState('idle');
    }, (event) => this.handleSpeechError(event, () => this.readSingleElement(element)));
  }

  public readTextDirectly(text: string) {
    if (this._isSequentialReading) return;
    this.stopSpeechOnly();
    this.removeHighlight();
    if (!text.trim()) return;

    if (this.useServerTts) {
      const normalized = TextNormalizer.normalize(text);
      this.readViaServer(normalized, () => this.updateState('idle'));
      return;
    }

    const chunks = TextNormalizer.normalizeToChunks(text);
    this.speakChunks(
      chunks,
      { rateMultiplier: 1.0, pitch: 1.0 },
      0,
      this.currentIndex,
      () => this.updateState('idle'),
      (event) => this.handleSpeechError(event, () => this.readTextDirectly(text))
    );
  }

  private readViaServer(text: string, onEnd: () => void) {
    if (this.audioPlayer) {
      try {
        this.audioPlayer.pause();
      } catch (e) {}
      this.audioPlayer = null;
    }

    // Proteção defensiva: querystring tem limite prático (~2000 chars em alguns proxies/CDNs).
    // O backend também valida (ver tts.py), mas truncar aqui evita 414/erro silencioso no cliente.
    const MAX_TTS_CHARS = 1500;
    const safeText = text.length > MAX_TTS_CHARS ? text.slice(0, MAX_TTS_CHARS) : text;

    const url = `${this.getBackendUrl()}/api/tts?text=${encodeURIComponent(safeText)}`;
    this.audioPlayer = new Audio(url);
    this.audioPlayer.playbackRate = this.config.rate;
    this.audioPlayer.volume = this.config.volume;

    this.audioPlayer.onplay = () => this.updateState('speaking');
    this.audioPlayer.onended = () => {
      this.audioPlayer = null;
      onEnd();
    };
    this.audioPlayer.onerror = () => {
      if (this.audioPlayer?.error?.code === 4) return;
      console.error('🦫 Erro no áudio do servidor.');
      this.stop();
    };

    this.audioPlayer.play().catch(err => {
      if (err.name === 'AbortError') return;
      console.error('🦫 Autoplay bloqueado:', err);
      this.stop();
    });
  }

  private handleSpeechError(event: any, retry: () => void) {
    const errorType = event.error;
    if (errorType === 'interrupted') return;

    this.stop();

    if (
      errorType === 'synthesis-failed' ||
      errorType === 'language-unavailable' ||
      errorType === 'network' ||
      !errorType
    ) {
      console.warn('🦫 Chaveando para servidor TTS.');
      this.useServerTts = true;
      if (this._isSequentialReading) {
        this._isSequentialReading = true; // mantém o modo
      }
      retry();
    }
  }

  private getBestPtVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    const voices = this.synth.getVoices();
    const priorities = [
      // Vozes "Natural" ou "Online" (altíssima qualidade de nuvem gratuita oferecida pelos navegadores como Edge/Chrome)
      (v: SpeechSynthesisVoice) => {
        const lang = v.lang.toLowerCase().replace('_', '-');
        return lang.startsWith('pt-br') && v.name.toLowerCase().includes('natural');
      },
      (v: SpeechSynthesisVoice) => {
        const lang = v.lang.toLowerCase().replace('_', '-');
        return lang.startsWith('pt-br') && v.name.toLowerCase().includes('online');
      },
      (v: SpeechSynthesisVoice) => {
        const lang = v.lang.toLowerCase().replace('_', '-');
        return lang.startsWith('pt-br') && v.name.includes('Google');
      },
      (v: SpeechSynthesisVoice) => {
        const lang = v.lang.toLowerCase().replace('_', '-');
        return lang.startsWith('pt-br') && v.name.includes('Microsoft');
      },
      (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-').startsWith('pt-br'),
      (v: SpeechSynthesisVoice) => v.lang.toLowerCase().startsWith('pt'),
    ];
    for (const fn of priorities) {
      const found = voices.find(fn);
      if (found) return found;
    }
    return null;
  }

  public get state() {
    return this.currentState;
  }
}
