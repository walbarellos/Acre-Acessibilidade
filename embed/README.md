# Acre Acessível — Script Embed

Cole **uma linha** no HTML de qualquer site para ativar o widget de acessibilidade.

## Uso básico

```html
<script src="https://SEU_DOMINIO/acre-acessivel.js"></script>
```

Coloque antes do `</body>`. O widget (mascote Capi + painel de acessibilidade) aparece
sozinho, sem precisar de mais nenhum código.

## Configuração via atributos `data-*`

```html
<script
  src="https://SEU_DOMINIO/acre-acessivel.js"
  data-acre-backend="https://api.seudominio.com"
  data-acre-libras="true"
></script>
```

| Atributo            | Padrão  | Descrição                                                                 |
|----------------------|---------|----------------------------------------------------------------------------|
| `data-acre-backend`  | (auto)  | URL do backend de TTS neural (Piper/gTTS). **Obrigatório em produção** — sem isso, o fallback de voz tenta `https://<dominio-do-site>:8001`, que não existe no domínio de terceiros. |
| `data-acre-libras`   | `false` | Se `"true"`, já ativa a integração com VLibras automaticamente.            |
| `data-acre-auto`     | `true`  | Se `"false"`, não inicializa sozinho — o site chama `window.AcreAcessivel.init()` quando quiser (útil se você quer inicializar depois de algum evento, ex: consentimento de cookies). |

## Build

```bash
npm install
npx vite build --config vite.config.embed.ts
```

Gera `dist-embed/acre-acessivel.js` — suba esse arquivo único para um CDN, S3,
ou qualquer hospedagem estática com HTTPS. Esse é o arquivo que vai no `src=` do
`<script>`.

## Sobre o backend de TTS

O widget tenta usar a voz nativa do navegador primeiro (`SpeechSynthesis`, grátis,
sem servidor). Ele só chama o backend (`data-acre-backend`) quando:
- o sistema do usuário não tem voz em português instalada, **ou**
- a voz nativa falhar em tempo real.

Se você não for hospedar o backend, o widget ainda funciona — só perde o fallback
neural em sistemas sem voz pt-BR (principalmente Linux sem pacotes de voz).

## Segurança — CORS do backend

Se for hospedar o backend (`backend/`), configure a variável de ambiente
`ACRE_ALLOWED_ORIGINS` com os domínios que vão embutir o widget:

```bash
ACRE_ALLOWED_ORIGINS=https://portal.fem.exemplo.gov.br,https://outrosite.com
```

Sem essa variável, o backend aceita requisições de qualquer origem (necessário
para funcionar como widget genérico, mas sem nenhuma restrição). Ver comentários
em `backend/app/main.py` para detalhes.

## Limitação conhecida

O widget injeta estilos globais (`font-size`, `line-height` etc. em `html`/`body`)
para os controles de acessibilidade visual funcionarem em qualquer página. Em sites
com CSS muito agressivo (`!important` em conflito direto), pode haver pequenas
inconsistências visuais. O leitor de voz e o painel em si rodam isolados via Shadow
DOM e não sofrem esse problema.
