# Django Playground - Production-Ready API Design

> **Client-side Django template rendering for real-world Django package documentation**

## Core Purpose & Validation Priority

Enable **live Django template examples** in production documentation sites, with a primary focus on validating real Django packages. Priority use cases:

1. **Real Django package documentation** (django-bird, django-crispy-forms, django-extensions, etc.)
2. **Package maintainer showcases** with live, interactive examples
3. **Django learning materials** with validated template syntax
4. **Component library documentation** that users can trust and copy-paste

Secondary (nice-to-have):
- Interactive Django playgrounds (CodeSandbox-style)
- Educational toys and experiments

## Production Requirements & Performance

### Primary Design Goals (in order)
1. **Reliability:** Must consistently render real Django packages without errors
2. **Performance:** Acceptable load times for documentation sites (~10s initial, <500ms renders)
3. **Usability:** Simple integration for documentation authors
4. **Accuracy:** Template output must match real Django behavior

### Performance Reality
- **Initial load:** ~10 seconds (Pyodide + Django initialization)
- **Subsequent renders:** ~100-500ms per template
- **Memory usage:** ~100MB for Django instance
- **Target:** Modern browsers, documentation sites
- **Production validation:** Must work with real packages like django-bird, django-crispy-forms

### Testing & Validation Strategy
- **Package compatibility testing:** Automated tests against top Django packages
- **Real-world examples:** Documentation examples that maintainers actually use
- **Performance monitoring:** Track load times and memory usage in production docs
- **Error handling:** Graceful degradation when packages fail to load

## API Design

### 1. Simple Declarative API (Primary)

**For documentation authors who want "just add Django examples"**

```html
<!-- Real django-bird documentation example -->
<div data-django-template='{}' data-django-packages='["django-bird"]'>
  {% load django_bird %}
  {% bird button variant="primary" size="large" %}
    Save Changes
  {% endbird %}
</div>

<!-- Real django-crispy-forms documentation example -->
<div data-django-template='{"form": {"title": "Contact Us"}}' data-django-packages='["django-crispy-forms"]'>
  {% load crispy_forms_tags %}
  {% crispy form %}
</div>

<!-- Basic template syntax (fallback for simple examples) -->
<div data-django-template='{"user": {"name": "Alice", "role": "admin"}}'>
  <h2>Welcome {{ user.name }}!</h2>
  <p>Your role: {{ user.role|capfirst }}</p>
</div>

<!-- Initialize once per page -->
<script>DjangoPlayground.init();</script>
```

### 2. Programmatic API (For framework integrations - optional)

```javascript
// Initialize Django with real packages
await DjangoPlayground.init({
  packages: ['django-bird', 'django-crispy-forms', 'django-extensions'],
  onReady: () => console.log('Django ready'),
  onError: (error) => console.error('Failed:', error)
});

// Render django-bird component
const html = await DjangoPlayground.render(
  '{% load django_bird %}{% bird alert variant="success" %}Changes saved!{% endbird %}',
  {},
  { packages: ['django-bird'] }
);

// Create interactive playground (nice-to-have feature)
const playground = await DjangoPlayground.createPlayground({
  container: '#playground',
  defaultTemplate: '{% load django_bird %}{% bird button %}Try it{% endbird %}',
  packages: ['django-bird']
});
```

## Complete API Reference

### Core Functions

#### `DjangoPlayground.init(options?): Promise<void>`

Initialize Django on the page. Call once per page.

```typescript
interface InitOptions {
  packages?: string[];                    // Django packages to install
  autoRender?: boolean;                   // Auto-render data-django-template elements (default: true)
  sharedInstance?: boolean;               // Share Django across examples (default: true)
  onProgress?: (step: string, percent: number) => void;
  onReady?: () => void;
  onError?: (error: DjangoError) => void;
}

// Examples
await DjangoPlayground.init();
await DjangoPlayground.init({ packages: ['django-bird'] });
```

#### `DjangoPlayground.render(template, context?, options?): Promise<string>`

Render a single template programmatically.

```typescript
interface RenderOptions {
  packages?: string[];
  timeout?: number;                       // Render timeout (default: 10000ms)
}

// Examples
const html = await DjangoPlayground.render('Hello {{ name }}!', { name: 'World' });
const html = await DjangoPlayground.render(
  '{% load django_bird %}{% bird button %}Click{% endbird %}',
  {},
  { packages: ['django-bird'] }
);
```

#### `DjangoPlayground.createPlayground(options): Promise<PlaygroundInstance>`

Create an interactive editor widget.

