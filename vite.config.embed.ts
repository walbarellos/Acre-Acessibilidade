import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Build separado do widget como script embedável standalone (IIFE).
 *
 * Diferente do build padrão (vite build, usado para a demo em index.html),
 * este gera um ÚNICO arquivo JS auto-executável com CSS já embutido via JS
 * (o widget injeta seus próprios <style> em runtime, então não precisamos
 * de um .css separado aqui).
 *
 * Uso:
 *   npx vite build --config vite.config.embed.ts
 *
 * Gera: dist-embed/acre-acessivel.js
 *
 * O portal FEM (ou qualquer site) cola isso no HTML:
 *   <script src="https://SEU_DOMINIO/acre-acessivel.js" data-acre-libras="true"></script>
 *
 * Ver embed/README.md para todas as opções de configuração via atributos.
 */
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist-embed',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'embed/loader.ts'),
      name: 'AcreAcessivelLoader',
      formats: ['iife'],
      fileName: () => 'acre-acessivel.js',
    },
    rollupOptions: {
      output: {
        // Tudo em um arquivo só — é isso que faz funcionar como <script src="...">
        // em qualquer site, sem o site precisar resolver imports/chunks.
        inlineDynamicImports: true,
      },
    },
    minify: 'oxc',
  },
});
