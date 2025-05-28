import { DjangoSandbox } from './django-sandbox.js';
import type { DjangoSandboxConfig } from './types/index.js';

// Auto-initialization logic for browser usage
(function() {
  const currentScript = document.currentScript as HTMLScriptElement | null;
  if (!currentScript) return;

  const config: DjangoSandboxConfig = {
    packages: currentScript.dataset.packages ? 
      currentScript.dataset.packages.split(',').map(p => p.trim()).filter(Boolean) : [],
    autoInit: currentScript.dataset.autoInit !== 'false'
  };

  const sandbox = new DjangoSandbox(config);
  
  (window as any).DjangoSandbox = sandbox;

  if (config.autoInit) {
    const initWhenReady = () => {
      sandbox.init().catch(error => {
        console.error('Django sandbox initialization failed:', error);
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initWhenReady);
    } else {
      setTimeout(initWhenReady, 0);
    }
  }
})();