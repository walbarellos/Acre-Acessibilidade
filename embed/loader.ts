/**
 * Acre Acessível - Loader de Embed
 *
 * Ponto de entrada do script embedável. Qualquer site cola:
 *
 *   <script src="https://SEU_DOMINIO/acre-acessivel.js"
 *           data-acre-libras="true"
 *           data-acre-backend="https://api.seudominio.com"></script>
 *
 * E o widget aparece sozinho na página, sem precisar de mais nenhum código.
 *
 * Atributos suportados na tag <script> (todos opcionais):
 *   data-acre-libras="true"     -> ativa integração VLibras automaticamente
 *   data-acre-backend="<url>"   -> URL do backend de TTS (senão usa o padrão embutido no build)
 *   data-acre-auto="false"      -> desativa a inicialização automática
 *                                   (nesse caso, o site chama window.AcreAcessivel.init() manualmente)
 */

import '../src/widget/index';

function getCurrentScriptTag(): HTMLScriptElement | null {
  // document.currentScript funciona durante a execução síncrona do script — é o jeito
  // confiável de saber QUAL tag <script> carregou este arquivo (pode haver várias na página).
  if (document.currentScript instanceof HTMLScriptElement) {
    return document.currentScript;
  }
  // Fallback para navegadores/contextos onde currentScript não está disponível
  // (ex: script carregado via document.write ou de forma assíncrona em alguns browsers antigos).
  const scripts = document.getElementsByTagName('script');
  for (let i = scripts.length - 1; i >= 0; i--) {
    if (scripts[i].src.includes('acre-acessivel')) return scripts[i];
  }
  return null;
}

function autoInit() {
  const scriptTag = getCurrentScriptTag();
  const dataset = scriptTag?.dataset ?? {};

  const autoEnabled = dataset.acreAuto !== 'false';

  // Configuração global lida pelo VoiceReader (getBackendUrl) e outros módulos.
  // Setamos isso ANTES do init, independente de autoEnabled, porque o site pode
  // chamar window.AcreAcessivel.init() manualmente depois e ainda precisa da URL certa.
  if (dataset.acreBackend) {
    // @ts-ignore
    window.AcreAcessivelConfig = {
      // @ts-ignore
      ...(window.AcreAcessivelConfig ?? {}),
      backendUrl: dataset.acreBackend,
    };
  }

  if (!autoEnabled) {
    console.log('🦫 Acre Acessível carregado em modo manual. Chame window.AcreAcessivel.init() quando quiser.');
    return;
  }

  const config = {
    libras: dataset.acreLibras === 'true',
  };

  // @ts-ignore — window.AcreAcessivel é exposto pelo módulo importado acima
  if (window.AcreAcessivel) {
    // @ts-ignore
    window.AcreAcessivel.init(config);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit);
} else {
  // DOM já carregado (script colocado no fim do <body> ou carregado com defer/async tarde)
  autoInit();
}
