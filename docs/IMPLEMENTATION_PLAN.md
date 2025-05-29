# Django Playground - Implementation Plan

## **Core Architecture Overview**

Based on the final API design, this implementation plan outlines how to build Django Playground as a client-side Django template rendering system for documentation and education.

### **Key Strategic Decisions**

1. **Singleton Pattern** - One Django instance per page, shared across all examples
2. **Upfront Package Collection** - Scan page for all needed packages, install once
3. **Data Attributes as Configuration** - Declarative markup processed during init
4. **Extend Existing Worker** - Build on current Pyodide worker foundation

## **1. Core Architecture - Singleton Pattern**

```typescript
interface DjangoState {
  status: 'uninitialized' | 'initializing' | 'ready' | 'error';
  worker: Worker | null;
  packages: Set<string>;
  templateCache: Map<string, { html: string; timestamp: number }>;
  elements: TemplateElement[];
  stats: PerformanceStats;
  options?: InitOptions;
}

class DjangoPlayground {
  // Singleton - one Django instance per page
  private static state: DjangoState = {
    status: 'uninitialized',
    worker: null,
    packages: new Set(),
    templateCache: new Map(),
    elements: [],
    stats: createInitialStats()
  };
  
  // Three main entry points matching API
  static async init(options?: InitOptions): Promise<void>
  static async render(template: string, context?: any, options?: RenderOptions): Promise<string>  
  static async createPlayground(options: PlaygroundOptions): Promise<PlaygroundInstance>
  
  // Utility methods
  static isReady(): boolean
  static hasError(): boolean
  static cleanup(): void
  static getStats(): PerformanceStats
}
```

**Key Decision:** Static class (not instances) because we want one Django per page, shared across all examples for memory efficiency.

## **2. Package Collection Strategy**

```typescript
// Collect packages from multiple sources
async function collectAllPackages(options?: InitOptions): Promise<string[]> {
  const sources = [
    options?.packages || [],                    // From init() options
    extractPackagesFromDataAttributes(),        // From DOM scan
    // Future: from render() calls, playground widgets
  ];
  
  return [...new Set(sources.flat())];          // Deduplicate
}

function extractPackagesFromDataAttributes(): string[] {
  const elements = document.querySelectorAll('[data-django-template]');
  return Array.from(elements)
    .map(el => {
      const packagesAttr = el.getAttribute('data-django-packages');
      return packagesAttr ? JSON.parse(packagesAttr) : [];
    })
    .flat();
}
```

**Key Decision:** Scan page upfront, install all packages once, share Django instance across all examples.

**Benefits:**
- Predictable performance - one initialization phase
- Memory efficient - single Django instance
- Simple for documentation authors

**Trade-offs:**
- Installs packages even for examples that might not render (if lazy-loaded)
- One bad package installation can break everything

## **3. Init() Flow**

```typescript
async function init(options?: InitOptions): Promise<void> {
  // Prevent double initialization
  if (state.status !== 'uninitialized') {
    console.warn('Django Playground already initialized');
    return;
  }
  
  state.status = 'initializing';
  state.options = options;
  
  try {
    // 1. Collect all packages needed on page
    options?.onProgress?.('scanning', 10);
    const packages = await collectAllPackages(options);
    state.packages = new Set(packages);
    
    // 2. Start worker and install packages
    options?.onProgress?.('worker', 20);
    state.worker = new Worker('./pyodide.worker.js');
    setupWorkerListeners();
    
    options?.onProgress?.('packages', 40);
    await installPackages(packages);
    
    // 3. If autoRender enabled, process data attributes
    if (options?.autoRender !== false) {
      options?.onProgress?.('rendering', 70);
      await renderDataAttributes();
    }
    
    options?.onProgress?.('complete', 100);
    state.status = 'ready';
    options?.onReady?.();
    
  } catch (error) {
    state.status = 'error';
    const djangoError = createDjangoError('InitializationError', error.message);
    options?.onError?.(djangoError);
    throw djangoError;
  }
}
```

