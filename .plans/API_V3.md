# Django Playground v3 - Production-Ready Design

> **Client-side Django template rendering for documentation sites and interactive learning**

## Reality Check First

**What this is:** A tool for adding live Django template examples to documentation sites  
**What this costs:** ~10 second initial load, ~100MB RAM, modern browsers only  
**What this solves:** Static code examples → Interactive, editable Django templates  

**⚠️ Performance Requirements:**
- Initial load: 8-12 seconds (Pyodide + Django + packages)
- Memory usage: 80-150MB per page
- Network: 6-8MB download (cached after first visit)
- Browsers: Chrome 80+, Firefox 78+, Safari 14+, Edge 80+

## The Problem (With Examples)

**Before:** Static Django documentation
```html
<!-- Boring static example -->
<pre><code>
{% load django_bird %}
{% bird button variant="primary" %}Click me{% endbird %}
</code></pre>
<p>Output: &lt;button class="btn btn-primary"&gt;Click me&lt;/button&gt;</p>
```

**After:** Live, interactive examples
```html
<!-- Live example users can modify -->
<django-example template='{% load django_bird %}{% bird button variant="primary" %}Click me{% endbird %}' />
<!-- Renders actual button, users can change variant/text and see results -->
```

**Perfect for:**
- Package documentation (django-bird, django-crispy-forms, etc.)
- Django learning tutorials with hands-on examples
- Template syntax documentation
- Component library showcases

## Quick Start (Realistic)

### Self-Hosted Setup (Recommended)

**Step 1: Download and serve the files**
```bash
# Download from GitHub releases (when available)
wget https://github.com/your-org/django-playground/releases/latest/django-playground.js
# Serve with your documentation
```

**Step 2: Add to your documentation**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Django Templates Guide</title>
  <!-- Load the library -->
  <script src="./django-playground.js"></script>
</head>
<body>
  <!-- Performance warning for users -->
  <div class="loading-notice">
    <p>🚀 Initializing Django (this takes ~10 seconds)...</p>
    <progress id="django-progress"></progress>
  </div>

  <!-- Simple template example -->
  <div 
    data-django-template='{"name": "Alice", "age": 30}'
    data-django-loading="Setting up Django..."
    style="display: none;">
    <p>Hello {{ name }}! You are {{ age }} years old.</p>
  </div>

  <script>
    // Initialize with progress tracking
    DjangoPlayground.init({
      onProgress: (step, progress) => {
        document.getElementById('django-progress').value = progress;
      },
      onReady: () => {
        document.querySelector('.loading-notice').style.display = 'none';
        document.querySelector('[data-django-template]').style.display = 'block';
      },
      onError: (error) => {
        document.querySelector('.loading-notice').innerHTML = 
          `<p>❌ Failed to load Django: ${error.message}</p>`;
      }
    });
  </script>
