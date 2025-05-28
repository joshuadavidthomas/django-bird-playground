import { defineConfig } from 'rolldown';

export default defineConfig([
  // Main bundle
  {
    input: 'src/index.ts',
    output: {
      format: 'iife',
      file: 'dist/index.js',
      name: 'DjangoSandbox',
      globals: {
        pyodide: 'pyodide'
      },
      minify: true,
    },
    external: ['pyodide'],
    treeshake: {
      preset: 'smallest'
    }
  },
  // Worker bundle - needs pyodide bundled
  {
    input: 'src/worker/pyodide.worker.ts',
    output: {
      format: 'iife',
      file: 'dist/pyodide.worker.js',
      name: 'PyodideWorker',
      minify: true,
    },
    treeshake: {
      preset: 'smallest'
    },
    plugins: [
      {
        name: 'silence-pyodide-warnings',
        buildStart() {
          // Override console.warn to filter pyodide node module warnings
          // Pyodide has conditional imports for Node.js modules (node:fs, node:crypto, etc.)
          // that are only used in Node.js environments. In browser/worker contexts,
          // these imports are never executed but still trigger bundler warnings.
          // This plugin suppresses those warnings to keep build output clean.
          const originalWarn = console.warn;
          console.warn = (...args) => {
            const message = args.join(' ');
            if (
              message.includes('Could not resolve \'node:') &&
              message.includes('pyodide.mjs')
            ) {
              return; // Suppress pyodide node module warnings
            }
            originalWarn.apply(console, args);
          };
        }
      }
    ]
  },
]);