# Acre Acessível 🦫🍃

O **Acre Acessível** é uma plataforma e widget de acessibilidade digital aberta, gratuita e de código livre, desenvolvida como uma alternativa moderna ao Rybena, especificamente desenhada para as necessidades de órgãos públicos do estado do Acre.

Esta solução visa dar autonomia para cidadãos com necessidades cognitivas, visuais e auditivas, trazendo um mascote interativo regional, o **Capi** (uma capivarinha simpática animada em SVG/CSS), que acompanha a navegação por voz.

---

## ✨ Funcionalidades da Fase 1 (Widget JS)

1. **Mascote Capi Interativo:**
   - Construído em SVG puro com Shadow DOM.
   - Animações de estado: piscando (idle), mexendo as orelhas (atento), óculos brilhantes (lendo) e boca/focinho móveis sincronizados com a fala.
   - Serve como botão flutuante e atalho para o painel de acessibilidade.
2. **Leitor de Tela Embutido:**
   - Utiliza a `SpeechSynthesis` nativa do navegador para leitura rápida.
   - Controles de Play, Pause, Avançar, Voltar e Parar.
   - Rola a tela automaticamente e adiciona destaque visual (`highlight`) com foco no parágrafo ativo.
   - Ajuste dinâmico de **Velocidade** e **Volume** da fala.
   - Permite clicar em qualquer texto da página para iniciar a leitura dali.
3. **Acessibilidade Visual & Layout:**
   - Aumento e diminuição progressiva da fonte.
   - Modo de Alto Contraste Extremo (preto/branco/amarelo).
   - Escala de Cinza (Preto e Branco).
   - Ajuste de espaçamento entre linhas (Normal, Médio, Largo).
   - Ajuste de espaçamento entre letras (Normal, Médio, Largo).
   - Fonte especial amigável para pessoas com dislexia.
4. **Navegação & Teclado:**
   - Atalhos rápidos globais (`Alt + A` abre o painel, `Alt + P` inicia/pausa fala, `Alt + S` cancela fala, `Alt + N` avança, `Alt + B` retrocede).
   - Links superiores invisíveis de salto para o conteúdo para leitores de tela convencionais (NVDA/JAWS).
5. **Integração de Libras:**
   - Ativação dinâmica e opcional do **VLibras** diretamente no painel.
6. **Voz Inteligente (v4):**
   - Normalização de texto antes da fala: números, moeda (R$), datas, ordinais, siglas e abreviações são expandidos para a forma falada correta (ex: "R$ 1.200,50" → "1.200 reais e 50 centavos"; "Art. 5º" → "Artigo quinto").
   - Leitura por frases (chunking): cada frase é uma utterance própria com pausa real entre elas, dando entonação de início/fim de frase em vez de leitura monotônica.
   - Tom (pitch) e velocidade adaptados por tipo de elemento (títulos mais graves e pausados, texto corrido no tom normal).
   - Controle de Tom (pitch) adicionado ao painel, junto de Velocidade e Volume.

---

## 🌐 Acoplar em qualquer site

Duas formas de usar o widget fora deste repositório, em `embed/` e `extension/`:

- **`embed/`** — script `<script>` de uma linha para qualquer site colar (ex: o portal da FEM). Ver `embed/README.md`.
- **`extension/`** — extensão de navegador (Chrome/Edge/Brave) para uso pessoal em qualquer site, sem o site precisar fazer nada. Ver `extension/README.md`.

Ambos reutilizam o mesmo código de `src/widget/` — qualquer melhoria feita ali se propaga para os dois ao rebuildar.

---

## 🔒 Segurança do backend

O backend (`backend/`) é chamado diretamente do navegador por qualquer site que
embuta o widget, então CORS aberto é necessário por design — mas isso vem com
controles: allowlist de origem configurável (`ACRE_ALLOWED_ORIGINS`), rate
limiting por IP, e limite de tamanho de texto/arquivo. Ver comentários em
`backend/app/main.py` para configurar em produção.

---

## 🛠️ Tecnologias Utilizadas

- **TypeScript** & **Vite** (Ambiente de desenvolvimento robusto)
- **Web Components** (Shadow DOM para isolamento de CSS do widget)
- **Vanilla CSS** (Paleta premium do Acre baseada em HSL)
- **Web Speech API** (`SpeechSynthesis` para leitura por voz em tempo real)

---

## 📁 Estrutura de Arquivos

```text
AcreAcessivel/
├── src/
│   ├── widget/
│   │   ├── capi-mascot.ts           # Componente do mascote Capi em SVG animado
│   │   ├── voice-reader.ts          # Serviço do leitor de tela
│   │   ├── text-normalizer.ts       # Normalização de texto para fala (números, siglas, datas, ordinais)
│   │   ├── accessibility-panel.ts   # Gaveta de configurações visuais e leitor
│   │   └── index.ts                 # Inicializador global
│   ├── main.ts                      # Ponto de entrada da demonstração
│   └── style.css                    # Folha de estilos premium do Portal Demo
├── embed/
│   ├── loader.ts                    # Entrypoint do script <script> embedável
│   ├── exemplo-site-terceiro.html   # Exemplo de uso em um site qualquer
│   └── README.md                    # Como hospedar e configurar
├── extension/
│   ├── manifest.json                # Manifest V3 (Chrome/Edge/Brave)
│   ├── background.js                # Service worker: toggle por site, injeção
│   ├── popup.html / popup.js        # UI da extensão
│   ├── widget-bundle.js             # Build do widget para a extensão
│   └── README.md                    # Como instalar e usar
├── backend/
│   └── app/services/text_normalizer.py  # Mesmo normalizador, espelhado em Python
├── vite.config.embed.ts             # Build do script embed (dist-embed/)
├── vite.config.extension.ts         # Build do bundle da extensão
├── index.html                       # Portal Demonstrativo do Acre
├── package.json
└── tsconfig.json
```

---

## 🚀 Como Executar o Projeto Localmente

O projeto é composto por dois servidores rodando em paralelo:

### 1. Servidor Frontend (Widget & Demo Portal)

Abra um terminal na raiz do projeto:
```bash
# Instale as dependências do Vite
npm install

# Inicie o servidor frontend
npm run dev
```
*Acesse o portal demonstrativo em: [http://localhost:5173](http://localhost:5173)*

### 2. Servidor Backend (Gerador de Conteúdo FastAPI)

Abra outro terminal na pasta `backend/`:
```bash
# Entre na pasta do backend
cd backend

# Crie e ative o ambiente virtual (caso ainda não o tenha feito)
python3 -m venv .venv
source .venv/bin/activate

# Instale as dependências (com flag de compatibilidade com Python 3.14+ se necessário)
PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1 pip install -r requirements.txt

# Inicie o servidor FastAPI na porta 8001
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8001
```
*A API estará online em: [http://localhost:8001](http://localhost:8001)*
*A documentação Swagger estará disponível em: [http://localhost:8001/docs](http://localhost:8001/docs)*

---

## 📄 Licença

Este projeto é de código aberto sob a licença [MIT](LICENSE). Qualquer município ou estado pode utilizar, modificar e adaptar para suas realidades.