**Key Decision:** Do all the heavy lifting upfront in init() - package installation, DOM scanning, initial rendering.

## **4. Data Attribute Processing**

```typescript
interface TemplateElement {
  element: HTMLElement;
  template: string;
  context: Record<string, any>;
  packages: string[];
  loading?: string;
  errorFallback?: string;
}

async function renderDataAttributes(): Promise<void> {
  const elements = discoverTemplateElements();
  state.elements = elements;
  
  // Show loading states first
  elements.forEach(showLoadingState);
  
  // Render all templates (can be parallel since Django is shared)
  const renderPromises = elements.map(renderElement);
  const results = await Promise.allSettled(renderPromises);
  
  // Handle any rendering failures gracefully
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      handleElementError(elements[index], result.reason);
    }
  });
}

function discoverTemplateElements(): TemplateElement[] {
  const nodeList = document.querySelectorAll('[data-django-template]');
  return Array.from(nodeList).map(el => ({
    element: el as HTMLElement,
    template: extractTemplateContent(el),
    context: JSON.parse(el.getAttribute('data-django-template') || '{}'),
    packages: JSON.parse(el.getAttribute('data-django-packages') || '[]'),
    loading: el.getAttribute('data-django-loading'),
    errorFallback: el.getAttribute('data-django-error-fallback')
  }));
}

function extractTemplateContent(element: HTMLElement): string {
  // Get the template content, preserving whitespace and formatting
  return element.textContent?.trim() || '';
}

async function renderElement(templateElement: TemplateElement): Promise<void> {
  try {
    const html = await sendToWorker('renderTemplate', {
      template: templateElement.template,
      context: templateElement.context
    });
    
    templateElement.element.innerHTML = html;
    trackPerformance('template_render', performance.now());
    
  } catch (error) {
    throw createDjangoError('TemplateError', error.message, templateElement.element);
  }
}

function showLoadingState(templateElement: TemplateElement): void {
  const loadingMessage = templateElement.loading || 'Rendering Django template...';
  templateElement.element.innerHTML = `<div class="django-loading">${loadingMessage}</div>`;
}
```

**Key Decision:** Treat data attributes as declarative configuration that gets processed during init(). This allows for batch processing and consistent error handling.

## **5. Worker Communication Enhancement**

```typescript
// Extend existing worker interface
interface WorkerInterface {
  // Existing methods
  renderTemplate(template: string, context: any): Promise<string>;
  
  // New batch operations
  installPackages(packages: string[]): Promise<void>;
  renderBatch(templates: TemplateRequest[]): Promise<string[]>;
  validateTemplate(template: string): Promise<ValidationResult>;
  getStats(): Promise<PerformanceStats>;
}

interface TemplateRequest {
  template: string;
  context: Record<string, any>;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  context?: string;
}

// Enhanced worker communication
const messageHandlers = new Map<number, {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}>();

let messageId = 0;

async function sendToWorker(type: string, data: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = ++messageId;
    const timeout = setTimeout(() => {
      messageHandlers.delete(id);
      reject(new Error(`Worker message timeout: ${type}`));
    }, 10000);
    
    messageHandlers.set(id, { resolve, reject, timeout });
    state.worker!.postMessage({ id, type, data });
  });
}

function setupWorkerListeners(): void {
  state.worker!.onmessage = (event) => {
    const { id, result, error, progress } = event.data;
    
    // Handle progress updates
    if (progress) {
      state.options?.onProgress?.(progress.step, progress.percent);
      return;
    }
    
    // Handle message responses
    if (id && messageHandlers.has(id)) {
      const { resolve, reject, timeout } = messageHandlers.get(id)!;
      messageHandlers.delete(id);
      clearTimeout(timeout);
      
      if (error) {
        reject(new Error(error));
      } else {
        resolve(result);
      }
    }
  };
  
  state.worker!.onerror = (error) => {
    const djangoError = createDjangoError('InitializationError', `Worker error: ${error.message}`);
    state.options?.onError?.(djangoError);
  };
}
```

**Key Decision:** Extend existing worker with batch operations and better error handling, keep single worker for shared state.

