# Migration Strategy - Current Implementation vs Target API

## **Current Implementation Analysis**

### **Architecture Overview**
- **Pattern:** Instance-based (`createDjango()` returns instances)
- **Usage:** Manual worker management, individual package installation
- **API:** Programmatic only (no declarative data attributes)
- **Target:** Playground/interactive use case with template save/load

### **Current File Structure**
```
src/
├── django.ts        # Main implementation (instance-based)
├── index.ts         # Simple re-export  
├── types.ts         # Type definitions and constants
└── worker/
    ├── pyodide.worker.ts    # Pyodide worker implementation
    └── vite-env.d.ts        # TypeScript environment
```

## **Target API Requirements**

### **Architecture Changes**
- **Pattern:** Singleton static class (`DjangoPlayground.init()`)
- **Usage:** Auto DOM scanning, batch package installation
- **API:** Declarative data attributes + programmatic
- **Target:** Documentation/education with multiple examples per page

## **Migration Assessment**

### **✅ KEEP (Strong Foundation)**

#### **1. Worker Communication Pattern** 
**Current (django.ts:108-137):**
```typescript
const sendMessage = async (state: DjangoState, type: WorkerMessageType, data?: any): Promise<any> => {
  // Message ID, timeout handling, promise-based communication
}
```
**Status:** ✅ **Perfect** - This is exactly what we need, just adapt for singleton pattern

#### **2. Progress Reporting System**
**Current (worker/pyodide.worker.ts:109-136):**
```typescript
self.postMessage({
  progress: { step: LOADING_STEPS.PYODIDE, message: "Loading Pyodide runtime..." }
});
```
**Status:** ✅ **Perfect** - Maps directly to target `onProgress` callbacks

#### **3. Django Setup Python Code**
**Current (worker/pyodide.worker.ts:7-86):**
```python
def setup_django():
    # Django configuration and setup
def render_template(template_string, context_dict=None):
    # Template rendering logic
```
**Status:** ✅ **Perfect** - Core Django functionality is exactly what we need

#### **4. Package Installation Logic**
**Current (worker/pyodide.worker.ts:138-149):**
```typescript
async function installPackage(packageName: string): Promise<void> {
  const micropip = pyodide.pyimport("micropip");
  // Package installation with duplicate checking
}
```
**Status:** ✅ **Good** - Just needs batching wrapper

#### **5. Type Definitions Foundation**
**Current (types.ts):**
```typescript
export const WORKER_MESSAGE_TYPES = {
  RENDER_TEMPLATE: "renderTemplate",
  INSTALL_PACKAGE: "installPackage",
  // ...
}
```
**Status:** ✅ **Reusable** - Good foundation, needs extension

### **🔄 REFACTOR (Major Changes)**

#### **1. Instance-Based → Singleton Pattern**
**Current:**
```typescript
const createDjango = (config?: DjangoConfig): DjangoInstance => {
  const state = createInitialState(config);
  return { /* instance methods */ };
};
```

**Target:**
```typescript
class DjangoPlayground {
  private static state: DjangoState;
  static async init(options?: InitOptions): Promise<void>
  static async render(template: string, context?: any): Promise<string>
}
```
**Change Required:** ⚠️ **Major architectural refactor**

#### **2. Manual Initialization → Auto DOM Scanning**
**Current:** User creates instance and calls `init()` manually
```typescript
const django = createDjango({ packages: ['django-bird'] });
await django.init();
```

**Target:** Single init scans page for data attributes
```typescript
// Automatically finds all [data-django-template] elements
await DjangoPlayground.init(); 
```
**Change Required:** ⚠️ **New DOM scanning functionality needed**

#### **3. Individual Package Install → Batch Installation**
**Current:** Packages installed one by one on demand
```typescript
await django.installPackage('django-bird');
await django.installPackage('django-crispy-forms');
```

**Target:** Collect all packages upfront, install in batch
```typescript
// Scans page for all data-django-packages attributes
// Installs unique packages: ['django-bird', 'django-crispy-forms']
await DjangoPlayground.init();
```
**Change Required:** ⚠️ **Page scanning + batch installation logic**

