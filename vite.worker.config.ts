import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/pyodide.worker.ts'),
      formats: ['iife'],
      fileName: () => 'pyodide.worker.js',
      name: 'PyodideWorker'
    },
    target: 'es2020',
    outDir: 'dist'
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
  ]
});