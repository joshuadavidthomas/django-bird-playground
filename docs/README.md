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
1. **Phase 1 (MVP):** Core functionality with data attributes
2. **Phase 2 (Complete):** Framework integration and production features
3. **Phase 3 (Advanced):** Interactive playground and optimizations

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

**Purpose:** Dynamic task list that grows as the project progresses.

**Key Sections:**
- **Project Setup & Planning** - Read docs, define Phase 1 tasks, set up development
- **Phase 1-3 Implementation** - Placeholder phases to fill out as work progresses
- **Documentation & Testing** - User guides, migration docs, validation
- **Release Preparation** - Performance testing, browser compatibility, packaging

**How It Works:**
- **Self-bootstrapping** - First task is to read docs and create detailed plan
- **Living, breathing document** - Add tasks freely, remove obsolete items, check off when actually implemented
- **Constantly evolving** - Structure changes as implementation challenges are discovered
- **Dynamic progress tracking** - Reflects actual project state, not wishful thinking

**Who Should Read:** Anyone actively working on Django Playground implementation.

**Status:** 🚀 **Active** - Ready to track project progress

## Quick Start (For Developers)

If you're implementing Django Playground:

1. **Read [DESIGN_DOC.md](./DESIGN_DOC.md)** to understand what you're building
2. **Review [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** for technical architecture  
3. **Study [MIGRATION_STRATEGY.md](./MIGRATION_STRATEGY.md)** to understand changes needed
4. **Check [CHECKLIST.md](./CHECKLIST.md)** for current tasks and add detailed Phase 1 items
5. **Use [ONBOARDING_PROMPT.md](./ONBOARDING_PROMPT.md)** to onboard new LLM conversations
6. **Start with the first unchecked items** in the checklist

## Working with LLMs

**Use subagents to orchestrate complex work:**

- **Delegate research tasks** - "Analyze the current codebase structure"
- **Parallel development** - "Create React integration while working on Vue"
- **Specialized analysis** - "Evaluate memory management strategies"
- **Independent implementation** - "Build DOM scanning based on these specs"
- **Documentation creation** - "Write user examples for each framework"

**Coordinate multiple subagents for:**
- Building framework integrations simultaneously
- Research + implementation of the same feature
- Creating comprehensive test coverage
- Analyzing alternative architectural approaches

This complex project benefits from parallel work streams that subagents can handle independently.

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

- ✅ **Design Complete** - API, implementation plan, and migration strategy documented
- 🔄 **Implementation In Progress** - Building on existing Pyodide worker foundation
- ⏳ **Testing Planned** - Real-world documentation sites and framework integration
- ⏳ **Documentation Planned** - User guides and framework-specific examples

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