# Planejamento e Roadmap do Acre Acessível 🦫🍃

Este arquivo descreve o status atual do projeto **Acre Acessível**, detalha tudo o que foi implementado nas Fases 1, 2 e 3, e estabelece as tarefas pendentes estruturadas para as fases subsequentes (Fase 4: Plugins de CMS e Fase 5: Validação WCAG/eMAG).

---

## 📍 Status Atual: Fase 3.5 Concluída (Voz Inteligente + Distribuição Multi-Site)
O núcleo do widget (frontend isolado em Shadow DOM) e o backend de processamento de editais (FastAPI + gTTS/Piper TTS) estão integrados, testados localmente e com suporte a conexões externas na rede. A Fase 3.5 adicionou normalização de texto para fala, segurança no backend, e dois caminhos de distribuição (script embed + extensão de navegador).

```
[✓] Fase 1: Widget de Acessibilidade & Mascote SVG (Concluído)
[✓] Fase 2: Gerador de Linguagem Simples (Concluído)
[✓] Fase 3: Geração de MP3, Sincronização e Fallback (Concluído)
[✓] Fase 3.5: Voz Inteligente (normalização) + Embed + Extensão + Segurança (Concluído)
[ ] Fase 4: Plugins WordPress, Joomla e Drupal (Pendente - Próximo Passo)
[ ] Fase 5: Portal de Testes Oficial de Conformidade WCAG/eMAG (Pendente)
```

---

## 🛠️ Fase 3.5 — O que foi feito nesta rodada

*   **`text-normalizer.ts` / `text_normalizer.py`:** Normalizador de texto espelhado em TS (frontend) e Python (backend). Expande moeda (R$), datas, percentuais, ordinais (1º→primeiro), siglas conhecidas (IFAC, CPF, CNPJ etc.) e abreviações (Sr., Dra., Art.) antes da síntese de voz.
*   **`voice-reader.ts` v4:** Leitura por frases (chunking) com pausa real entre elas; pitch/rate adaptados por tipo de elemento (h1/h2/p/li/blockquote); controle de Tom (pitch) exposto no painel, que antes só tinha Velocidade e Volume.
*   **Backend — segurança:** CORS configurável via `ACRE_ALLOWED_ORIGINS` (padrão ainda `*` com warning explícito no log); rate limiting em memória por IP (30 req/min) em `/api/tts` e `/api/process-pdf`; limite de tamanho de texto (2000 chars) e de upload de PDF (10 MB).
*   **`embed/`:** Script `<script>` de uma linha (`acre-acessivel.js`, build via `vite.config.embed.ts`) para qualquer site colar, com configuração via atributos `data-acre-backend` / `data-acre-libras` / `data-acre-auto`.
*   **`extension/`:** Extensão Manifest V3 (Chrome/Edge/Brave) para uso pessoal — injeção controlada por toggle (não liga automaticamente em toda aba), com popup para ativar por site e configurar a URL do backend.

### ⚠️ Limitações conhecidas (documentadas, não bugs silenciosos)
*   **Concordância de gênero nos ordinais:** "1ª turma" é expandido para "primeiro turma" (deveria ser "primeira"). O normalizador não faz análise gramatical de gênero — converte o número, mas não ajusta a terminação. Ajuste futuro: detectar substantivo seguinte ou manter uma lista de exceções femininas comuns (turma, vez, edição...).
*   **CSS global do painel:** `accessibility-panel.ts` aplica `font-size`/`line-height`/`letter-spacing` via `!important` em `html`/`body`. Em sites com CSS muito agressivo isso pode gerar pequenos conflitos visuais — é uma limitação inerente a qualquer widget que precisa alterar a página hospedeira "de fora".
*   **Rate limit em memória:** o rate limiting do backend é por processo (não distribuído). Se o backend rodar com múltiplas instâncias atrás de um load balancer, cada instância tem seu próprio contador. Para produção em escala, mover para Redis ou um rate limiter na borda (Nginx/Cloudflare).

---

## 🛠️ O que já foi feito (Fases 1, 2 e 3)

### 1. Frontend: Widget Modular e Acessível (`src/widget/`)
*   **Mascote Capi (`capi-mascot.ts`):** Componente em SVG animado nativo que representa uma capivara. Possui estados visuais de piscada/ocioso (`idle`), escuta de leitura (`reading` com óculos de leitura ativos e brilhantes) e fala (`speaking` com movimentação sincronizada do focinho e da boca).
*   **Controle e Voz (`voice-reader.ts`):**
    *   **Leitura dinâmica:** Suporte a leitura sequencial por botões de fluxo, clique direto sobre qualquer parágrafo do site e leitura por apontamento (passar o mouse com debounce de 250ms e foco por teclado Tab).
    *   **Acessibilidade semântica:** Leitura de metadados invisíveis (`aria-label`, `title`) e descrições alternativas de imagens (`alt` tags).
    *   **Fallback do Servidor:** Detecção automática de vozes locais em português. Caso não existam (comum em navegadores Linux) ou ocorra erro de execução local, o leitor desvia silenciosamente para o backend de TTS.