#### **4. No Framework Integration → Add Hooks/Composables**
**Current:** Pure JavaScript API only

**Target:** Framework-specific integrations
```typescript
// React hook
const { html, loading, error } = useDjangoTemplate(template, context);
// Vue composable  
const { html, loading, error } = useDjangoTemplate(template, context);
```
**Change Required:** ⚠️ **New framework integration modules**

### **❌ JETTISON (Remove/Replace)**

#### **1. Template Save/Load Functionality**
**Current (django.ts:211-242):**
```typescript
const saveTemplate = async (state: DjangoState, name: string, content: string): Promise<void>
const loadTemplate = async (state: DjangoState, name: string): Promise<string>  
const listTemplates = async (state: DjangoState): Promise<string[]>
```
**Reason:** ❌ **Not needed for documentation use case** - Pivot to in-memory template caching instead

#### **2. `autoInit` Config Option** 
**Current (django.ts:14):**
```typescript
interface DjangoConfig {
  autoInit?: boolean;
}
```
**Reason:** ❌ **Confusing** - Replace with `autoRender` option for data attributes

#### **3. Instance Creation Pattern**
**Current:** Multiple Django instances possible per page
**Reason:** ❌ **Memory inefficient** - Documentation needs shared Django instance

## **Migration Plan**

### **Phase 1: Core Architecture Migration**

#### **Step 1.1: Create New Singleton Class**
```typescript
// New: src/django-playground.ts
class DjangoPlayground {
  private static state: DjangoState = {
    status: 'uninitialized',
    worker: null,
    packages: new Set(),
    templateCache: new Map(),
    elements: []
  };
  
  // Migrate worker communication from current django.ts
  private static async sendMessage(type: string, data: any): Promise<any>
  
  // New DOM scanning functionality
  private static discoverTemplateElements(): TemplateElement[]
  private static async renderDataAttributes(): Promise<void>
  
  // Public API
  static async init(options?: InitOptions): Promise<void>
  static async render(template: string, context?: any): Promise<string>
}
```

#### **Step 1.2: Migrate Worker Communication**
- **Copy** `sendMessage` function from `django.ts:108-137`
- **Adapt** for singleton pattern (remove `state` parameter)
- **Copy** `setupWorkerListeners` from `django.ts:57-96`

#### **Step 1.3: Add DOM Scanning**
```typescript
// New functionality
private static discoverTemplateElements(): TemplateElement[] {
  const elements = document.querySelectorAll('[data-django-template]');
  return Array.from(elements).map(el => ({
    element: el as HTMLElement,
    template: el.textContent?.trim() || '',
    context: JSON.parse(el.getAttribute('data-django-template') || '{}'),
    packages: JSON.parse(el.getAttribute('data-django-packages') || '[]')
  }));
}
```

### **Phase 2: Worker Enhancement**

#### **Step 2.1: Add Batch Package Installation**
**Extend worker (pyodide.worker.ts) with:**
```typescript
// Add to WORKER_MESSAGE_TYPES
INSTALL_PACKAGES: "installPackages"

// New worker function
async function installPackages(packageNames: string[]): Promise<void> {
  for (const packageName of packageNames) {
    await installPackage(packageName);
  }
}
```

#### **Step 2.2: Add Template Validation**
```typescript
// Add to worker
async function validateTemplate(templateString: string): Promise<ValidationResult> {
  try {
    pyodide.globals.set("template_str", templateString);
    pyodide.runPython("Template(template_str)"); // Just parse, don't render
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
```

### **Phase 3: Framework Integration**

#### **Step 3.1: React Hook**
```typescript
// New: src/integrations/react.ts
export function useDjangoTemplate(template: string, context?: any, options?: RenderOptions) {
  const [state, setState] = useState({ html: null, loading: true, error: null });
  
  useEffect(() => {
    // Wait for Django readiness, then render
    waitForReady()
      .then(() => DjangoPlayground.render(template, context, options))
      .then(html => setState({ html, loading: false, error: null }))
      .catch(error => setState({ html: null, loading: false, error }));
  }, [template, context, options?.packages]);
  
  return state;
}
```