```typescript
interface PlaygroundOptions {
  container: string | HTMLElement;
  defaultTemplate?: string;
  defaultContext?: Record<string, any>;
  packages?: string[];
  editable?: boolean;                     // Allow template editing (default: true)
  theme?: 'light' | 'dark' | 'auto';
}

interface PlaygroundInstance {
  setTemplate(template: string): void;
  setContext(context: Record<string, any>): void;
  render(): Promise<void>;
  destroy(): void;
}
```

### Data Attributes (Declarative)

#### Basic Usage
```html
<!-- Template with context -->
<div data-django-template='{"name": "Alice", "items": ["apple", "banana"]}'>
  <p>Hello {{ name }}!</p>
  <p>Items: {{ items|join:", " }}</p>
</div>
```

#### With Packages
```html
<!-- django-bird component -->
<div data-django-template='{}' data-django-packages='["django-bird"]'>
  {% load django_bird %}
  {% bird alert variant="success" dismissible=True %}
    Success! Your changes have been saved.
  {% endbird %}
</div>
```

#### Loading States
```html
<!-- Custom loading message -->
<div 
  data-django-template='{"name": "Alice"}'
  data-django-loading="Rendering Django template...">
  Hello {{ name }}!
</div>
```

### Error Handling

```typescript
interface DjangoError extends Error {
  type: 'InitializationError' | 'TemplateSyntaxError' | 'PackageError' | 'TimeoutError';
  context?: string;                       // Additional error context
}

// Global error handler
DjangoPlayground.init({
  onError: (error, element?) => {
    console.error(`Django ${error.type}:`, error.message);
    if (element) {
      element.innerHTML = `<div class="error">Template failed: ${error.message}</div>`;
    }
  }
});
```

### Memory Management

```typescript
// Cleanup (important for SPAs)
DjangoPlayground.cleanup();

// Memory-efficient configuration
DjangoPlayground.init({
  sharedInstance: true,                   // Share Django across examples (saves ~100MB per example)
  templateCache: true,                    // Cache compiled templates
  lazyLoad: true                          // Only render visible examples
});

// Performance stats
const stats = DjangoPlayground.getStats();
// { memoryUsage: 120000000, templatesRendered: 15, initTime: 9234 }
```

## Framework Integration (Optional)

> **Note:** Framework integrations are nice-to-have features. The primary validation focus is on the data-attribute API working reliably with real Django packages. Framework wrappers can be added later based on community demand.

### React Hook

```tsx
import { useDjangoTemplate } from 'django-playground/react';

function DjangoExample({ template, context, packages = [] }) {
  const { html, loading, error } = useDjangoTemplate(template, context, { packages });
  
  if (loading) return <div>Rendering Django template...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

### Vue Composable

```vue
<template>
  <div v-if="loading">Rendering...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else v-html="html"></div>
</template>

<script setup>
import { useDjangoTemplate } from 'django-playground/vue';

const props = defineProps(['template', 'context', 'packages']);
const { html, loading, error } = useDjangoTemplate(
  () => props.template,
  () => props.context,
  { packages: props.packages }
);
</script>
```

### Astro Component

```astro
---
// components/DjangoExample.astro
export interface Props {
  template: string;
  context?: Record<string, any>;
  packages?: string[];
}

const { template, context = {}, packages = [] } = Astro.props;
---

<div 
  data-django-template={JSON.stringify(context)}
  data-django-packages={JSON.stringify(packages)}>
  {template}
</div>

<script>
  import DjangoPlayground from 'django-playground';
  DjangoPlayground.init({ packages: {packages} });
</script>
```

### 11ty Shortcode

```javascript
// .eleventy.js
module.exports = function(eleventyConfig) {
  eleventyConfig.addPairedAsyncShortcode("django", async function(template, data) {
    const context = data ? JSON.parse(data) : {};
    return `
      <div data-django-template='${JSON.stringify(context)}'>
        ${template}
      </div>
    `;
  });
  
  // Add initialization script to pages with Django templates
  eleventyConfig.addTransform("django-init", function(content) {
    if (content.includes('data-django-template')) {
      return content + '<script>DjangoPlayground.init();</script>';
    }
    return content;
  });
};
```

## Usage Patterns

### Documentation Site Pattern

```html
<!DOCTYPE html>
<html>
<head>
  <title>Django Template Guide</title>
  <script src="https://cdn.jsdelivr.net/npm/django-playground@1.0.0"></script>
