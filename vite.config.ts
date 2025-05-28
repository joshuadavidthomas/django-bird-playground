import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['iife'],
      fileName: () => 'index.js',
      name: 'DjangoSandbox'
    },
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: false
  },
  plugins: [
    {
      name: 'silence-pyodide-warnings',
      configResolved(config) {
        const originalWarn = config.logger.warn;
        config.logger.warn = (msg, options) => {
          if (msg.includes('pyodide.mjs') && msg.includes('externalized for browser compatibility')) {
            return;
          }
          originalWarn(msg, options);
        };
      }
    }
  ],
  worker: {
    format: 'es'
  }
});