## **6. Framework Integration Pattern**

### **React Hook Implementation**

```typescript
function useDjangoTemplate(
  template: string, 
  context?: Record<string, any>, 
  options?: { packages?: string[]; timeout?: number }
) {
  const [state, setState] = useState<{
    html: string | null;
    loading: boolean;
    error: DjangoError | null;
  }>({ html: null, loading: true, error: null });
  
  const optionsRef = useRef(options);
  optionsRef.current = options;
  
  useEffect(() => {
    let cancelled = false;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    // Wait for Django to be ready, then render
    waitForReady()
      .then(() => {
        if (cancelled) return;
        return DjangoPlayground.render(template, context, optionsRef.current);
      })
      .then(html => {
        if (!cancelled) {
          setState({ html, loading: false, error: null });
        }
      })
      .catch(error => {
        if (!cancelled) {
          setState({ html: null, loading: false, error });
        }
      });
    
    return () => { 
      cancelled = true; 
    };
  }, [template, JSON.stringify(context), JSON.stringify(options?.packages)]); // Proper dependencies
  
  return state;
}

// Helper for waiting on Django readiness
async function waitForReady(): Promise<void> {
  if (DjangoPlayground.isReady()) return;
  
  return new Promise((resolve, reject) => {
    const maxWait = 30000; // 30 second timeout
    const startTime = Date.now();
    
    const check = () => {
      if (DjangoPlayground.isReady()) {
        resolve();
      } else if (DjangoPlayground.hasError()) {
        reject(new Error('Django initialization failed'));
      } else if (Date.now() - startTime > maxWait) {
        reject(new Error('Django initialization timeout'));
      } else {
        setTimeout(check, 100);
      }
    };
    
    check();
  });
}
```

### **Vue Composable Implementation**

```typescript
function useDjangoTemplate(
  template: Ref<string>,
  context?: Ref<Record<string, any>>,
  options?: { packages?: string[]; timeout?: number }
) {
  const html = ref<string | null>(null);
  const loading = ref(true);
  const error = ref<DjangoError | null>(null);
  
  const render = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      await waitForReady();
      const result = await DjangoPlayground.render(
        template.value, 
        context?.value || {}, 
        options
      );
      html.value = result;
    } catch (err) {
      error.value = err as DjangoError;
    } finally {
      loading.value = false;
    }
  };
  
  // Watch for changes and re-render
  watchEffect(() => {
    render();
  });
  
  return { html: readonly(html), loading: readonly(loading), error: readonly(error) };
}
```

**Key Decision:** Framework hooks are thin wrappers around core API, with proper dependency tracking and lifecycle management.

## **7. Playground Widget Architecture**

