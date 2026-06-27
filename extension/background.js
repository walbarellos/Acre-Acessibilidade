/**
 * Acre Acessível - Extensão (Service Worker)
 *
 * Modelo: o widget NÃO é injetado automaticamente em toda aba (isso seria
 * intrusivo demais pro uso diário). Em vez disso:
 *  - O usuário clica no ícone da extensão e ativa/desativa por aba.
 *  - O estado "ativo neste site" é lembrado por domínio (chrome.storage),
 *    então sites que o usuário sempre quer com acessibilidade ligada
 *    continuam ligados nas próximas visitas.
 */

const STORAGE_KEY_PREFIX = 'acre_enabled_';
const STORAGE_KEY_BACKEND_URL = 'acre_backend_url';

/** Extrai o hostname de uma URL de aba, ignorando páginas internas do navegador. */
function getHostnameFromUrl(url) {
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    return u.hostname;
  } catch {
    return null;
  }
}

async function isEnabledForHost(hostname) {
  const key = `${STORAGE_KEY_PREFIX}${hostname}`;
  const result = await chrome.storage.local.get(key);
  return Boolean(result[key]);
}

async function setEnabledForHost(hostname, enabled) {
  const key = `${STORAGE_KEY_PREFIX}${hostname}`;
  await chrome.storage.local.set({ [key]: enabled });
}

async function getBackendUrl() {
  const result = await chrome.storage.local.get(STORAGE_KEY_BACKEND_URL);
  return result[STORAGE_KEY_BACKEND_URL] || '';
}

/** Injeta o widget na aba ativa, configurando a URL do backend antes de carregar o bundle. */
async function injectWidget(tabId) {
  const backendUrl = await getBackendUrl();

  // 1. Configura window.AcreAcessivelConfig ANTES do bundle carregar,
  //    para que o VoiceReader use a URL certa do backend de TTS.
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (url) => {
      window.AcreAcessivelConfig = { ...(window.AcreAcessivelConfig || {}), backendUrl: url };
    },
    args: [backendUrl],
    world: 'MAIN',
  });

  // 2. Injeta o bundle do widget e inicializa.
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['widget-bundle.js'],
    world: 'MAIN',
  });

  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      // @ts-ignore
      if (window.AcreAcessivel && !document.querySelector('acre-accessibility-panel')) {
        // @ts-ignore
        window.AcreAcessivel.init({});
      }
    },
    world: 'MAIN',
  });
}

/** Remove o widget da aba ativa (recarrega a página é o jeito mais limpo de garantir limpeza total). */
async function removeWidget(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const panel = document.querySelector('acre-accessibility-panel');
      if (panel) panel.remove();
      // @ts-ignore
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    },
    world: 'MAIN',
  });
}

/** Aplica o estado salvo (ligado/desligado) a uma aba específica. Chamado ao trocar de aba ou navegar. */
async function applyStateToTab(tabId, url) {
  const hostname = getHostnameFromUrl(url);
  if (!hostname) return;

  const enabled = await isEnabledForHost(hostname);
  if (enabled) {
    await injectWidget(tabId).catch(err => console.warn('Acre Acessível: falha ao injetar', err));
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    applyStateToTab(tabId, tab.url);
  }
});

// Mensagens vindas do popup (ligar/desligar para o site atual)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message.type === 'GET_STATE') {
      const hostname = getHostnameFromUrl(message.url);
      const enabled = hostname ? await isEnabledForHost(hostname) : false;
      const backendUrl = await getBackendUrl();
      sendResponse({ hostname, enabled, backendUrl });
      return;
    }

    if (message.type === 'TOGGLE') {
      const hostname = getHostnameFromUrl(message.url);
      if (!hostname) {
        sendResponse({ ok: false, reason: 'URL inválida para este site (páginas internas do navegador não são suportadas).' });
        return;
      }
      await setEnabledForHost(hostname, message.enabled);
      if (message.enabled) {
        await injectWidget(message.tabId);
      } else {
        await removeWidget(message.tabId);
      }
      sendResponse({ ok: true });
      return;
    }

    if (message.type === 'SET_BACKEND_URL') {
      await chrome.storage.local.set({ [STORAGE_KEY_BACKEND_URL]: message.url });
      sendResponse({ ok: true });
      return;
    }
  })();

  return true; // mantém o canal aberto para a resposta assíncrona
});
