# Django Playground - Ideal API Documentation

> Django template rendering in the browser - from simple one-liners to full interactive playgrounds

## Quick Start

### CDN Usage (Zero Config)

```html
<script src="https://cdn.jsdelivr.net/npm/django-playground@latest/dist/django-playground.min.js"></script>
<script>
  // Render a simple template
  DjangoPlayground.render(`Hello {{ name }}!`, { name: 'World' })
    .then(html => document.getElementById('output').innerHTML = html);
</script>
```

### NPM Installation

```bash
npm install django-playground
```

```javascript
import { render } from 'django-playground';

// Simple template rendering
const html = await render(`Hello {{ user.name }}!`, { 
  user: { name: 'Alice' } 
});
```

## Use Cases

### 1. Documentation Sites (Sphinx, MkDocs)

#### Markdown Code Blocks
```markdown
```django-template
<h1>Welcome {{ user.name }}!</h1>
<p>You have {{ messages|length }} new messages:</p>
<ul>
{% for message in messages %}
  <li>{{ message.subject }} - {{ message.date|date:"M d" }}</li>
{% endfor %}
</ul>
```

Context:
```yaml
user:
  name: "Alice"
messages:
  - subject: "Welcome"
    date: "2024-01-15"
  - subject: "Update"
    date: "2024-01-16"
```
```

#### HTML Integration
```html
<!-- In your documentation HTML -->
<div data-django-template='{"user": {"name": "Alice"}}'>
  Hello {{ user.name }}! Today is {% now "Y-m-d" %}.
</div>

<script>
  // Auto-render all templates on page load
  DjangoPlayground.autoRender();
</script>
```

### 2. Static Site Generators

#### Astro Component
```astro
---
// components/DjangoExample.astro
import { render } from 'django-playground/server';

export interface Props {
  template: string;
  context?: Record<string, any>;
  live?: boolean;
}

const { template, context = {}, live = false } = Astro.props;
const html = live ? '' : await render(template, context);
---

<div class="django-example">
  {live ? (
    <div data-django-live data-template={template} data-context={JSON.stringify(context)}></div>
    <script>
      import { renderLive } from 'django-playground/client';
      renderLive();
    </script>
  ) : (
    <div set:html={html} />
  )}
</div>
```

#### Eleventy Shortcode
```javascript
// .eleventy.js
const { render } = require('django-playground/server');

module.exports = function(eleventyConfig) {
  eleventyConfig.addAsyncShortcode("django", async function(template, context) {
    return await render(template, context || {});
  });
};
```

```markdown
<!-- In your Eleventy markdown -->
{% django "Hello {{ name }}!" %}{ "name": "World" }{% enddango %}
```

### 3. Interactive Playgrounds

#### Simple Interactive Example
```html
<textarea id="template">Hello {{ name }}!</textarea>
<textarea id="context">{"name": "World"}</textarea>
<button onclick="renderExample()">Render</button>
<div id="output"></div>

<script>
  async function renderExample() {
    const template = document.getElementById('template').value;
    const context = JSON.parse(document.getElementById('context').value);
    
    const html = await DjangoPlayground.render(template, context);
    document.getElementById('output').innerHTML = html;
  }
</script>
```

#### Full-Featured Playground
```javascript
import { createPlayground } from 'django-playground';

const playground = createPlayground({
  container: '#playground',
  packages: ['django-bird'], // Optional Django packages
  features: {
    codeEditor: true,
    livePreview: true,
    saveTemplates: true,
    shareUrls: true
  }
});

playground.loadExample('button-component');
```

## API Reference

### Core Functions

#### `render(template, context?, options?)`
Render a Django template with context.

```javascript
const html = await render(
  `Hello {{ user.name }}!`, 
  { user: { name: 'Alice' } },
  { 
    packages: ['django-bird'],
    timeout: 5000 
  }
);
```

#### `renderSync(template, context?)`
Synchronous rendering for pre-compiled templates.

```javascript
// Only works with simple templates (no custom tags/filters)
const html = renderSync(`Hello {{ name }}!`, { name: 'World' });
```

#### `compile(template, options?)`
Pre-compile a template for faster repeated rendering.

```javascript
const compiled = await compile(`Hello {{ user.name }}!`);
const html1 = compiled.render({ user: { name: 'Alice' } });
const html2 = compiled.render({ user: { name: 'Bob' } });
```

### Auto-Rendering

#### `autoRender(selector?)`
Automatically render templates found in the DOM.