</body>
</html>
```

**Result:** After 8-12 seconds, you see "Hello Alice! You are 30 years old." rendered by actual Django.

### CDN Setup (When Available)

```html
<!-- Future CDN option -->
<script src="https://cdn.jsdelivr.net/npm/django-playground@1.0.0/dist/django-playground.min.js"></script>
```

## API Reference

### Core Functions

#### `DjangoPlayground.init(options?): Promise<void>`
Initialize Django on the current page.

```typescript
interface InitOptions {
  packages?: string[];           // Django packages to install
  autoRender?: boolean;          // Auto-render data-django-template elements (default: true)
  sharedInstance?: boolean;      // Share Django instance across examples (default: true)
  timeout?: number;              // Initialization timeout in ms (default: 60000)
  onProgress?: (step: string, progress: number) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

// Basic usage
await DjangoPlayground.init();

// With packages and progress tracking
await DjangoPlayground.init({
  packages: ['django-bird'],
  onProgress: (step, progress) => {
    console.log(`${step}: ${progress}%`);
  }
});
```

#### `DjangoPlayground.render(template, context?, options?): Promise<string>`
Render a single template programmatically.

```typescript
interface RenderOptions {
  packages?: string[];
  timeout?: number;              // Render timeout in ms (default: 10000)
}

// Simple render
const html = await DjangoPlayground.render(
  'Hello {{ name }}!',
  { name: 'World' }
);

// With packages
const html = await DjangoPlayground.render(
  '{% load django_bird %}{% bird button %}Click{% endbird %}',
  {},
  { packages: ['django-bird'] }
);
```

#### `DjangoPlayground.createPlayground(options): Promise<PlaygroundInstance>`
Create an interactive playground widget.

```typescript
interface PlaygroundOptions {
  container: string | HTMLElement;
  defaultTemplate?: string;
  defaultContext?: Record<string, any>;
  packages?: string[];
  features?: {
    templateEditor?: boolean;      // Code editor for templates
    contextEditor?: boolean;       // JSON editor for context
    packageManager?: boolean;      // Install additional packages
    shareUrls?: boolean;           // Generate shareable URLs
    downloadCode?: boolean;        // Download template as file
  };
  theme?: 'light' | 'dark' | 'auto';
}

const playground = await DjangoPlayground.createPlayground({
  container: '#my-playground',
  defaultTemplate: '{% load django_bird %}{% bird button %}Hello{% endbird %}',
  packages: ['django-bird'],
  features: {
    templateEditor: true,
    contextEditor: true,
    shareUrls: true
  }
});
```

### Data Attributes (Declarative API)

#### Basic Template Rendering
```html
<!-- Simple template with context -->
<div data-django-template='{"user": {"name": "Alice", "role": "admin"}}'>
  <h2>Welcome {{ user.name }}!</h2>
  <p>Role: {{ user.role|capfirst }}</p>
</div>
```

#### With Django Packages
```html
<!-- django-bird component -->
<div 
  data-django-template='{"variant": "success", "message": "Changes saved!"}'
  data-django-packages='["django-bird"]'>
  {% load django_bird %}
  {% bird alert variant=variant dismissible=True %}
    {{ message }}
  {% endbird %}
</div>
```

#### Loading and Error States
```html
<div 
  data-django-template='{"name": "Alice"}'
  data-django-loading="Rendering template..."
  data-django-error-fallback="<p>Failed to render template</p>">
  Hello {{ name }}!
</div>
```

### Error Handling and Debugging

```typescript
// Global error handler
DjangoPlayground.init({
  onError: (error, element) => {
    console.error('Django error:', error);
    
    // Different error types
    switch (error.type) {
      case 'InitializationError':
        // Failed to load Pyodide/Django
        break;
      case 'TemplateSyntaxError':
        // Invalid template syntax
        break;
      case 'PackageError':
        // Failed to install package
        break;
      case 'TimeoutError':
        // Operation timed out
        break;
    }
  }
});

// Debug mode for development
DjangoPlayground.init({
  debug: true,  // Enables verbose logging
  onDebug: (message, data) => {
    console.log(`[Django Debug] ${message}`, data);
  }
});
```

### Memory Management

```typescript
// Cleanup (important for SPAs)
DjangoPlayground.cleanup();

// Memory-conscious configuration
DjangoPlayground.init({
  sharedInstance: true,         // Share Django across examples (saves ~100MB per example)
  templateCache: true,          // Cache compiled templates
  maxCacheSize: 50,             // Limit template cache size
  lazyLoad: true,               // Only render visible examples
  intersectionThreshold: 0.1    // Render when 10% visible
});

// Monitor memory usage
const stats = DjangoPlayground.getStats();
console.log(stats);
// { 
//   memoryUsage: 120000000,     // bytes
//   templatesRendered: 15,
//   templatesCached: 8,
//   initTime: 9234             // ms
// }
```

## Framework Integration (Production-Ready)

### React Hook with Proper Lifecycle

```tsx
import { useDjangoTemplate } from 'django-playground/react';
import { useEffect, useRef } from 'react';

interface Props {
  template: string;
  context?: Record<string, any>;
  packages?: string[];
}

function DjangoExample({ template, context = {}, packages = [] }: Props) {
  const { html, loading, error, cleanup } = useDjangoTemplate(template, context, {
    packages,
    timeout: 10000
  });
  
  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup?.();
  }, [cleanup]);
  
  // SSR handling
  if (typeof window === 'undefined') {
    return (
      <div className="django-ssr-fallback">
        <pre><code>{template}</code></pre>
        <p><em>Template will render interactively in browser</em></p>
      </div>
    );
  }
  
  if (loading) {
    return <div className="django-loading">Rendering Django template...</div>;
  }
  
  if (error) {
    return (
      <div className="django-error">
        <details>
          <summary>Template Error: {error.message}</summary>
          <pre>{error.context}</pre>
        </details>
      </div>
    );
  }
  
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// Error boundary wrapper
import { ErrorBoundary } from 'react-error-boundary';