```typescript
interface PlaygroundOptions {
  container: string | HTMLElement;
  defaultTemplate?: string;
  defaultContext?: Record<string, any>;
  packages?: string[];
  editable?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

interface PlaygroundInstance {
  setTemplate(template: string): void;
  setContext(context: Record<string, any>): void;
  render(): Promise<void>;
  destroy(): void;
}

class PlaygroundWidget implements PlaygroundInstance {
  private container: HTMLElement;
  private layout: PlaygroundLayout;
  private editors: {
    template?: CodeEditor;
    context?: JSONEditor;
  } = {};
  private preview: HTMLElement;
  private options: PlaygroundOptions;
  
  constructor(options: PlaygroundOptions) {
    this.options = options;
    this.container = typeof options.container === 'string' 
      ? document.querySelector(options.container)!
      : options.container;
    
    this.setupLayout();
    this.setupEditors();
    this.setupPreview();
    this.bindEvents();
    
    // Initial render
    if (options.defaultTemplate) {
      this.render();
    }
  }
  
  private setupLayout(): void {
    this.container.innerHTML = `
      <div class="django-playground">
        <div class="playground-editors">
          <div class="template-editor-container">
            <h3>Template</h3>
            <div class="template-editor"></div>
          </div>
          <div class="context-editor-container">
            <h3>Context (JSON)</h3>
            <div class="context-editor"></div>
          </div>
        </div>
        <div class="playground-preview">
          <h3>Preview</h3>
          <div class="preview-content"></div>
        </div>
      </div>
    `;
    
    this.preview = this.container.querySelector('.preview-content')!;
  }
  
  private setupEditors(): void {
    if (this.options.editable !== false) {
      // Setup code editor for templates (could use CodeMirror, Monaco, etc.)
      this.editors.template = new CodeEditor({
        container: this.container.querySelector('.template-editor')!,
        value: this.options.defaultTemplate || '',
        language: 'django',
        onChange: () => this.onTemplateChange()
      });
      
      // Setup JSON editor for context
      this.editors.context = new JSONEditor({
        container: this.container.querySelector('.context-editor')!,
        value: this.options.defaultContext || {},
        onChange: () => this.onContextChange()
      });
    }
  }
  
  private async onTemplateChange(): Promise<void> {
    // Debounce rapid changes
    clearTimeout(this.renderTimeout);
    this.renderTimeout = setTimeout(() => this.render(), 500);
  }
  
  private async onContextChange(): Promise<void> {
    clearTimeout(this.renderTimeout);
    this.renderTimeout = setTimeout(() => this.render(), 500);
  }
  
  private renderTimeout?: NodeJS.Timeout;
  
  async render(): Promise<void> {
    try {
      const template = this.getTemplate();
      const context = this.getContext();
      
      // Validate first (fast feedback)
      const validation = await DjangoPlayground.validateTemplate(template);
      if (!validation.valid) {
        this.showError(validation.error!);
        return;
      }
      
      // Render (slower)
      this.showLoading();
      const html = await DjangoPlayground.render(template, context, {
        packages: this.options.packages
      });
      
      this.preview.innerHTML = html;
      this.clearError();
      
    } catch (error) {
      this.showError(error.message);
    }
  }
  
  getTemplate(): string {
    return this.editors.template?.getValue() || this.options.defaultTemplate || '';
  }
  
  getContext(): Record<string, any> {
    return this.editors.context?.getValue() || this.options.defaultContext || {};
  }
  
  setTemplate(template: string): void {
    if (this.editors.template) {
      this.editors.template.setValue(template);
    }
    this.render();
  }
  
  setContext(context: Record<string, any>): void {
    if (this.editors.context) {
      this.editors.context.setValue(context);
    }
    this.render();
  }
  
  private showLoading(): void {
    this.preview.innerHTML = '<div class="loading">Rendering...</div>';
  }
  
  private showError(message: string): void {
    this.preview.innerHTML = `<div class="error">Error: ${message}</div>`;
  }
  
  private clearError(): void {
    // Error cleared by successful render
  }
  
  destroy(): void {
    this.editors.template?.destroy();
    this.editors.context?.destroy();
    this.container.innerHTML = '';
  }
}
```

**Key Decision:** Playground is separate component built on top of core API, with real-time validation and preview.

## **8. Error Handling Strategy**

```typescript
interface DjangoError extends Error {
  type: 'InitializationError' | 'TemplateError' | 'PackageError' | 'TimeoutError';
  context?: string;
  element?: HTMLElement; // For data attribute errors
}

function createDjangoError(
  type: DjangoError['type'], 
  message: string, 
  element?: HTMLElement,
  context?: string
): DjangoError {
  const error = new Error(message) as DjangoError;
  error.type = type;
  error.element = element;
  error.context = context;
  return error;
}

function handleGlobalError(error: DjangoError, element?: HTMLElement): void {
  // Log for debugging
  console.error(`Django ${error.type}:`, error);
  
  // Update element if provided
  if (element) {
    const fallback = element.getAttribute('data-django-error-fallback');
    element.innerHTML = fallback || `
      <div class="django-error">
        <strong>Template Error:</strong> ${error.message}
        ${error.context ? `<pre>${error.context}</pre>` : ''}
      </div>
    `;
  }
  
  // Call user error handler
  state.options?.onError?.(error, element);
  
  // Track error for stats
  state.stats.errorCount++;
  state.stats.lastError = error.message;
}

function handleElementError(templateElement: TemplateElement, error: Error): void {
  const djangoError = createDjangoError(
    'TemplateError', 
    error.message, 
    templateElement.element
  );
  handleGlobalError(djangoError, templateElement.element);
}
```

