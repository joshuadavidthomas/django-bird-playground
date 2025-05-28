// pyodide.worker.ts - Web Worker for Django/Pyodide operations

// Import pyodide dynamically to get the version
import pyodidePackage from 'pyodide/package.json' with { type: 'json' };
const PYODIDE_VERSION = pyodidePackage.version;

declare global {
  var loadPyodide: any;
  var pyodide: any;
  function importScripts(...urls: string[]): void;
}

// Load pyodide script
importScripts(`https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`);

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

class PyodideWorkerManager {
  private pyodide: any = null;
  private ready = false;
  private initPromise: Promise<void> | null = null;
  private djangoFullSetup = false;

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      // Post progress updates
      this.postProgress('pyodide', 'Loading Pyodide runtime...');

      // Load pyodide with CDN indexURL for package loading
      this.pyodide = await loadPyodide({
        indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`
      });

      // Skip filesystem setup for faster initialization

      // Install packages
      this.postProgress('packages', 'Installing Python packages...');
      await this.installPackages();

      // Minimal Django setup - defer heavy config to first use
      this.postProgress('django', 'Basic Django setup...');
      await this.setupDjangoMinimal();

      this.ready = true;
      this.postProgress('ready', 'Django sandbox ready!');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Worker initialization failed: ${errorMessage}`);
    }
  }

  private async installPackages(): Promise<void> {
    // Load micropip and install Django directly - no checking
    await this.pyodide.loadPackage('micropip');
    
    await this.pyodide.runPythonAsync(`
      import micropip
      # Install Django with all dependencies in one go
      await micropip.install('django', deps=True)
      print("Django installation complete")
    `);
  }

  private async setupDjangoMinimal(): Promise<void> {
    // Minimal Django setup with proper template dirs for django-bird
    await this.pyodide.runPythonAsync(`
import os
from django.conf import settings
import django

# Create template directories
os.makedirs('/templates', exist_ok=True)

# Configure Django with template directories
if not settings.configured:
    settings.configure(
        SECRET_KEY='key',
        TEMPLATES=[{
            'BACKEND': 'django.template.backends.django.DjangoTemplates',
            'DIRS': ['/templates'],
            'APP_DIRS': True,
            'OPTIONS': {},
        }],
    )

django.setup()
print("Minimal Django setup complete!")
    `);
  }

  private async setupDjangoFull(): Promise<void> {
    if (this.djangoFullSetup) return;
    
    // Install Django and do full setup - only on first template render
    await this.pyodide.runPythonAsync(`
# Install Django with dependencies on first use
import micropip
await micropip.install('django', deps=True)
print("Django installed on demand!")

# Configure Django settings
from django.conf import settings
if not settings.configured:
    settings.configure(
        SECRET_KEY='key',
        TEMPLATES=[{
            'BACKEND': 'django.template.backends.django.DjangoTemplates',
            'DIRS': ['/templates'],
            'APP_DIRS': True,
            'OPTIONS': {},
        }],
    )

# Now setup Django
import django
django.setup()

# Import template system
from django.template import Template, Context
import traceback

def render_template(template_string, context_dict=None):
    """Render a Django template with the given context"""
    if context_dict is None:
        context_dict = {}
    
    try:
        template = Template(template_string)
        context = Context(context_dict)
        return {
            'success': True,
            'result': template.render(context),
            'error': None
        }
    except Exception as e:
        return {
            'success': False,
            'result': None,
            'error': str(e),
            'traceback': traceback.format_exc()
        }

def save_template(name, content):
    """Save a template to storage"""
    try:
        template_path = f'/templates/{name}.html'
        with open(template_path, 'w') as f:
            f.write(content)
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def load_template(name):
    """Load a template from storage"""
    try:
        template_path = f'/templates/{name}.html'
        with open(template_path, 'r') as f:
            content = f.read()
        return {'success': True, 'content': content}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def list_templates():
    """List all saved templates"""
    try:
        import os
        template_dir = '/templates'
        if os.path.exists(template_dir):
            files = [f[:-5] for f in os.listdir(template_dir) if f.endswith('.html')]
            return {'success': True, 'templates': files}
        return {'success': True, 'templates': []}
    except Exception as e:
        return {'success': False, 'error': str(e)}

# Make functions available globally
globals()['render_template'] = render_template
globals()['save_template'] = save_template
globals()['load_template'] = load_template
globals()['list_templates'] = list_templates

print("Full Django setup complete!")
    `);
    
    this.djangoFullSetup = true;
  }

  async renderTemplate(templateString: string, context: Record<string, any> = {}): Promise<any> {
    if (!this.ready) {
      throw new Error('Worker not ready. Call initialize() first.');
    }

    // Lazy load full Django setup on first template render
    if (!this.djangoFullSetup) {
      await this.setupDjangoFull();
    }

    this.pyodide.globals.set('template_str', templateString);
    this.pyodide.globals.set('context_dict', context);

    const result = this.pyodide.runPython('render_template(template_str, context_dict)');
    return result.toJs();
  }

  async runPython(code: string): Promise<any> {
    if (!this.ready) {
      throw new Error('Worker not ready. Call initialize() first.');
    }

    await this.pyodide.loadPackagesFromImports(code);
    const result = this.pyodide.runPython(code);
    return result;
  }

  async installPackage(packageName: string): Promise<void> {
    if (!this.ready) {
      throw new Error('Worker not ready. Call initialize() first.');
    }

    // Check if package is already installed
    const isInstalled = await this.pyodide.runPythonAsync(`
      try:
          __import__('${packageName.replace(/[^a-zA-Z0-9_]/g, '_')}')
          True
      except ImportError:
          False
    `);

    if (isInstalled) {
      console.log(`Package ${packageName} already installed, skipping`);
      return;
    }

    console.log(`Installing ${packageName}...`);
    const micropip = this.pyodide.pyimport('micropip');
    await micropip.install(packageName);
  }

  private postProgress(step: string, message: string): void {
    self.postMessage({
      progress: { step, message }
    } as WorkerResponse);
  }
}

// Initialize worker manager
const manager = new PyodideWorkerManager();

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, data } = event.data;

  try {
    let result: any;

    switch (type) {
      case 'init':
        await manager.initialize();
        result = { ready: true };
        break;

      case 'renderTemplate':
        result = await manager.renderTemplate(data.template, data.context);
        break;

      case 'runPython':
        result = await manager.runPython(data.code);
        break;

      case 'installPackage':
        await manager.installPackage(data.packageName);
        result = { success: true };
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    self.postMessage({ id, result } as WorkerResponse);

  } catch (error) {
    self.postMessage({ 
      id, 
      error: error instanceof Error ? error.message : String(error) 
    } as WorkerResponse);
  }
};

// Auto-initialize when worker starts
manager.initialize().catch(error => {
  self.postMessage({
    error: `Auto-initialization failed: ${error.message}`
  } as WorkerResponse);
});