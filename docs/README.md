# Django Playground - Design Documentation

> **Client-side Django template rendering for documentation and education**

## Project Overview

Django Playground enables live Django template examples in documentation sites instead of static code blocks. It runs Django templates in the browser using Pyodide, making it perfect for:

- **Django package documentation** (django-bird, django-crispy-forms, etc.)
- **Django learning tutorials** with interactive examples
- **Template syntax documentation** with live demos
- **Component library showcases** with editable examples
- **Interactive Django playgrounds** (CodeSandbox-style tools)

### Key Goals

1. **Documentation-First Design** - Optimized for docs authors who want to add live Django examples
2. **Simple Declarative API** - Add `data-django-template` attributes and call `DjangoPlayground.init()`
3. **Memory Efficient** - Single shared Django instance for multiple examples per page
4. **Framework Agnostic** - Works with static HTML, React, Vue, Astro, 11ty, etc.
5. **Honest About Constraints** - ~10 second load time, ~100MB memory, modern browsers only

### Performance Reality

- **Initial load:** ~10 seconds (Pyodide + Django initialization)
- **Subsequent renders:** ~100-500ms per template  
- **Memory usage:** ~100MB for Django instance
- **Target:** Documentation sites, not production applications

## Documentation Structure

This `docs/` directory contains the complete design and implementation strategy:

### **[DESIGN_DOC.md](./DESIGN_DOC.md)** 📋 *Idealized User API Design*

**Purpose:** Defines the complete external API that users will interact with.

**Key Sections:**
- **Simple Declarative API** - `data-django-template` attributes for docs authors
- **Programmatic API** - `DjangoPlayground.init()`, `render()`, `createPlayground()`
- **Framework Integration** - React hooks, Vue composables, Astro components
- **Usage Patterns** - Documentation sites, package docs, interactive tutorials
- **Error Handling** - Graceful failures that don't break documentation
- **Memory Management** - Cleanup APIs and shared instance efficiency

**Who Should Read:** Anyone implementing or using Django Playground - docs authors, framework developers, education platform builders.

**Status:** ✅ **Complete** - Idealized target design ready for implementation

### **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** 🏗️ *Technical Implementation Strategy*

**Purpose:** Detailed technical plan for how to build the API defined above.

**Key Sections:**
- **Core Architecture** - Singleton pattern with shared Django instance
- **Package Collection Strategy** - Scan page for all needed packages, install once
- **Data Attribute Processing** - DOM scanning and batch rendering
- **Worker Communication** - Extend existing Pyodide worker with batch operations
- **Framework Integration Patterns** - How to build React/Vue hooks properly
- **Memory Management** - LRU template caching and cleanup strategies
- **Performance Monitoring** - Built-in stats and budget warnings

**Implementation Phases:**
1. **Phase 1 (Complete):** Core singleton architecture, DOM scanning, batch package installation ✅
2. **Phase 2 (Active):** Validation testing with real Django templates and packages 🔄
3. **Phase 3 (Planned):** Framework integrations (React/Vue) and interactive playground features ⏳

**Who Should Read:** Developers implementing Django Playground.

**Status:** ✅ **Complete** - Ready to guide implementation

### **[MIGRATION_STRATEGY.md](./MIGRATION_STRATEGY.md)** 🔄 *Current Code → Target Architecture*

**Purpose:** Analysis of existing codebase and strategy for migrating to the target API.

**Key Sections:**
- **Current Implementation Analysis** - What exists now (instance-based, manual worker management)
- **Migration Assessment** - What to keep vs. what to refactor vs. what to remove
- **File-by-File Strategy** - Specific changes needed for each source file
- **Risk Assessment** - Low/medium/high risk changes and mitigation strategies
- **Testing Strategy** - How to safely migrate without breaking existing functionality

**Key Findings:**
- ✅ **Strong Foundation** - Worker communication, Django setup, progress reporting all excellent
- 🔄 **Major Architectural Shift** - Instance-based → Singleton pattern  
- 🆕 **New Functionality** - DOM scanning, batch package installation, framework hooks
- ❌ **Remove Template Save/Load** - Pivot from playground to documentation focus

