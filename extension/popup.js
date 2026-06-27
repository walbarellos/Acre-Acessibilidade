/**
 * Acre Acessível - Popup
 * Lê o estado da aba atual e permite ligar/desligar o widget para o site visitado,
 * além de configurar a URL do backend de TTS (opcional, persistido globalmente).
 */

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function init() {
  const tab = await getCurrentTab();
  const hostnameLabel = document.getElementById('hostnameLabel');
  const enableToggle = document.getElementById('enableToggle');
  const backendInput = document.getElementById('backendInput');
  const statusMsg = document.getElementById('statusMsg');

  if (!tab || !tab.url || !tab.id) {
    hostnameLabel.textContent = 'Não foi possível detectar este site.';
    enableToggle.disabled = true;
    return;
  }

  const state = await chrome.runtime.sendMessage({ type: 'GET_STATE', url: tab.url });

  if (!state.hostname) {
    hostnameLabel.textContent = 'Páginas internas do navegador não são suportadas.';
    enableToggle.disabled = true;
  } else {
    hostnameLabel.textContent = state.hostname;
    enableToggle.checked = state.enabled;
  }

  backendInput.value = state.backendUrl || '';

  enableToggle.addEventListener('change', async () => {
    const response = await chrome.runtime.sendMessage({
      type: 'TOGGLE',
      url: tab.url,
      tabId: tab.id,
      enabled: enableToggle.checked,
    });
    if (!response.ok) {
      statusMsg.textContent = response.reason || 'Erro ao aplicar.';
      enableToggle.checked = !enableToggle.checked;
    } else {
      statusMsg.textContent = enableToggle.checked
        ? 'Ativado. Pode recarregar a página se não aparecer.'
        : 'Desativado para este site.';
    }
  });

  document.getElementById('saveBackendBtn').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'SET_BACKEND_URL', url: backendInput.value.trim() });
    statusMsg.textContent = 'URL do backend salva.';
  });
}

init();