function DjangoExampleWithErrorBoundary(props: Props) {
  return (
    <ErrorBoundary 
      fallback={<div>Django template failed to load</div>}
      onError={(error) => console.error('Django render error:', error)}
    >
      <DjangoExample {...props} />
    </ErrorBoundary>
  );
}
```

### Vue Composition API with Proper Reactivity

```vue
<template>
  <div v-if="isSSR" class="django-ssr-fallback">
    <pre><code>{{ template }}</code></pre>
    <p><em>Template will render interactively in browser</em></p>
  </div>
  <div v-else-if="loading" class="django-loading">
    Rendering Django template...
  </div>
  <div v-else-if="error" class="django-error">
    <details>
      <summary>Template Error: {{ error.message }}</summary>
      <pre>{{ error.context }}</pre>
    </details>
  </div>
  <div v-else v-html="html"></div>
</template>

<script setup lang="ts">
import { useDjangoTemplate } from 'django-playground/vue';
import { toRefs, onUnmounted, computed } from 'vue';

interface Props {
  template: string;
  context?: Record<string, any>;
  packages?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  context: () => ({}),
  packages: () => []
});

const { template, context, packages } = toRefs(props);

const { html, loading, error, cleanup } = useDjangoTemplate(
  template,
  context,
  { packages: packages.value }
);

const isSSR = computed(() => typeof window === 'undefined');

onUnmounted(() => {
  cleanup?.();
});
</script>
```

### Astro Component (Working)

```astro
---
// components/DjangoExample.astro
export interface Props {
  template: string;
  context?: Record<string, any>;
  packages?: string[];
  fallback?: string;
}

const { 
  template, 
  context = {}, 
  packages = [],
  fallback = "Template will render interactively in browser"
} = Astro.props;
---

<div class="django-example">
  <!-- SSR fallback -->
  <div class="django-ssr-fallback">
    <pre><code>{template}</code></pre>
    <p><em>{fallback}</em></p>
  </div>
  
  <!-- Client-side template -->
  <div 
    class="django-template"
    data-django-template={JSON.stringify(context)}
    data-django-packages={JSON.stringify(packages)}
    style="display: none;">
    {template}
  </div>
</div>

<script>
  // Initialize Django and show interactive version
  if (typeof window !== 'undefined') {
    import('django-playground').then(({ default: DjangoPlayground }) => {
      DjangoPlayground.init({
        packages: {packages},
        onReady: () => {
          // Hide SSR fallback, show interactive version
          document.querySelectorAll('.django-ssr-fallback').forEach(el => {
            el.style.display = 'none';
          });
          document.querySelectorAll('.django-template').forEach(el => {
            el.style.display = 'block';
          });
        }
      });
    });
  }
</script>

<style>
  .django-example {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 1rem;
    margin: 1rem 0;
  }
  
  .django-ssr-fallback {
    opacity: 0.7;
  }
  
  .django-ssr-fallback code {
    background: #f5f5f5;
    padding: 0.2em 0.4em;
    border-radius: 3px;
  }
</style>
```

## Build System Integration

### MkDocs Plugin (Real Implementation)

```python
# mkdocs_django_playground/plugin.py
from mkdocs.plugins import BasePlugin
from mkdocs.config import config_options
import json
import re