**Key Decision:** Graceful error handling that doesn't break the page - failed templates show error messages, other templates still work.

## **9. Memory Management Plan**

```typescript
interface MemoryManager {
  // Template caching with LRU eviction
  templateCache: Map<string, CacheEntry>;
  maxCacheSize: number;
  
  // Performance tracking
  stats: PerformanceStats;
}

interface CacheEntry {
  html: string;
  timestamp: number;
  accessCount: number;
}

interface PerformanceStats {
  initializationTime: number;
  packagesInstalled: string[];
  templatesRendered: number;
  templatesCached: number;
  averageRenderTime: number;
  memoryUsage: number;
  errorCount: number;
  lastError?: string;
}

function cacheTemplate(template: string, context: any, html: string): void {
  const key = createCacheKey(template, context);
  
  // Evict old entries if cache is full
  if (state.templateCache.size >= state.maxCacheSize) {
    evictLeastRecentlyUsed();
  }
  
  state.templateCache.set(key, {
    html,
    timestamp: Date.now(),
    accessCount: 1
  });
}

function getCachedTemplate(template: string, context: any): string | null {
  const key = createCacheKey(template, context);
  const entry = state.templateCache.get(key);
  
  if (entry) {
    entry.accessCount++;
    entry.timestamp = Date.now();
    return entry.html;
  }
  
  return null;
}

function createCacheKey(template: string, context: any): string {
  return `${template}:${JSON.stringify(context)}`;
}

function evictLeastRecentlyUsed(): void {
  let oldestKey = '';
  let oldestTime = Date.now();
  
  for (const [key, entry] of state.templateCache) {
    if (entry.timestamp < oldestTime) {
      oldestTime = entry.timestamp;
      oldestKey = key;
    }
  }
  
  if (oldestKey) {
    state.templateCache.delete(oldestKey);
  }
}

function cleanupForSPA(): void {
  // Stop worker
  if (state.worker) {
    state.worker.terminate();
    state.worker = null;
  }
  
  // Clear caches
  state.templateCache.clear();
  
  // Clear message handlers
  messageHandlers.clear();
  
  // Reset state
  state.status = 'uninitialized';
  state.packages.clear();
  state.elements = [];
  state.options = undefined;
}

function getMemoryStats(): PerformanceStats {
  return {
    ...state.stats,
    templatesRendered: state.stats.templatesRendered,
    templatesCached: state.templateCache.size,
    memoryUsage: estimateMemoryUsage(),
    packagesInstalled: Array.from(state.packages)
  };
}

function estimateMemoryUsage(): number {
  // Rough estimate based on cache size and worker memory
  const cacheSize = Array.from(state.templateCache.values())
    .reduce((total, entry) => total + entry.html.length, 0);
  
  const baseWorkerMemory = 100 * 1024 * 1024; // ~100MB for Django + Pyodide
  const cacheMemory = cacheSize * 2; // Rough estimate
  
  return baseWorkerMemory + cacheMemory;
}
```

**Key Decision:** Shared Django instance for efficiency, but proper cleanup APIs for SPA usage. LRU cache for templates with configurable limits.

## **10. Performance Monitoring**