*   **Painel Flutuante (`accessibility-panel.ts`):** Gaveta lateral (drawer) estilizada com paleta de cores verde do Acre contendo botões de controle de voz (velocidade, volume, play/pause), contraste extremo, modo escala de cinza, tamanho de fonte (0.8x a 2.0x), espaçamento de letras/linhas, fonte para dislexia, toggle do mascote e ativação de Libras.
*   **Integração do VLibras:** Injeção sob demanda do script governamental e sincronização da voz do Capi com o texto selecionado para tradução.

### 2. Backend: Simplificador e TTS Dinâmico (`backend/`)
*   **Extrator de PDFs (`services/pdf_extractor.py`):** Extração de texto de editais em PDF via biblioteca `pdfplumber`.
*   **Serviço de Simplificação (`services/simplifier.py`):** Algoritmo heurístico de estruturação de editais públicos em formato legível com base em quatro abas principais (Resumo, Cronograma, Checklist de Requisitos e FAQ).
*   **Geração de Áudio (`services/tts.py`):** Geração de MP3s estáticos para as abas dos editais simplificados usando gTTS ou síntese neural offline de alta fidelidade com o Piper TTS local (`pt_BR-giselle-medium.onnx`).
*   **Endpoint de Fala (`main.py`):** Endpoint `/api/tts` que atende o widget de frontend em tempo real. Implementa **gravação atômica** via arquivo `.tmp` e renomeação física (`os.replace`) para evitar que requisições paralelas do navegador acessem buffers vazios (solução definitiva para erros de status `416`).

---

## 📝 Lista de Tarefas Pendentes (TODO Decente)

### 🔌 Fase 4: Distribuição e Integração com CMS (Próxima Fase)
O objetivo desta fase é empacotar o widget do Acre Acessível de modo que possa ser instalado com um clique em portais de notícias e portais institucionais baseados em CMS de mercado.

*   **WordPress (Plugin PHP):**
    *   [ ] Estruturar a pasta do plugin `wp-plugin-acre-acessivel/`.
    *   [ ] Criar o arquivo de metadados principal `acre-acessivel.php`.
    *   [ ] Desenvolver tela de configurações administrativas (`Settings API` do WP) no painel administrativo:
        *   Configurar a URL do backend de processamento de PDFs e TTS.
        *   Ativar/desativar o VLibras por padrão.
        *   Definir volume e velocidade de voz padrão.
    *   [ ] Enfileirar os arquivos de script e estilos compilados (`dist/assets/index-*.js` e `css`) no front do WordPress usando `wp_enqueue_script` e `wp_enqueue_style`.
    *   [ ] Adicionar suporte a Shortcode `[acre_acessivel]` ou injeção automática no rodapé de todas as páginas públicas do site.
*   **Documentação para Drupal:**
    *   [ ] Criar guia passo a passo ensinando a injetar o widget criando um bloco customizado no painel do Drupal.
    *   [ ] Escrever arquivo de manifesto para módulo Drupal (`acre_acessivel.info.yml`).
*   **Documentação para Joomla:**
    *   [ ] Criar guia de injeção usando o gerenciador de módulos do Joomla (Custom HTML).

### ⚖️ Fase 5: Conformidade Legal, Validação e Homologação
Esta fase valida a conformidade das páginas e do widget com as leis brasileiras de inclusão digital e diretrizes internacionais.

*   **Validação técnica:**
    *   [ ] Desenvolver portal oficial de testes para rodar scripts automatizados de acessibilidade (estilo Axe/Lighthouse).
    *   [ ] Garantir conformidade com as regras do **eMAG (Modelo de Acessibilidade em Governo Eletrônico)**.
    *   [ ] Validar conformidade com **WCAG 2.1 (nível AA)**.
    *   [ ] Ajustar a ordem lógica de foco e navegação completa por teclado das abas do portal dinâmico após o upload de editais.
*   **Homologação de Acessibilidade:**
    *   [ ] Testar a navegação do portal utilizando leitores de tela físicos líderes do mercado (NVDA e JAWS no Windows, VoiceOver no macOS/iOS e TalkBack no Android).
    *   [ ] Realizar testes de usabilidade com voluntários (pessoas com deficiência auditiva, visual, idosos e pessoas com dislexia) para colher feedback e realizar ajustes finais de comportamento e velocidade do widget.