class DjangoPlaygroundPlugin(BasePlugin):
    config_scheme = (
        ('packages', config_options.Type(list, default=['django-bird'])),
        ('auto_include_js', config_options.Type(bool, default=True)),
    )
    
    def on_page_markdown(self, markdown, page, config, files):
        # Replace django code blocks with interactive examples
        def replace_django_block(match):
            code = match.group(1)
            # Parse YAML context if present
            context_match = re.search(r'context:\s*\n(.*?)\n(?=\w|\Z)', code, re.DOTALL)
            context = yaml.safe_load(context_match.group(1)) if context_match else {}
            
            # Extract template
            template_match = re.search(r'template:\s*\|\s*\n(.*?)\n(?=\w|\Z)', code, re.DOTALL)
            template = template_match.group(1).strip() if template_match else ''
            
            return f'''
<div 
  data-django-template='{json.dumps(context)}'
  data-django-packages='{json.dumps(self.config['packages'])}'
  data-django-loading="Loading Django...">
{template}
</div>
'''
        
        # Replace ```django blocks
        markdown = re.sub(
            r'```django\n(.*?)\n```',
            replace_django_block,
            markdown,
            flags=re.DOTALL
        )
        
        return markdown
    
    def on_page_content(self, html, page, config, files):
        if self.config['auto_include_js'] and 'data-django-template' in html:
            # Add Django Playground script
            script = '''
<script src="/assets/django-playground.js"></script>
<script>DjangoPlayground.init();</script>
'''
            html = html + script
        return html
```

### Webpack/Vite Integration

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['django-playground'] // Don't pre-bundle Pyodide
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'django-playground': ['django-playground'] // Separate chunk for lazy loading
        }
      }
    }
  }
});
```

### Next.js Integration

```typescript
// components/DjangoExample.tsx
import dynamic from 'next/dynamic';

// Lazy load Django component (CSR only)
const DjangoTemplate = dynamic(
  () => import('./DjangoTemplate'),
  { 
    ssr: false,
    loading: () => <div>Loading Django template...</div>
  }
);

export default function DjangoExample({ template, context, packages }) {
  return <DjangoTemplate template={template} context={context} packages={packages} />;
}
```

## Security Considerations

### Content Security Policy

```html
<!-- Required CSP headers for Django Playground -->
<meta http-equiv="Content-Security-Policy" content="
  script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net;
  worker-src 'self' blob:;
  wasm-src 'self';
">
```

### Input Sanitization

```typescript
// Template content is executed in isolated Pyodide environment
// but output HTML should still be sanitized for XSS protection
import DOMPurify from 'dompurify';

const html = await DjangoPlayground.render(template, context);
const safeHtml = DOMPurify.sanitize(html);
```

## Performance Monitoring

### Built-in Metrics

```typescript
// Enable performance monitoring
DjangoPlayground.init({
  enableMetrics: true,
  onMetrics: (metrics) => {
    // Send to your analytics service
    analytics.track('django_playground_metrics', metrics);
  }
});

// Get current performance stats
const stats = DjangoPlayground.getPerformanceStats();
/*
{
  initializationTime: 9234,        // ms to initialize
  averageRenderTime: 245,          // ms average render time
  memoryUsage: 127000000,          // bytes
  templatesRendered: 23,
  templatesCached: 12,
  errorsCount: 2,
  lastError: "TemplateSyntaxError: ..."
}
*/
```

### Performance Budget Warnings

```typescript
DjangoPlayground.init({
  performanceBudget: {
    maxInitTime: 15000,           // Warn if init takes > 15s
    maxMemoryUsage: 200000000,    // Warn if using > 200MB
    maxRenderTime: 1000           // Warn if render takes > 1s
  },
  onBudgetExceeded: (metric, value, budget) => {
    console.warn(`Performance budget exceeded: ${metric} = ${value}, budget = ${budget}`);
  }
});
```

## Real-World Examples

### Django-Bird Documentation Site

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>django-bird Components</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Performance hints -->
  <link rel="preload" href="./django-playground.js" as="script">
  
  <!-- CSP for Django Playground -->
  <meta http-equiv="Content-Security-Policy" content="
    script-src 'self' 'unsafe-eval';
    worker-src 'self' blob:;
    wasm-src 'self';
  ">
  
  <style>
    .django-loading {
      background: #f0f9ff;
      border: 1px solid #0284c7;
      border-radius: 6px;
      padding: 1rem;
      margin: 1rem 0;
      color: #0c4a6e;
    }
    
    .django-error {
      background: #fef2f2;
      border: 1px solid #ef4444;
      border-radius: 6px;
      padding: 1rem;
      margin: 1rem 0;
      color: #dc2626;
    }
    
    .django-example {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.5rem;
      margin: 2rem 0;
      background: white;
    }
  </style>