**Who Should Read:** Developers familiar with the current codebase planning the migration.

**Status:** ✅ **Complete** - Ready to guide migration work

### **[CHECKLIST.md](./CHECKLIST.md)** ✅ *Living Project Tracker*

**Purpose:** Dynamic task list tracking implementation progress across all phases.

**Key Sections:**
- **Phase 1 (Complete)** - Core architecture implementation ✅
- **Phase 2 (Active)** - Validation with real Django templates and packages 🔄
- **Phase 3 (Planned)** - Framework integrations and advanced features ⏳
- **Documentation & Testing** - User guides, validation results, performance testing

**Current Focus:**
- **Validation-First Approach** - Testing core functionality before adding framework features
- **Real-World Testing** - Django templates, third-party packages, error handling
- **Performance Validation** - Memory usage, render times, initialization benchmarks
- **API Refinement** - Based on validation findings and real usage patterns

**Who Should Read:** Anyone actively working on Django Playground implementation.

**Status:** 🔄 **Phase 2 Active** - Validation and testing in progress

## Quick Start (For Developers)

**Current Priority: Phase 2 Validation**

If you're contributing to Django Playground:

1. **Start with [CHECKLIST.md](./CHECKLIST.md)** - Focus on Phase 2 validation tasks currently in progress
2. **Review [DESIGN_DOC.md](./DESIGN_DOC.md)** to understand the target API being validated
3. **Check [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** for technical architecture context
4. **Validation Focus Areas:**
   - Test core singleton architecture with real Django templates
   - Validate batch package installation with django-bird, django-crispy-forms
   - Measure performance (initialization time, memory usage, render speed)
   - Test error handling and edge cases
5. **Use [ONBOARDING_PROMPT.md](./ONBOARDING_PROMPT.md)** to onboard new LLM conversations
6. **Document validation findings** to guide Phase 3 planning

## Working with LLMs

**Current Phase 2 Focus - Use subagents for validation tasks:**

- **Validation testing** - "Test core API with complex Django templates"
- **Performance benchmarking** - "Measure initialization time and memory usage patterns"
- **Package integration testing** - "Validate django-bird and django-crispy-forms installation"
- **Error handling validation** - "Test template syntax errors and package conflicts"
- **Real-world scenario testing** - "Test with actual documentation site HTML structures"

**Coordinate multiple subagents for:**
- Parallel validation of different Django packages
- Performance testing across different browser environments  
- Creating comprehensive validation test cases
- Documenting validation findings and edge cases

**Future Phase 3 Focus:**
- Building framework integrations simultaneously (React, Vue, Astro)
- Research + implementation of interactive playground features
- Creating user documentation and framework-specific examples

## Quick Start (For Users)

If you want to add live Django examples to your documentation:

```html
<!-- Add the library -->
<script src="https://cdn.jsdelivr.net/npm/django-playground@1.0.0"></script>

<!-- Add live Django template examples -->
<div data-django-template='{"name": "Alice"}'>
  Hello {{ name }}! Today is {% now "Y-m-d" %}.
</div>

<div data-django-template='{}' data-django-packages='["django-bird"]'>
  {% load django_bird %}
  {% bird button variant="primary" %}Click me!{% endbird %}
</div>

<!-- Initialize once per page -->
<script>DjangoPlayground.init();</script>
```

See [DESIGN_DOC.md](./DESIGN_DOC.md) for complete usage documentation.

## Phase 2 Validation Approach

**Why Validation Before Framework Integration:**
- **Validate core architecture** - Ensure singleton pattern and DOM scanning work reliably
- **Test real-world packages** - django-bird, django-crispy-forms, django-tables2
- **Measure actual performance** - Initialization time, memory usage, render speeds
- **Identify edge cases** - Error handling, package conflicts, template syntax issues
- **Refine API based on findings** - Adjust before framework integrations lock in patterns

**Key Validation Areas:**
1. **Template Rendering** - Complex Django templates with filters, tags, inheritance
2. **Package Installation** - Third-party Django packages with dependencies
3. **Performance Benchmarks** - Memory usage patterns and render time consistency
4. **Error Handling** - Template syntax errors, missing packages, initialization failures
5. **DOM Integration** - Data attribute processing across different HTML structures

**Success Criteria for Phase 2:**
- ✅ Reliable initialization under 15 seconds
- ✅ Stable memory usage under 150MB for typical documentation sites
- ✅ Consistent template rendering with common Django packages
- ✅ Graceful error handling that doesn't break documentation pages
- ✅ DOM scanning works with complex nested structures and multiple examples

## Architecture Decisions

### Why Singleton Pattern?
- **Memory efficiency** - One Django instance shared across all examples
- **Predictable performance** - One initialization, then fast renders
- **Simple for docs authors** - Just call `init()` once

### Why Data Attributes?
- **Declarative** - Perfect for documentation markup
- **Framework agnostic** - Works with any static site generator
- **Progressive enhancement** - Graceful fallback for non-JS environments

### Why Shared Package Installation?
- **Performance** - Install all packages once upfront vs. per-example
- **Predictable** - Clear initialization phase vs. unpredictable lazy loading
- **Simple** - Documentation authors don't think about package management

### Why Documentation-First?
- **Clear use case** - Interactive examples for Django docs/tutorials
- **Performance acceptable** - 10-second load time OK for educational content
- **Memory acceptable** - 100MB for rich Django examples in documentation

## Development Status

- ✅ **Phase 1 Complete** - Core singleton architecture, DOM scanning, and batch package installation implemented
- 🔄 **Phase 2 Validation In Progress** - Testing core functionality with real Django templates and packages
- ⏳ **Phase 3 Planned** - Framework integrations (React/Vue hooks) and interactive playground features
- ⏳ **User Documentation Planned** - Comprehensive guides and framework-specific examples

## Contributing

When implementing or modifying Django Playground:

1. **API changes** - Update [DESIGN_DOC.md](./DESIGN_DOC.md)
2. **Implementation changes** - Update [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)  
3. **Migration strategy changes** - Update [MIGRATION_STRATEGY.md](./MIGRATION_STRATEGY.md)
4. **Task updates** - Keep [CHECKLIST.md](./CHECKLIST.md) current with actual progress
5. **Keep docs in sync** - These documents should always reflect current thinking
6. **Add new docs** - Create additional documents (TESTING_STRATEGY.md, etc.) as needed

## Code Architecture Flexibility

**The current `src/` structure is just a starting point:**

```
src/
├── django.ts                # Current implementation (will be replaced)
├── index.ts                 # Simple re-export (will evolve)
├── types.ts                 # Type definitions (will expand)
└── worker/
    ├── pyodide.worker.ts    # Worker implementation (will be extended)
    └── vite-env.d.ts        # Environment types
```

**As implementation progresses, feel free to:**

- **Create new directories** (`src/integrations/`, `src/utils/`, `src/playground/`)
- **Split large files** (`django-playground.ts` → core + dom-scanner + package-manager)
- **Add framework-specific modules** (`src/integrations/react.ts`, `src/integrations/vue.ts`)
- **Reorganize structure** to match actual architecture that emerges
- **Move/rename files** as responsibilities become clearer

**Examples of likely evolution:**
```
src/
├── core/
│   ├── django-playground.ts     # Main singleton class
│   ├── dom-scanner.ts           # Data attribute processing
│   └── package-manager.ts       # Batch package installation
├── integrations/
│   ├── react.ts                 # React hooks
│   ├── vue.ts                   # Vue composables
│   └── astro.ts                 # Astro components
├── playground/
│   ├── widget.ts                # Interactive playground
│   └── editors.ts               # Code/context editors
└── worker/
    └── pyodide.worker.ts        # Enhanced worker
```

**The code structure should evolve naturally - don't force it into the current layout.**

---

**This documentation represents the complete design and implementation strategy for Django Playground - a client-side Django template rendering system optimized for documentation and education.**