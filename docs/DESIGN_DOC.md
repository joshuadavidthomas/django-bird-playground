# Django Playground - Final API Design

> **Client-side Django template rendering for documentation and education**

## Core Purpose

Enable **live Django template examples** in documentation instead of static code blocks. Perfect for:

- Django package documentation (django-bird, django-crispy-forms, etc.)
- Django learning tutorials and courses
- Template syntax documentation
- Component library showcases
- Interactive Django playgrounds (CodeSandbox-style)

## Performance Reality

- **Initial load:** ~10 seconds (Pyodide + Django initialization)
- **Subsequent renders:** ~100-500ms per template
- **Memory usage:** ~100MB for Django instance
- **Target:** Modern browsers, documentation sites (not production apps)

## API Design

### 1. Simple Declarative API (Primary)

**For documentation authors who want "just add Django examples"**

```html
<!-- Basic template rendering -->
<div data-django-template='{"user": {"name": "Alice", "role": "admin"}}'>
  <h2>Welcome {{ user.name }}!</h2>
  <p>Your role: {{ user.role|capfirst }}</p>
</div>

<!-- With Django packages -->
<div data-django-template='{}' data-django-packages='["django-bird"]'>
  {% load django_bird %}
  {% bird button variant="primary" size="large" %}
    Click me!
  {% endbird %}
</div>

<!-- Initialize once per page -->
<script>DjangoPlayground.init();</script>
```

### 2. Programmatic API (For frameworks/tools)

```javascript
// Initialize Django
await DjangoPlayground.init({
  packages: ['django-bird', 'django-crispy-forms'],
  onReady: () => console.log('Django ready'),
  onError: (error) => console.error('Failed:', error)
});

// Render single template
const html = await DjangoPlayground.render(
  'Hello {{ name }}!',
  { name: 'World' }
);

// Create interactive playground
const playground = await DjangoPlayground.createPlayground({
  container: '#playground',
  defaultTemplate: '{% load django_bird %}{% bird button %}Hello{% endbird %}',
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

## Framework Integration

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

## What This Enables

### Documentation Authors
- **Drop-in Django examples** with data attributes
- **No build process changes** - just add script tag and data attributes
- **Multiple examples per page** with shared Django instance
- **Error handling** that doesn't break documentation

### Framework Developers  
- **React/Vue/Astro components** for Django examples
- **Hooks and composables** with proper lifecycle management
- **SSR-compatible** patterns with client-side enhancement

### Education Platform Builders
- **Interactive Django tutorials** with live examples
- **Playground widgets** for hands-on learning
- **Template validation** for student code
- **Shareable examples** and code snippets

### Package Maintainers
- **Live component documentation** (django-bird, django-crispy-forms, etc.)
- **Interactive API examples** users can modify
- **Version-specific examples** with package dependencies
- **Copy-paste friendly** template code

## Limitations (Honest Assessment)

**✅ Perfect for:**
- Documentation sites
- Learning materials  
- Package showcases
- Interactive tutorials
- Code playgrounds

**❌ Not for:**
- Production web applications
- SEO-critical content (renders client-side)
- Mobile-optimized sites (high memory usage)
- Offline-first applications

**⚠️ Consider:**
- Initial load time (~10 seconds)
- Memory usage (~100MB)
- Modern browser requirement
- JavaScript dependency

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

---

**This API balances simplicity for documentation authors with flexibility for advanced use cases, while being honest about technical constraints and performance characteristics.**