## **File-by-File Migration Strategy**

### **Keep & Modify**

#### **src/types.ts** ✅ **Extend**
- **Keep:** All existing constants and types
- **Add:** New types for singleton API
```typescript
// Add to existing file
export interface InitOptions {
  packages?: string[];
  autoRender?: boolean;
  onProgress?: (step: string, percent: number) => void;
  onReady?: () => void;
  onError?: (error: DjangoError) => void;
}

export interface DjangoError extends Error {
  type: 'InitializationError' | 'TemplateError' | 'PackageError';
  context?: string;
  element?: HTMLElement;
}
```

#### **src/worker/pyodide.worker.ts** ✅ **Extend**
- **Keep:** All existing functionality
- **Add:** Batch operations
```typescript
// Add new message types
case WORKER_MESSAGE_TYPES.INSTALL_PACKAGES:
  await installPackages(data.packageNames);
  result = { success: true };
  break;

case WORKER_MESSAGE_TYPES.VALIDATE_TEMPLATE:
  result = await validateTemplate(data.template);
  break;
```

### **Create New**

#### **src/django-playground.ts** 🆕 **New Main Implementation**
- Singleton class with static methods
- DOM scanning functionality  
- Batch package installation
- Data attribute processing

#### **src/integrations/react.ts** 🆕 **Framework Integration**
- React hook implementation
- Proper lifecycle management

#### **src/integrations/vue.ts** 🆕 **Framework Integration**  
- Vue composable implementation
- Reactivity handling

### **Replace**

#### **src/index.ts** 🔄 **Update Exports**
**Current:**
```typescript
export { createDjango } from "./django";
export type { DjangoConfig, DjangoInstance } from "./django";
```

**New:**
```typescript
export { default } from "./django-playground";
export type { InitOptions, RenderOptions, DjangoError } from "./types";
export { useDjangoTemplate } from "./integrations/react";
```

#### **src/django.ts** ❌ **Remove**
- Replace with new singleton implementation
- Migrate core logic to `django-playground.ts`

## **Risk Assessment**

### **Low Risk** ✅
- **Worker communication** - Direct migration, well-tested pattern
- **Django setup** - Python code unchanged
- **Type definitions** - Mostly additive changes

### **Medium Risk** ⚠️
- **DOM scanning** - New functionality, needs testing across browsers
- **Package batching** - Need to handle installation failures gracefully
- **Framework hooks** - Proper dependency tracking and cleanup

### **High Risk** 🚨
- **Singleton pattern** - Major architectural change affects everything
- **Auto-initialization** - Must not break if called multiple times
- **Memory management** - Shared instance needs careful cleanup

## **Testing Strategy**

### **Migration Testing**
1. **Create adapter layer** - Temporarily support both old and new APIs
2. **Parallel testing** - Run same functionality through both implementations  
3. **Performance testing** - Verify singleton approach is actually more efficient
4. **Framework testing** - Test React/Vue integrations in real applications

### **Backward Compatibility**
```typescript
// Temporary: Support both patterns during migration
export const createDjango = (config?: DjangoConfig) => {
  console.warn('createDjango is deprecated, use DjangoPlayground.init()');
  // Return adapter that uses singleton internally
};
```

## **Implementation Priority**

### **Week 1: Core Migration**
- Create `DjangoPlayground` singleton class
- Migrate worker communication
- Add basic DOM scanning

### **Week 2: Enhancement**  
- Batch package installation
- Template caching
- Error handling improvements

### **Week 3: Framework Integration**
- React hook implementation
- Vue composable implementation
- Testing and refinement

### **Week 4: Polish & Docs**
- Performance optimization
- Documentation updates
- Migration guide for existing users

## **Success Criteria**

- ✅ Single `DjangoPlayground.init()` call handles entire page
- ✅ Multiple `[data-django-template]` elements render efficiently  
- ✅ Framework hooks work with proper lifecycle management
- ✅ Memory usage scales linearly with examples (not exponentially)
- ✅ Backward compatibility maintained during transition period

This migration leverages your solid foundation while pivoting to the documentation-focused API that users actually need.