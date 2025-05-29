# Django Playground v2 - Documentation-First Design

> **Client-side Django template rendering for documentation authors and playground builders**

## The Problem

You're documenting Django templates and want to show **live, interactive examples** rather than static code blocks. You want readers to see templates actually rendering with real data, and maybe even experiment with modifications.

**Perfect for:**
- Django package documentation (like django-bird)
- Template syntax tutorials
- Interactive Django learning materials
- Component library showcases

## Quick Start

### For Documentation Authors

**Add a live Django template to your docs in 3 steps:**

```html
<!-- 1. Include the library -->
<script src="https://cdn.jsdelivr.net/npm/django-playground@latest"></script>

<!-- 2. Add a template example -->
<div data-django-template='{"user": {"name": "Alice", "email": "alice@example.com"}}'>
  <h2>Hello {{ user.name }}!</h2>
  <p>Contact: {{ user.email }}</p>
</div>

<!-- 3. Initialize (once per page) -->
<script>DjangoPlayground.init();</script>
```

**Result:** After ~5-10 seconds, your template renders live with actual Django template engine.

### For Package Authors (django-bird example)

```html
<div data-django-template='{}' data-django-packages='["django-bird"]'>
  {% load django_bird %}
  {% bird button variant="primary" size="large" %}
    Click me!
  {% endbird %}
</div>
```

## Documentation Integration

### Static Site Generators

#### Astro
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

<div class="django-example">
  <div 
    data-django-template={JSON.stringify(context)}
    data-django-packages={JSON.stringify(packages)}
  >
    {template}
  </div>
</div>

<script>
  import DjangoPlayground from 'django-playground';
  DjangoPlayground.init();
</script>
```

#### MkDocs Plugin (Future)
```markdown
```django
template: |
  <h1>Welcome {{ user.name }}!</h1>
  <p>You have {{ messages|length }} messages</p>
context:
  user:
    name: "Alice"
  messages: ["Hello", "Welcome"]
packages: ["django-bird"]
```
```

### Multiple Examples Per Page

**Efficient memory usage** - all examples share one Django instance:

```html
<!-- Example 1: Basic template -->
<div data-django-template='{"name": "Alice"}'>
  Hello {{ name }}!
</div>

<!-- Example 2: With filters -->  
<div data-django-template='{"items": ["apple", "banana", "cherry"]}'>
  You have {{ items|length }} items: {{ items|join:", " }}
</div>

<!-- Example 3: django-bird component -->
<div data-django-template='{}' data-django-packages='["django-bird"]'>
  {% load django_bird %}
  {% bird alert variant="success" %}
    Success! Your changes have been saved.
  {% endbird %}
</div>

<script>
  // One initialization handles all examples
  DjangoPlayground.init();
</script>
```

## Playground Mode

### Basic Interactive Playground

```javascript
import { createPlayground } from 'django-playground';

// Create an interactive editor
const playground = await createPlayground({
  container: '#playground',
  defaultTemplate: 'Hello {{ name }}!',
  defaultContext: { name: 'World' },
  packages: ['django-bird']
});

// Playground provides:
// - Code editor with Django syntax highlighting
// - Context editor (JSON)
// - Live preview pane
// - Error display
// - Save/share functionality
```

### Embedded Playground

```html
<!-- Minimal playground for docs -->
<django-playground 
  template='{% load django_bird %}{% bird button %}Click me{% endbird %}'
  packages='["django-bird"]'
  editable="true">
</django-playground>
```

## API Reference

### Core Functions

#### `DjangoPlayground.init(options?)`
Initialize Django playground on the current page.

```javascript
// Initialize with defaults
await DjangoPlayground.init();

// With options
await DjangoPlayground.init({
  packages: ['django-bird', 'django-crispy-forms'],
  autoRender: true,  // Auto-render data-django-template elements
  sharedInstance: true,  // Use one Django instance for all examples
  onReady: () => console.log('Django ready!'),
  onError: (error) => console.error('Setup failed:', error)
});
```

#### `DjangoPlayground.render(template, context?, options?)`
Render a single template (useful for programmatic rendering).

```javascript
const html = await DjangoPlayground.render(
  'Hello {{ user.name }}!',
  { user: { name: 'Alice' } },
  { packages: ['django-bird'] }
);
```

#### `DjangoPlayground.createPlayground(options)`
Create an interactive playground widget.

```javascript
const playground = await DjangoPlayground.createPlayground({
  container: '#my-playground',
  defaultTemplate: '{% load django_bird %}{% bird button %}Hello{% endbird %}',
  packages: ['django-bird'],
  features: {
    templateEditor: true,
    contextEditor: true,
    packageManager: true,
    shareUrls: true,
    saveTemplates: true
  }
});
```

### Data Attributes (Declarative API)

#### `data-django-template`
Template context as JSON string.

```html
<div data-django-template='{"name": "Alice", "age": 30}'>
  Name: {{ name }}, Age: {{ age }}
</div>
```

#### `data-django-packages`
Required packages as JSON array.

```html
<div data-django-template='{}' data-django-packages='["django-bird"]'>
  {% load django_bird %}
  {% bird alert %}Hello!{% endbird %}
</div>
```

#### `data-django-loading`
Custom loading message.

```html
<div 
  data-django-template='{"name": "Alice"}'
  data-django-loading="Rendering your template...">
  Hello {{ name }}!