```typescript
function trackPerformance(operation: string, startTime: number): void {
  const duration = performance.now() - startTime;
  
  state.stats.operations = state.stats.operations || [];
  state.stats.operations.push({ 
    operation, 
    duration, 
    timestamp: Date.now() 
  });
  
  // Update averages
  if (operation === 'template_render') {
    const renderOps = state.stats.operations.filter(op => op.operation === 'template_render');
    state.stats.averageRenderTime = renderOps.reduce((sum, op) => sum + op.duration, 0) / renderOps.length;
    state.stats.templatesRendered = renderOps.length;
  }
  
  // Optional: Send to analytics
  if (state.options?.enableAnalytics) {
    sendAnalytics('django_playground_performance', { operation, duration });
  }
  
  // Performance budget warnings
  checkPerformanceBudgets(operation, duration);
}

function checkPerformanceBudgets(operation: string, duration: number): void {
  const budget = state.options?.performanceBudget;
  if (!budget) return;
  
  const checks = [
    { metric: 'initTime', value: duration, budget: budget.maxInitTime, operation: 'init' },
    { metric: 'renderTime', value: duration, budget: budget.maxRenderTime, operation: 'template_render' }
  ];
  
  for (const check of checks) {
    if (operation === check.operation && check.budget && duration > check.budget) {
      state.options?.onBudgetExceeded?.(check.metric, duration, check.budget);
    }
  }
}

function createInitialStats(): PerformanceStats {
  return {
    initializationTime: 0,
    packagesInstalled: [],
    templatesRendered: 0,
    templatesCached: 0,
    averageRenderTime: 0,
    memoryUsage: 0,
    errorCount: 0,
    operations: []
  };
}
```

**Key Decision:** Built-in performance tracking with optional analytics integration and performance budget warnings.

## **Implementation Phases**

### **Phase 1 (Core - MVP)**
**Goal:** Basic working system with data attributes

1. **Core DjangoPlayground singleton class**
   - Static methods for init(), render(), isReady(), cleanup()
   - Basic state management
   - Worker communication setup

2. **Data attribute discovery and processing**
   - DOM scanning for `[data-django-template]`
   - Package extraction from `data-django-packages`
   - Template content extraction and context parsing

3. **Package collection and installation**
   - Collect unique packages from all sources
   - Batch package installation via worker
   - Error handling for package failures

4. **Basic error handling**
   - DjangoError types and creation
   - Element-level error display
   - Global error handler

**Deliverable:** Documentation authors can add `data-django-template` attributes and call `DjangoPlayground.init()` to get live Django examples.

### **Phase 2 (API Completion)**
**Goal:** Full API surface with framework integration

5. **Framework hooks (React/Vue/Astro)**
   - React useDjangoTemplate hook with proper lifecycle
   - Vue composable with reactivity
   - Astro component patterns

6. **Memory management and cleanup**
   - Template caching with LRU eviction
   - SPA cleanup methods
   - Memory usage estimation

7. **Performance monitoring**
   - Performance stats collection
   - Budget warnings
   - Analytics integration

8. **Advanced error handling**
   - Detailed error context
   - Fallback content support
   - Error recovery mechanisms

**Deliverable:** Full API compatibility with framework integrations and production-ready memory management.

### **Phase 3 (Advanced Features)**
**Goal:** Interactive playground and optimization

9. **Playground widget with editors**
   - Interactive template and context editors
   - Real-time preview updates
   - Share URLs and code export

10. **Template validation**
    - Syntax validation without full rendering
    - Fast feedback for playground editors
    - Error highlighting and suggestions

11. **Batch rendering optimizations**
    - Render multiple templates efficiently
    - Parallel processing where possible
    - Smart caching strategies

12. **Analytics integration**
    - Usage metrics collection
    - Performance monitoring
    - Error tracking and reporting

**Deliverable:** Full-featured playground system suitable for education platforms and interactive documentation.

## **Key Architectural Benefits**

1. **Memory Efficient** - Single Django instance shared across all examples
2. **Predictable Performance** - Upfront package installation, then fast renders
3. **Simple for Authors** - Just add data attributes and call init()
4. **Framework Agnostic** - Works with static HTML, React, Vue, Astro, etc.
5. **Graceful Degradation** - Failed templates don't break the page
6. **Production Ready** - Proper cleanup, monitoring, and error handling

## **Leverages Existing Foundation**

- **Current worker architecture** - extend with batch operations
- **Existing Django setup** - same initialization pattern
- **Package installation mechanism** - same approach, just batched
- **Template rendering core** - same function, coordinated calls

This implementation plan builds incrementally on your existing codebase while creating a production-ready system for documentation and education use cases.