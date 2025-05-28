import type {
  DjangoSandboxConfig,
  LoadingEvent,
  ReadyEvent,
  ErrorEvent,
  TemplateRenderResult
} from './types/index.js';

interface WorkerMessage {
  id: number;
  type: 'init' | 'renderTemplate' | 'runPython' | 'installPackage';
  data?: any;
}

interface WorkerResponse {
  id: number;
  result?: any;
  error?: string;
  progress?: {
    step: string;
    message: string;
  };
}

export class DjangoSandbox {
  private config: Required<DjangoSandboxConfig>;
  private worker: Worker | null = null;
  private ready = false;
  private loading = false;
  private error: Error | null = null;
  private eventTarget = new EventTarget();
  private messageId = 0;
  private pendingMessages = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();

  constructor(config: DjangoSandboxConfig = {}) {
    this.config = {
      packages: [],
      autoInit: true,
      ...config
    };
  }

  async init(): Promise<void> {
    if (this.loading || this.ready) {
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      // Create worker - look for pyodide.worker.js in the same directory as the main script
      const scripts = document.getElementsByTagName('script');
      let scriptSrc = '';
      for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        if (script?.src && script.src.includes('index.js')) {
          scriptSrc = script.src;
          break;
        }
      }
      
      const workerUrl = scriptSrc.replace('index.js', 'pyodide.worker.js');
      this.worker = new Worker(workerUrl);

      // Set up worker message handling
      this.setupWorkerListeners();

      // Initialize worker (this will trigger all setup steps)
      await this.sendMessage('init', {});

      this.ready = true;
      this.loading = false;
      this.emit('ready', { message: 'Django sandbox ready!' });

    } catch (error) {
      this.error = error as Error;
      this.loading = false;
      this.emit('error', { error: this.error, message: this.error.message });
      throw error;
    }
  }

  private setupWorkerListeners(): void {
    if (!this.worker) return;

    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, result, error, progress } = event.data;

      // Handle progress updates
      if (progress) {
        this.emit('loading', { 
          step: progress.step as any, 
          message: progress.message 
        });
        return;
      }

      // Handle message responses
      if (id !== undefined && this.pendingMessages.has(id)) {
        const { resolve, reject } = this.pendingMessages.get(id)!;
        this.pendingMessages.delete(id);

        if (error) {
          reject(new Error(error));
        } else {
          resolve(result);
        }
      }
    };

    this.worker.onerror = (error) => {
      this.error = new Error(`Worker error: ${error.message}`);
      this.loading = false;
      this.emit('error', { error: this.error, message: this.error.message });
    };
  }

  private async sendMessage(type: WorkerMessage['type'], data?: any): Promise<any> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    const id = ++this.messageId;
    
    return new Promise((resolve, reject) => {
      this.pendingMessages.set(id, { resolve, reject });
      
      this.worker!.postMessage({ id, type, data } as WorkerMessage);
      
      // Add timeout to prevent hanging
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id);
          reject(new Error(`Worker message timeout: ${type}`));
        }
      }, 30000); // 30 second timeout
    });
  }

  async renderTemplate(templateString: string, context: Record<string, any> = {}): Promise<string> {
    if (!this.ready) {
      throw new Error('Django sandbox not ready. Call init() first or wait for ready event.');
    }

    try {
      const result = await this.sendMessage('renderTemplate', {
        template: templateString,
        context
      });

      if (result.get('success')) {
        return result.get('result');
      } else {
        throw new Error(result.get('error'));
      }
    } catch (error) {
      throw new Error(`Template rendering failed: ${(error as Error).message}`);
    }
  }

  async runPython(code: string): Promise<any> {
    if (!this.ready) {
      throw new Error('Django sandbox not ready. Call init() first or wait for ready event.');
    }

    return this.sendMessage('runPython', { code });
  }

  async installPackage(packageName: string): Promise<void> {
    if (!this.ready) {
      throw new Error('Django sandbox not ready. Call init() first or wait for ready event.');
    }

    await this.sendMessage('installPackage', { packageName });
  }

  // New methods for template persistence
  async saveTemplate(name: string, content: string): Promise<void> {
    const result = await this.runPython(`save_template('${name}', '''${content}''')`);
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  async loadTemplate(name: string): Promise<string> {
    const result = await this.runPython(`load_template('${name}')`);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.content;
  }

  async listTemplates(): Promise<string[]> {
    const result = await this.runPython(`list_templates()`);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.templates;
  }

  isReady(): boolean {
    return this.ready;
  }

  getPackages(): string[] {
    return this.config.packages;
  }

  private emit(eventType: string, detail: LoadingEvent | ReadyEvent | ErrorEvent): void {
    const event = new CustomEvent(eventType, { detail });
    this.eventTarget.dispatchEvent(event);
    
    window.dispatchEvent(new CustomEvent(`django-sandbox:${eventType}`, { detail }));
  }

  addEventListener(type: string, listener: EventListener, options?: AddEventListenerOptions): void {
    this.eventTarget.addEventListener(type, listener, options);
  }

  removeEventListener(type: string, listener: EventListener, options?: EventListenerOptions): void {
    this.eventTarget.removeEventListener(type, listener, options);
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingMessages.clear();
    this.ready = false;
    this.loading = false;
  }
}