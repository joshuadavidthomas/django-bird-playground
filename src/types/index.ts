export interface DjangoSandboxConfig {
  packages?: string[];
  autoInit?: boolean;
}

export interface LoadingEvent {
  step: 'pyodide' | 'packages' | 'django' | 'filesystem' | 'ready';
  message: string;
}

export interface ReadyEvent {
  message: string;
}

export interface ErrorEvent {
  error: Error;
  message: string;
}

export interface TemplateRenderResult {
  success: boolean;
  result: string | null;
  error: string | null;
  traceback?: string;
}

// Worker-related types are now handled internally in django-sandbox.ts