```html
<div data-django-template='{"name": "World"}'>Hello {{ name }}!</div>
<script>
  DjangoPlayground.autoRender(); // Renders all [data-django-template] elements
</script>
```

#### `watch(selector?)`
Watch for DOM changes and auto-render new templates.

```javascript
DjangoPlayground.watch(); // Watch entire document
DjangoPlayground.watch('.django-content'); // Watch specific container
```

### Advanced Features

#### `createInstance(options)`
Create an isolated Django instance with custom configuration.

```javascript
const django = await createInstance({
  packages: ['django-bird', 'django-crispy-forms'],
  settings: {
    'USE_TZ': true,
    'TIME_ZONE': 'UTC'
  },
  templates: {
    'base.html': `<!DOCTYPE html><html>...</html>`
  }
});

const html = await django.render('{% extends "base.html" %}...');
```

#### Error Handling
```javascript
try {
  const html = await render(`{{ invalid.syntax }`);
} catch (error) {
  if (error.type === 'TemplateSyntaxError') {
    console.log(`Template error at line ${error.line}: ${error.message}`);
  }
}
```

## Framework Integrations

### React Component
```jsx
import { useDjango } from 'django-playground/react';

function DjangoExample({ template, context }) {
  const { html, loading, error } = useDjango(template, context);
  
  if (loading) return <div>Rendering...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

### Vue Component
```vue
<template>
  <div v-if="loading">Rendering...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else v-html="html"></div>
</template>

<script>
import { useDjango } from 'django-playground/vue';

export default {
  props: ['template', 'context'],
  setup(props) {
    return useDjango(() => props.template, () => props.context);
  }
}
</script>
```

### Svelte Component
```svelte
<script>
  import { render } from 'django-playground';
  
  export let template;
  export let context = {};
  
  $: htmlPromise = render(template, context);
</script>

{#await htmlPromise}
  <div>Rendering...</div>
{:then html}
  {@html html}
{:catch error}
  <div>Error: {error.message}</div>
{/await}
```

## Configuration

### Global Configuration
```javascript
DjangoPlayground.configure({
  // CDN for Pyodide (defaults to jsdelivr)
  pyodideCdn: 'https://cdn.jsdelivr.net/pyodide/',
  
  // Default packages to install
  defaultPackages: ['django-bird'],
  
  // Cache compiled templates
  cacheTemplates: true,
  
  // Development mode (more verbose errors)
  debug: process.env.NODE_ENV === 'development'
});
```

### Environment Detection
```javascript
// Automatically configures based on environment
if (typeof window === 'undefined') {
  // Node.js - use server-side rendering
  import('django-playground/server');
} else {
  // Browser - use client-side rendering
  import('django-playground/client');
}
```

## Examples

### Documentation Example
```html
<!DOCTYPE html>
<html>
<head>
  <title>Django Template Guide</title>
  <script src="https://cdn.jsdelivr.net/npm/django-playground@latest"></script>
</head>
<body>
  <h1>Django Template Syntax</h1>
  
  <h2>Variables</h2>
  <p>Use double curly braces to output variables:</p>
  
  <div data-django-template='{"name": "Alice", "age": 30}'>
    <p>Name: {{ name }}</p>
    <p>Age: {{ age }}</p>
  </div>
  
  <h2>Filters</h2>
  <p>Apply filters to modify output:</p>
  
  <div data-django-template='{"name": "alice", "items": ["apple", "banana"]}'>
    <p>Capitalized: {{ name|capfirst }}</p>
    <p>Count: {{ items|length }} items</p>
  </div>
  
  <script>
    DjangoPlayground.autoRender();
  </script>
</body>
</html>
```

### Component Library Documentation
```html
<h1>Button Component</h1>

<div class="example">
  <h3>Primary Button</h3>
  <div data-django-template='{}' data-django-packages='["django-bird"]'>
    {% bird button variant="primary" %}
      Click me!
    {% endbird %}
  </div>
</div>

<div class="example">
  <h3>Secondary Button</h3>
  <div data-django-template='{}' data-django-packages='["django-bird"]'>
    {% bird button variant="secondary" size="large" %}
      Large Button
    {% endbird %}
  </div>
</div>
```

## Performance Notes

- First render initializes Pyodide (~2-3 seconds)
- Subsequent renders are fast (~10-50ms)
- Templates are cached by default
- Use `renderSync()` for simple templates (no Django packages required)
- Consider server-side pre-rendering for static sites

## Browser Support

- Modern browsers with Web Workers support
- Chrome 69+, Firefox 69+, Safari 12+, Edge 79+
- Graceful fallback for unsupported browsers