</head>
<body>
  <h1>Django Template Syntax</h1>
  
  <h2>Variables and Filters</h2>
  <p>Use <code>{{ variable }}</code> to output data and <code>|filter</code> to transform it:</p>
  
  <div data-django-template='{"name": "alice", "items": ["apple", "banana", "cherry"]}'>
    <p>Name: {{ name|capfirst }}</p>
    <p>Items: {{ items|length }} total</p>
    <p>First item: {{ items.0 }}</p>
  </div>
  
  <h2>Template Tags</h2>
  <p>Use <code>{% tag %}</code> for logic and loops:</p>
  
  <div data-django-template='{"users": [{"name": "Alice", "admin": true}, {"name": "Bob", "admin": false}]}'>
    <ul>
    {% for user in users %}
      <li>
        {{ user.name }}
        {% if user.admin %} (Admin){% endif %}
      </li>
    {% endfor %}
    </ul>
  </div>
  
  <script>
    DjangoPlayground.init({
      onReady: () => console.log('Examples are now interactive!'),
      onError: (error) => console.error('Django failed to load:', error)
    });
  </script>
</body>
</html>
```

### Package Documentation Pattern

```html
<h1>django-bird Components</h1>

<h2>Button Component</h2>
<p>Create semantic buttons with the <code>{% bird button %}</code> tag:</p>

<!-- Basic button -->
<div data-django-template='{}' data-django-packages='["django-bird"]'>
  {% load django_bird %}
  {% bird button variant="primary" %}
    Primary Button
  {% endbird %}
</div>

<!-- Button with props -->
<div data-django-template='{"text": "Custom Text", "size": "large"}' data-django-packages='["django-bird"]'>
  {% load django_bird %}
  {% bird button variant="secondary" size=size %}
    {{ text }}
  {% endbird %}
</div>

<!-- Multiple variants -->
<div data-django-template='{"variants": ["primary", "secondary", "danger"]}' data-django-packages='["django-bird"]'>
  {% load django_bird %}
  {% for variant in variants %}
    {% bird button variant=variant %}
      {{ variant|capfirst }}
    {% endbird %}
  {% endfor %}
</div>

<script>DjangoPlayground.init({ packages: ['django-bird'] });</script>
```

### Interactive Playground Pattern

```html
<h2>Try It Yourself</h2>
<div id="playground"></div>

<script>
  DjangoPlayground.init({ packages: ['django-bird'] }).then(() => {
    DjangoPlayground.createPlayground({
      container: '#playground',
      defaultTemplate: `{% load django_bird %}
{% bird button variant="primary" %}
  {{ button_text|default:"Hello World!" }}
{% endbird %}`,
      defaultContext: {
        button_text: "Click me!"
      },
      packages: ['django-bird']
    });
  });
</script>
```

### Multiple Examples Efficiency

```html
<!-- All examples share one Django instance automatically -->
<div data-django-template='{"name": "Alice"}'>Hello {{ name }}!</div>
<div data-django-template='{"count": 5}'>You have {{ count }} messages</div>
<div data-django-template='{}' data-django-packages='["django-bird"]'>
  {% load django_bird %}{% bird button %}Click{% endbird %}
</div>

<!-- One init handles all examples -->
<script>DjangoPlayground.init({ packages: ['django-bird'] });</script>
```

## Advanced Features

### Custom Web Component

```html
<!-- Register web component -->
<script>
  class DjangoTemplate extends HTMLElement {
    connectedCallback() {
      const template = this.textContent;
      const context = JSON.parse(this.getAttribute('context') || '{}');
      const packages = JSON.parse(this.getAttribute('packages') || '[]');
      
      DjangoPlayground.render(template, context, { packages })
        .then(html => this.innerHTML = html)
        .catch(error => this.innerHTML = `<div class="error">${error.message}</div>`);
    }
  }
  customElements.define('django-template', DjangoTemplate);
</script>

<!-- Usage -->
<django-template context='{"name": "Alice"}' packages='["django-bird"]'>
  {% load django_bird %}
  Hello {{ name }}! {% bird button %}Click{% endbird %}
</django-template>
```

### Batch Rendering

```javascript
// Render multiple templates efficiently
const templates = [
  { template: 'Hello {{ name }}!', context: { name: 'Alice' } },
  { template: 'Count: {{ items|length }}', context: { items: [1,2,3] } },
  { template: '{% load django_bird %}{% bird button %}Click{% endbird %}', context: {} }
];

const results = await DjangoPlayground.renderBatch(templates, { packages: ['django-bird'] });
// Returns array of HTML strings
```

### Template Validation

```javascript
// Validate template syntax without rendering
const isValid = await DjangoPlayground.validateTemplate('Hello {{ name }}!');
// Returns { valid: true } or { valid: false, error: "..." }

// Useful for playground editors
playground.onTemplateChange = async (template) => {
  const validation = await DjangoPlayground.validateTemplate(template);
  if (!validation.valid) {
    showError(validation.error);
  }
};
```

## TypeScript Support

```typescript
// Full type definitions included
import DjangoPlayground, { 
  InitOptions, 
  RenderOptions, 
  PlaygroundOptions,
  DjangoError 
} from 'django-playground';

