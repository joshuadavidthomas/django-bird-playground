# django-bird-playground

An interactive web playground for building and testing [django-bird](https://github.com/joshuadavidthomas/django-bird) components.

> [!WARNING]
> **Early prototype/POC** - built quickly using Claude Code for experimentation.

## Getting Started

Visit [https://django-bird-playground.joshthomasdev.workers.dev](https://django-bird-playground.joshthomasdev.workers.dev) to try it out.

1. Choose an example component from the bottom of the page
2. Edit the HTML template, CSS, and JavaScript in the tabs
3. Click "Run Component" or press Ctrl+Enter to see your changes
4. Experiment with django-bird syntax and see real-time results

Uses Pyodide to run Django + django-bird in the browser with Shadow DOM isolation.

## Development

Install dependencies:

```bash
bun install
```

Start dev server:

```bash
bun run dev
```

Deploy to Cloudflare Workers:

```bash
bun run deploy
```

## License

django-bird-playground is licensed under the MIT license. See the [`LICENSE`](LICENSE) file for more information.