</head>
<body>
  <!-- Performance notice -->
  <div id="performance-notice" class="django-loading">
    <h3>🚀 Loading Interactive Examples</h3>
    <p>Django Playground is initializing (~10 seconds). Examples will become interactive when ready.</p>
    <progress id="init-progress" max="100" value="0"></progress>
  </div>

  <main>
    <h1>django-bird Component Library</h1>
    
    <section>
      <h2>Button Component</h2>
      <p>The <code>{% bird button %}</code> component creates semantic, accessible buttons with multiple variants.</p>
      
      <div class="django-example">
        <h3>Basic Button</h3>
        <div 
          data-django-template='{"text": "Click me!"}'
          data-django-packages='["django-bird"]'
          data-django-loading="Rendering button component...">
          {% load django_bird %}
          {% bird button variant="primary" %}
            {{ text }}
          {% endbird %}
        </div>
      </div>
      
      <div class="django-example">
        <h3>Button Variants</h3>
        <div 
          data-django-template='{"variants": ["primary", "secondary", "danger"]}'
          data-django-packages='["django-bird"]'>
          {% load django_bird %}
          {% for variant in variants %}
            {% bird button variant=variant %}
              {{ variant|capfirst }} Button
            {% endbird %}
          {% endfor %}
        </div>
      </div>
    </section>

    <section>
      <h2>Interactive Playground</h2>
      <p>Try modifying the template and context to see live updates:</p>
      
      <div id="playground-container"></div>
    </section>
  </main>

  <script src="./django-playground.js"></script>
  <script>
    // Initialize with progress tracking and error handling
    DjangoPlayground.init({
      packages: ['django-bird'],
      timeout: 30000, // 30 second timeout
      onProgress: (step, progress) => {
        document.getElementById('init-progress').value = progress;
        console.log(`Django init: ${step} (${progress}%)`);
      },
      onReady: () => {
        // Hide performance notice
        document.getElementById('performance-notice').style.display = 'none';
        
        // Create interactive playground
        DjangoPlayground.createPlayground({
          container: '#playground-container',
          defaultTemplate: `{% load django_bird %}
{% bird button variant="primary" size="large" %}
  {{ button_text|default:"Hello World!" }}
{% endbird %}`,
          defaultContext: {
            button_text: "Try editing me!"
          },
          packages: ['django-bird'],
          features: {
            templateEditor: true,
            contextEditor: true,
            shareUrls: true
          }
        });
        
        console.log('Django Playground ready!');
      },
      onError: (error) => {
        document.getElementById('performance-notice').innerHTML = `
          <h3>❌ Failed to Load Django</h3>
          <p><strong>Error:</strong> ${error.message}</p>
          <details>
            <summary>Technical Details</summary>
            <pre>${error.stack}</pre>
          </details>
          <p>You can still view the static template code above.</p>
        `;
      },
      // Enable performance monitoring
      enableMetrics: true,
      onMetrics: (metrics) => {
        console.log('Django Playground metrics:', metrics);
      }
    });
  </script>
</body>
</html>
```

## TypeScript Definitions

```typescript
// django-playground.d.ts
declare module 'django-playground' {
  export interface InitOptions {
    packages?: string[];
    autoRender?: boolean;
    sharedInstance?: boolean;
    timeout?: number;
    enableMetrics?: boolean;
    performanceBudget?: {
      maxInitTime?: number;
      maxMemoryUsage?: number;
      maxRenderTime?: number;
    };
    onProgress?: (step: string, progress: number) => void;
    onReady?: () => void;
    onError?: (error: DjangoError) => void;
    onMetrics?: (metrics: PerformanceMetrics) => void;
    onBudgetExceeded?: (metric: string, value: number, budget: number) => void;
  }

  export interface RenderOptions {
    packages?: string[];
    timeout?: number;
  }

  export interface PlaygroundOptions {
    container: string | HTMLElement;
    defaultTemplate?: string;
    defaultContext?: Record<string, any>;
    packages?: string[];
    theme?: 'light' | 'dark' | 'auto';
    features?: {
      templateEditor?: boolean;
      contextEditor?: boolean;
      packageManager?: boolean;
      shareUrls?: boolean;
      downloadCode?: boolean;
    };
  }

