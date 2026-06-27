# Acre Acessível — Extensão de Navegador

Para uso pessoal: ativa o widget de acessibilidade (leitor de voz, mascote Capi,
ajustes visuais) em **qualquer site**, sem precisar que o site instale nada.

## Como funciona

A extensão **não liga sozinha em toda aba**. Você decide, site por site, clicando
no ícone da extensão e ativando o toggle "Ativar neste site". A preferência fica
salva — sites que você ativa uma vez continuam ativos nas próximas visitas.

## Instalação (Chrome / Edge / Brave — qualquer navegador baseado em Chromium)

1. Abra `chrome://extensions` (ou `edge://extensions`, `brave://extensions`).
2. Ative o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** (ou "Load unpacked").
4. Selecione a pasta `extension/` deste pacote.
5. O ícone do Capi 🦫 aparece na barra de extensões.

## Uso

1. Navegue até qualquer site.
2. Clique no ícone da extensão.
3. Ative o toggle "Ativar neste site".
4. O widget aparece no canto da página. Use `Alt+A` para abrir o painel,
   `Alt+P` para iniciar a leitura.

## Backend de TTS (opcional)

Por padrão, a extensão usa só a voz nativa do navegador (`SpeechSynthesis`).
Se você quiser o fallback de voz neural (Piper/gTTS, melhor qualidade e mais
consistente entre sites), suba o backend (`backend/`) em algum servidor e
cole a URL no campo "URL do backend de TTS" do popup.

## Por que não é injeção automática em `<all_urls>`?

Duas razões:
1. **Uso diário real**: você não quer um widget de leitura de página aparecendo
   em toda aba sempre — isso seria mais irritante do que útil.
2. **Performance/segurança**: injetar e inicializar JS em toda página carregada,
   sempre, custa CPU e amplia a superfície de algo dar errado sem necessidade.

O toggle por site resolve isso com uma única ação, e a preferência é lembrada.

## Rebuild do widget-bundle.js

Se você alterar algo em `src/widget/`, regenere o bundle da extensão:

```bash
npm install
npx vite build --config vite.config.extension.ts
```

Isso atualiza `extension/widget-bundle.js` no lugar, sem apagar manifest/popup/ícones.

## Permissões usadas

- `storage`: salvar a preferência ligado/desligado por site, e a URL do backend.
- `scripting` + `host_permissions: <all_urls>`: injetar o widget na aba ativa
  quando você liga o toggle. Necessário para funcionar em qualquer site, mas
  só é usado quando você explicitamente ativa.
- `tabs`: saber a URL/hostname da aba ativa para aplicar a preferência certa.

Nenhum dado é enviado para servidores do Acre Acessível além do texto lido em
voz alta via TTS neural (e só se você configurar um backend e só quando a voz
nativa não estiver disponível).
