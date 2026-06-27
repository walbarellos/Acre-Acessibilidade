/**
 * Acre Acessível - Mascote Capi (Capivarinha)
 * Web Component para o Mascote Interativo Capi.
 */

export class CapiMascot extends HTMLElement {
  private shadow: ShadowRoot;
  private isMuted: boolean = false;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['state', 'muted'];
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === 'state') {
      this.setMascotState(newValue);
    } else if (name === 'muted') {
      this.isMuted = newValue === 'true';
      this.updateMutedIcon();
    }
  }

  connectedCallback() {
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', 'Capi, a capivara mascote do Acre Acessível. Clique para abrir o menu de acessibilidade.');
    this.setAttribute('tabindex', '0');
    this.render();
    this.setupEvents();
    // Acena após 2s de carregamento
    setTimeout(() => this.greet(), 2200);
  }

  private render() {
    this.shadow.innerHTML = `
    <style>
    :host {
      display: block;
      width: 90px;
      height: 110px;
      cursor: pointer;
      user-select: none;
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      filter: drop-shadow(0 10px 15px rgba(0,0,0,0.15));
    }

    :host(:hover) {
      transform: scale(1.1) translateY(-5px);
    }

    .mascot-container {
      position: relative;
      width: 100%;
      height: 100%;
    }

    /* SVG Animado da Capivara Capi */
    svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    /* Cores da Capivara */
    .fur-body { fill: #8B5A2B; transition: fill 0.3s; }
    .fur-snout { fill: #6E4720; transition: fill 0.3s; }
    .fur-belly { fill: #A06D3B; transition: fill 0.3s; }
    .fur-ear-inner { fill: #523416; }
    .eye { fill: #222; }
    .eye-shine { fill: #FFF; }
    .glasses-frame { stroke: #1b4332; stroke-width: 2.5; fill: none; opacity: 0; transition: opacity 0.3s, stroke 0.3s; }
    .glasses-lens { fill: rgba(135, 206, 250, 0.15); stroke: rgba(135, 206, 250, 0.4); stroke-width: 1; opacity: 0; transition: opacity 0.3s; }
    .cheek { fill: #FF8A8A; opacity: 0.6; }

    /* Boca */
    .mouth-idle { display: block; }
    .mouth-talk { display: none; fill: #4A1E00; }

    /* Animações */
    @keyframes blink {
      0%, 90%, 100% { transform: scaleY(1); }
      95% { transform: scaleY(0.1); }
    }

    @keyframes ear-wiggle {
      0%, 90%, 100% { transform: rotate(0deg); }
      93% { transform: rotate(-8deg); }
      96% { transform: rotate(8deg); }
    }

    @keyframes talk {
      0%, 100% { transform: scaleY(0.2); }
      50% { transform: scaleY(1.3); }
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }


    @keyframes greeting-wave {
      0%, 100% { transform: rotate(0deg) translateY(0); }
      15% { transform: rotate(-15deg) translateY(-3px); }
      30% { transform: rotate(12deg) translateY(-5px); }
      45% { transform: rotate(-10deg) translateY(-3px); }
      60% { transform: rotate(8deg) translateY(-4px); }
      75% { transform: rotate(-5deg) translateY(-2px); }
      90% { transform: rotate(3deg) translateY(-1px); }
    }

    :host(.greeting) {
      animation: greeting-wave 1.2s ease-in-out;
    }

    .animate-float {
      animation: float 4s ease-in-out infinite;
    }

    .eye-group {
      transform-origin: 35px 43px;
      animation: blink 5s infinite;
    }

    .ear-right {
      transform-origin: 65px 25px;
      animation: ear-wiggle 6s infinite;
    }

    .ear-left {
      transform-origin: 25px 22px;
      animation: ear-wiggle 6s infinite 0.5s;
    }

    /* Estados ativos */
    :host([state="speaking"]) .mouth-idle {
      display: none;
    }
    :host([state="speaking"]) .mouth-talk {
      display: block;
      transform-origin: 48px 65px;
      animation: talk 0.25s infinite alternate;
    }

    :host([state="reading"]) .glasses-frame,
    :host([state="reading"]) .glasses-lens,
    :host([state="speaking"]) .glasses-frame,
    :host([state="speaking"]) .glasses-lens {
      opacity: 1;
    }

    /* Alto Contraste */
    :host(.high-contrast) .fur-body { fill: #000; stroke: #FFF; stroke-width: 2; }
    :host(.high-contrast) .fur-snout { fill: #000; stroke: #FFF; stroke-width: 2; }
    :host(.high-contrast) .fur-ear-inner { fill: #FFF; }
    :host(.high-contrast) .eye { fill: #FFF; }
    :host(.high-contrast) .glasses-frame { stroke: #FFFF00; stroke-width: 3; }
    :host(.high-contrast) .glasses-lens { fill: rgba(255, 255, 0, 0.1); stroke: #FFFF00; }

    /* Balão de Fala do Capi */
    .speech-bubble {
      position: absolute;
      bottom: 110px;
      right: 0px;
      background: white;
      border: 2px solid #1b4332;
      border-radius: 12px;
      padding: 8px 12px;
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 500;
      color: #1b4332;
      white-space: nowrap;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      opacity: 0;
      transform: translateY(10px) scale(0.9);
      transition: opacity 0.3s, transform 0.3s;
      pointer-events: none;
    }

    .speech-bubble::after {
      content: '';
      position: absolute;
      bottom: -8px;
      right: 35px;
      border-width: 8px 8px 0;
      border-style: solid;
      border-color: white transparent;
      display: block;
      width: 0;
    }

    .speech-bubble::before {
      content: '';
      position: absolute;
      bottom: -11px;
      right: 34px;
      border-width: 9px 9px 0;
      border-style: solid;
      border-color: #1b4332 transparent;
      display: block;
      width: 0;
      z-index: -1;
    }

    :host(:hover) .speech-bubble {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .muted-indicator {
      position: absolute;
      top: -5px;
      right: -5px;
      background: #ef4444;
      color: white;
      border-radius: 50%;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      opacity: 0;
      transform: scale(0.5);
      transition: opacity 0.3s, transform 0.3s;
    }

    .muted-indicator.visible {
      opacity: 1;
      transform: scale(1);
    }
    </style>

    <div class="mascot-container animate-float">
    <div class="speech-bubble">Olá! Sou o Capi. Clique em mim!</div>

    <!-- Mascote SVG -->
    <svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
    <!-- Patas traseiras/Corpo de baixo -->
    <ellipse cx="50" cy="98" rx="28" ry="12" class="fur-belly" />

    <!-- Corpo principal -->
    <path d="M 28 98 C 22 75, 25 50, 40 45 C 55 40, 72 45, 76 65 C 79 80, 76 95, 72 98 Z" class="fur-body" />

    <!-- Orelha Esquerda -->
    <g class="ear-left">
    <ellipse cx="28" cy="25" rx="7" ry="9" class="fur-body" transform="rotate(-15 28 25)" />
    <ellipse cx="28" cy="26" rx="4" ry="6" class="fur-ear-inner" transform="rotate(-15 28 26)" />
    </g>

    <!-- Orelha Direita -->
    <g class="ear-right">
    <ellipse cx="65" cy="27" rx="8" ry="10" class="fur-body" transform="rotate(15 65 27)" />
    <ellipse cx="65" cy="28" rx="5" ry="7" class="fur-ear-inner" transform="rotate(15 65 28)" />
    </g>

    <!-- Cabeça -->
    <!-- O formato característico de 'bloco' da cabeça da capivara -->
    <path d="M 28 50 C 28 30, 35 22, 52 24 C 69 26, 70 35, 68 55 C 66 68, 55 72, 45 72 C 34 71, 28 65, 28 50 Z" class="fur-body" />

    <!-- Focinho/Parte da Boca da capivara (mais escura) -->
    <path d="M 40 50 C 40 45, 48 42, 60 44 C 68 46, 68 55, 65 62 C 60 69, 48 68, 42 66 C 39 64, 40 55, 40 50 Z" class="fur-snout" />

    <!-- Bochecha corada -->
    <ellipse cx="37" cy="60" rx="4" ry="3" class="cheek" />

    <!-- Olho Esquerdo (visível de perfil de 3/4) -->
    <g class="eye-group">
    <ellipse cx="35" cy="43" rx="3.5" ry="4.5" class="eye" />
    <circle cx="33.5" cy="41.5" r="1.2" class="eye-shine" />
    </g>

    <!-- Óculos (Aparecem quando o estado é 'reading') -->
    <g class="glasses">
    <!-- Lente e Armação da Esquerda -->
    <circle cx="34" cy="43" r="8" class="glasses-lens" />
    <circle cx="34" cy="43" r="8" class="glasses-frame" />
    <!-- Ponte dos óculos -->
    <path d="M 42 43 Q 46 40 50 44" class="glasses-frame" />
    <!-- Lente e Armação da Direita -->
    <circle cx="58" cy="45" r="8" class="glasses-lens" />
    <circle cx="58" cy="45" r="8" class="glasses-frame" />
    </g>

    <!-- Nariz de Capivara -->
    <path d="M 62 46 C 64 45, 66 45, 67 47 C 67 49, 65 52, 62 50 Z" fill="#2D1C0C" />

    <!-- Boca / Linha de expressão -->
    <!-- Boca Ociosa -->
    <path d="M 52 61 Q 57 63 60 60" stroke="#3A2410" stroke-width="2" fill="none" class="mouth-idle" />

    <!-- Boca Falando -->
    <ellipse cx="56" cy="62" rx="3" ry="4" class="mouth-talk" />

    <!-- Pequeno Dente de capivara aparecendo na boca falando -->
    <rect x="54.5" y="58" width="3" height="2" fill="#FFF" class="mouth-talk" style="animation: none;" />

    <!-- Detalhe da Graminha no Canto (simboliza o Acre sustentável) -->
    <path d="M 20 108 Q 15 100 8 102 Q 13 108 20 110" fill="#2d6a4f" />
    <path d="M 23 108 Q 22 95 16 93 Q 20 105 23 110" fill="#1b4332" />
    </svg>

    <div class="muted-indicator" id="mutedIndicator">🔇</div>
    </div>
    `;
  }

  private setupEvents() {
    this.addEventListener('click', () => {
      // Dispara um evento customizado que o painel principal irá escutar
      this.dispatchEvent(new CustomEvent('toggle-panel', {
        bubbles: true,
        composed: true
      }));
    });
  }

  private setMascotState(state: string) {
    const bubble = this.shadow.querySelector('.speech-bubble') as HTMLElement;
    if (!bubble) return;

    if (state === 'speaking') {
      bubble.innerText = 'Estou lendo para você...';
      bubble.style.opacity = '1';
      bubble.style.transform = 'translateY(0) scale(1)';
    } else if (state === 'reading') {
      bubble.innerText = 'Modo leitura ativo!';
      bubble.style.opacity = '1';
      bubble.style.transform = 'translateY(0) scale(1)';
    } else {
      // idle — volta ao estado padrão (hover mostra via CSS)
      bubble.innerText = 'Olá! Sou o Capi. Clique em mim!';
      bubble.style.opacity = '';
      bubble.style.transform = '';
    }
  }

  private updateMutedIcon() {
    const indicator = this.shadow.getElementById('mutedIndicator');
    if (indicator) {
      if (this.isMuted) {
        indicator.classList.add('visible');
      } else {
        indicator.classList.remove('visible');
      }
    }
  }

  public setHighContrast(active: boolean) {
    const host = this.shadow.host;
    if (active) {
      host.classList.add('high-contrast');
    } else {
      host.classList.remove('high-contrast');
    }
  }

  // Animação de boas-vindas — pode ser chamada externamente
  public greet() {
    this.classList.add('greeting');
    setTimeout(() => this.classList.remove('greeting'), 1300);
  }

}

customElements.define('capi-mascot', CapiMascot);