  export interface DjangoError extends Error {
    type: 'InitializationError' | 'TemplateSyntaxError' | 'PackageError' | 'TimeoutError';
    context?: string;
  }

  export interface PerformanceMetrics {
    initializationTime: number;
    averageRenderTime: number;
    memoryUsage: number;
    templatesRendered: number;
    templatesCached: number;
    errorsCount: number;
    lastError?: string;
  }

  export interface PlaygroundInstance {
    render(): Promise<void>;
    setTemplate(template: string): void;
    setContext(context: Record<string, any>): void;
    getShareUrl(): string;
    destroy(): void;
  }

  export default class DjangoPlayground {
    static init(options?: InitOptions): Promise<void>;
    static render(template: string, context?: Record<string, any>, options?: RenderOptions): Promise<string>;
    static createPlayground(options: PlaygroundOptions): Promise<PlaygroundInstance>;
    static cleanup(): void;
    static getStats(): PerformanceMetrics;
    static getPerformanceStats(): PerformanceMetrics;
  }
}

declare module 'django-playground/react' {
  export function useDjangoTemplate(
    template: string,
    context?: Record<string, any>,
    options?: { packages?: string[]; timeout?: number }
  ): {
    html: string | null;
    loading: boolean;
    error: DjangoError | null;
    cleanup?: () => void;
  };
}

declare module 'django-playground/vue' {
  import { Ref } from 'vue';
  
  export function useDjangoTemplate(
    template: Ref<string>,
    context?: Ref<Record<string, any>>,
    options?: { packages?: string[]; timeout?: number }
  ): {
    html: Ref<string | null>;
    loading: Ref<boolean>;
    error: Ref<DjangoError | null>;
    cleanup?: () => void;
  };
}
```

## Browser Support & Requirements

**Minimum Requirements:**
- Chrome 80+ (February 2020)
- Firefox 78+ (June 2020)  
- Safari 14+ (September 2020)
- Edge 80+ (February 2020)

**Required Features:**
- WebAssembly with bulk memory operations
- Web Workers with module support
- SharedArrayBuffer (for optimal performance)
- ~150MB available RAM
- ~10MB network bandwidth for initial load

**Graceful Degradation:**
```html
<!-- Provide static fallback -->
<noscript>
  <div class="django-fallback">
    <h3>Static Template Example</h3>
    <pre><code>{% load django_bird %}{% bird button %}Click me{% endbird %}</code></pre>
    <p><strong>Expected output:</strong> <code>&lt;button class="btn"&gt;Click me&lt;/button&gt;</code></p>
  </div>
</noscript>
```

## Limitations & Honest Assessment

**✅ Excellent for:**
- Documentation sites with live examples
- Interactive Django tutorials
- Component library showcases  
- Educational content

**❌ Not suitable for:**
- Production web applications
- SEO-critical content (client-side only)
- Mobile-first experiences (high memory usage)
- Low-bandwidth environments
- Accessibility-critical applications (complex DOM manipulation)

**⚠️ Consider carefully for:**
- High-traffic documentation (CDN costs)
- Corporate networks (WebAssembly restrictions)
- Multilingual sites (Django package localization)

**Memory & Performance Reality:**
- Initial page load: +8-12 seconds, +80-150MB RAM
- Each additional example: +50-200ms, +1-5MB RAM  
- Best case: 10+ examples sharing one Django instance
- Worst case: Multiple instances = memory multiplication

## Migration Guide

### From Static Code Examples

**Before:**
```html
<pre><code>{% load django_bird %}{% bird button %}Click{% endbird %}</code></pre>
```

**After:**
```html
<div data-django-template='{}' data-django-packages='["django-bird"]'>
  {% load django_bird %}{% bird button %}Click{% endbird %}
</div>
```

### From V1/V2

**Breaking Changes:**
- `renderSync()` removed (was impossible)
- Initialization API changed
- Framework integration patterns updated

**Migration Steps:**
1. Update initialization: `DjangoPlayground.init()` → `DjangoPlayground.init({packages: [...]})`
2. Add error handling for all async operations
3. Update React/Vue components with proper cleanup
4. Add TypeScript definitions if using TypeScript
5. Test performance with realistic content loads