</div>
```

### Error Handling

```javascript
// Global error handler
DjangoPlayground.init({
  onError: (error, element) => {
    console.error('Template error:', error);
    // Error types: 'InitializationError', 'TemplateSyntaxError', 'PackageError'
    
    if (error.type === 'TemplateSyntaxError') {
      element.innerHTML = `
        <div class="template-error">
          Template Error: ${error.message}
          <pre>${error.context}</pre>
        </div>
      `;
    }
  }
});
```

## Performance & Memory Management

### Realistic Performance Expectations

```javascript
// What to expect:
// - Initial load: 5-10 seconds (Pyodide + Django + packages)
// - Subsequent renders: 100-500ms per template
// - Memory usage: ~50-100MB for Django instance
// - Multiple examples: Shared instance = efficient
```

### Memory Optimization

```javascript
// Cleanup when done (important for SPAs)
DjangoPlayground.cleanup();

// Memory-conscious initialization
DjangoPlayground.init({
  sharedInstance: true,    // Share Django instance across examples
  templateCache: true,     // Cache compiled templates  
  maxCacheSize: 100,       // Limit cache size
  lazyLoad: true          // Load examples when visible
});
```

### Multiple Playgrounds

```javascript
// For pages with many examples
DjangoPlayground.init({
  sharedInstance: true,     // Critical for memory efficiency
  batchRender: true,        // Render multiple templates together
  intersectionObserver: true // Only render visible examples
});
```

## Real-World Examples

### Django-Bird Component Documentation

```html
<!DOCTYPE html>
<html>
<head>
  <title>django-bird Components</title>
  <script src="https://cdn.jsdelivr.net/npm/django-playground@latest"></script>
  <style>
    .example { 
      border: 1px solid #ddd; 
      padding: 1rem; 
      margin: 1rem 0; 
    }
    .loading { 
      color: #666; 
      font-style: italic; 
    }
  </style>
</head>
<body>
  <h1>django-bird Components</h1>

  <h2>Button Component</h2>
  <div class="example">
    <h3>Primary Button</h3>
    <div 
      data-django-template='{}' 
      data-django-packages='["django-bird"]'
      data-django-loading="Loading django-bird...">
      {% load django_bird %}
      {% bird button variant="primary" %}
        Primary Action
      {% endbird %}
    </div>
  </div>

  <div class="example">
    <h3>Secondary Button with Size</h3>
    <div 
      data-django-template='{}' 
      data-django-packages='["django-bird"]'>
      {% load django_bird %}
      {% bird button variant="secondary" size="large" %}
        Large Secondary
      {% endbird %}
    </div>
  </div>

  <h2>Alert Component</h2>
  <div class="example">
    <div 
      data-django-template='{"message": "Success! Your changes have been saved."}' 
      data-django-packages='["django-bird"]'>
      {% load django_bird %}
      {% bird alert variant="success" dismissible=True %}
        {{ message }}
      {% endbird %}
    </div>
  </div>

  <script>
    DjangoPlayground.init({
      packages: ['django-bird'],
      sharedInstance: true,
      onReady: () => {
        // Add syntax highlighting, copy buttons, etc.
        console.log('All examples ready!');
      }
    });
  </script>
</body>
</html>
```

### Interactive Django Tutorial

```html
<h1>Django Template Tutorial</h1>

<h2>Step 1: Variables</h2>
<p>Use <code>{{ variable }}</code> to output data:</p>

<div data-django-template='{"name": "Alice", "age": 25}'>
  <p>Name: {{ name }}</p>
  <p>Age: {{ age }}</p>
</div>

<h2>Step 2: Filters</h2>
<p>Use filters to modify output:</p>

<div data-django-template='{"text": "hello world", "items": [1,2,3,4,5]}'>
  <p>Title case: {{ text|title }}</p>
  <p>Item count: {{ items|length }}</p>
  <p>First 3: {{ items|slice:":3"|join:", " }}</p>
</div>

<h2>Step 3: Try It Yourself</h2>
<django-playground 
  template='Hello {{ name }}! You have {{ count }} new messages.'
  context='{"name": "Student", "count": 5}'
  editable="true">
</django-playground>
```

## Framework Integration

### React Hook

```jsx
import { useDjangoTemplate } from 'django-playground/react';

function TemplateExample({ template, context, packages }) {
  const { html, loading, error } = useDjangoTemplate(template, context, { packages });
  
  if (loading) return <div className="loading">Rendering template...</div>;
  if (error) return <div className="error">Error: {error.message}</div>;
  
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

### Vue Composition API

```vue
<template>
  <div v-if="loading" class="loading">Rendering...</div>
  <div v-else-if="error" class="error">{{ error.message }}</div>
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

## Configuration

### Global Settings

```javascript
DjangoPlayground.configure({
  // Performance
  sharedInstance: true,
  templateCache: true,
  maxCacheSize: 100,
  
  // UI
  loadingClass: 'django-loading',
  errorClass: 'django-error',
  
  // Packages
  defaultPackages: ['django-bird'],
  packageCdn: 'https://pypi.org/simple/',
  
  // Development
  debug: true,
  verbose: false
});
```

## Browser Support

- **Modern browsers** with Web Workers and WebAssembly
- **Chrome 69+, Firefox 69+, Safari 12+, Edge 79+**
- **Memory requirements:** ~100MB RAM for Django instance
- **Network:** Initial download ~6-8MB (Pyodide + Django)

## Limitations & Trade-offs

**What this is good for:**
- Documentation examples
- Learning materials
- Component showcases
- Interactive tutorials

**What this is NOT good for:**
- Production applications
- SEO-critical content
- Mobile-first experiences
- High-performance needs

**Memory considerations:**
- One Django instance per page is recommended
- Multiple instances will multiply memory usage
- Clean up instances in single-page applications

## Migration from v1

### Breaking Changes
- Removed `renderSync()` (was impossible to implement)
- Removed server-side rendering claims
- Changed initialization API

### What Stayed the Same
- `render()` function API
- Data attribute approach
- Framework integration patterns

### New Features
- Shared instance memory optimization
- Better error handling
- Intersection observer for performance
- Playground widget component