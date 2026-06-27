import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Build do widget para uso pela EXTENSÃO de navegador.
 *
 * Diferente do embed (vite.config.embed.ts), este NÃO se auto-inicializa —
 * a extensão controla quando injetar e quando chamar window.AcreAcessivel.init(),
 * via background.js + chrome.scripting.executeScript.
 *
 * Uso:
 *   npx vite build --config vite.config.extension.ts
 *
 * Gera: extension/widget-bundle.js (direto na pasta da extensão, pronto para
 * carregar via chrome://extensions > Carregar sem compactação).
 */
export default defineConfig({
  publicDir: false, // evita que o Vite copie public/ (favicon.svg, icons.svg) para extension/
  build: {
    outDir: 'extension',
    emptyOutDir: false, // não apagar manifest.json, popup.html etc já na pasta
    lib: {
      entry: resolve(__dirname, 'src/widget/index.ts'),
      name: 'AcreAcessivelWidget',
      formats: ['iife'],
      fileName: () => 'widget-bundle.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    minify: 'oxc',
  },
});