// Framework-specific types
import { useDjangoTemplate } from 'django-playground/react';
import { useDjangoTemplate } from 'django-playground/vue';

// All APIs are fully typed
const html: string = await DjangoPlayground.render(
  'Hello {{ name }}!',
  { name: 'World' }
);
```

## What This Enables (Validation Priorities)

### Package Maintainers (Primary Focus)
- **Live component documentation** for django-bird, django-crispy-forms, django-extensions, etc.
- **Trustworthy examples** that actually work with real packages
- **Copy-paste friendly** template code that users can rely on
- **Version-specific examples** with proper package dependencies
- **Interactive demos** that prove packages work as advertised

### Documentation Authors (Primary Focus) 
- **Drop-in Django examples** with data attributes
- **No build process changes** - just add script tag and data attributes
- **Multiple examples per page** with shared Django instance
- **Error handling** that doesn't break documentation sites
- **Production-ready** integration for real documentation

### Education Platform Builders (Secondary)
- **Interactive Django tutorials** with validated real-world examples
- **Template validation** for student code
- **Shareable examples** using actual Django packages

### Framework Developers (Optional/Future)
- **React/Vue/Astro components** for Django examples
- **Hooks and composables** with proper lifecycle management
- **SSR-compatible** patterns with client-side enhancement

## Production Validation & Limitations

**✅ Primary validation targets:**
- **Package documentation sites** (django-bird.readthedocs.io, etc.)
- **Real Django package showcases** with live examples
- **Official Django documentation** enhancements
- **Community package galleries** 

**✅ Secondary targets:**
- Learning materials and tutorials
- Interactive code playgrounds

**❌ Not designed for:**
- Production web applications
- SEO-critical content (renders client-side)
- Mobile-optimized sites (high memory usage)
- Offline-first applications

**⚠️ Production considerations:**
- Initial load time (~10 seconds) - acceptable for documentation
- Memory usage (~100MB) - manageable for modern desktop browsers
- Requires JavaScript - graceful degradation needed
- Package compatibility - must be tested with real Django packages

**🎯 Success metrics:**
- Works reliably with top 20 Django packages
- Load time acceptable for documentation sites
- Zero errors in real package examples
- Positive feedback from package maintainers

## Migration Path

### From Static Examples

**Before:**
```html
<pre><code>{% load django_bird %}{% bird button %}Click{% endbird %}</code></pre>
<p>Output: <code>&lt;button class="btn"&gt;Click&lt;/button&gt;</code></p>
```

**After:**
```html
<div data-django-template='{}' data-django-packages='["django-bird"]'>
  {% load django_bird %}{% bird button %}Click{% endbird %}
</div>
```

### Progressive Enhancement

```html
<!-- Provide static fallback -->
<div class="django-example">
  <!-- Static version for non-JS/loading -->
  <div class="static-fallback">
    <pre><code>{% bird button %}Click{% endbird %}</code></pre>
    <p><strong>Output:</strong> <code>&lt;button class="btn"&gt;Click&lt;/button&gt;</code></p>
  </div>
  
  <!-- Interactive version (hidden until Django loads) -->
  <div data-django-template='{}' data-django-packages='["django-bird"]' style="display: none;">
    {% load django_bird %}{% bird button %}Click{% endbird %}
  </div>
</div>

<script>
  DjangoPlayground.init({
    onReady: () => {
      // Hide static, show interactive
      document.querySelectorAll('.static-fallback').forEach(el => el.style.display = 'none');
      document.querySelectorAll('[data-django-template]').forEach(el => el.style.display = 'block');
    }
  });
</script>
```

## Implementation & Testing Strategy

### Phase 1: Core Validation (Priority)
1. **Basic Django template rendering** with data attributes
2. **Real package integration** - start with django-bird
3. **Error handling and graceful degradation**
4. **Performance optimization** for documentation sites

### Phase 2: Production Hardening
1. **Extended package compatibility** (django-crispy-forms, django-extensions)
2. **Memory management and cleanup**
3. **Progressive enhancement patterns**
4. **Automated testing against real packages**

### Phase 3: Enhanced Features (Optional)
1. **Framework integrations** (React, Vue) if demanded
2. **Interactive playground widgets**
3. **Advanced caching and optimization**
4. **Community package gallery**

### Testing Priorities
- **Package compatibility tests** against real Django packages
- **Documentation site integration** testing
- **Performance benchmarks** on real documentation sites
- **Error scenarios** and graceful degradation
- **Cross-browser compatibility** (modern browsers only)

---

**This API prioritizes real-world validation with Django packages over theoretical features, ensuring reliable integration for production documentation sites while maintaining simplicity for documentation authors.**