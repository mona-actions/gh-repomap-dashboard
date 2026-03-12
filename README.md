# gh-repomap-dashboard

A modern web dashboard for visualizing inter-repository dependency graphs produced by [gh-repo-map](https://github.com/mona-actions/gh-repo-map). Designed for enterprise scale — handles 10,000+ repositories across multiple GitHub organizations.

## Features

- 📊 **Overview Dashboard** — Stats, dependency type distribution, critical repos at a glance
- 🔍 **Searchable Repo List** — Virtualized table with sorting, filtering, and keyboard navigation
- 🌐 **Interactive Dependency Graph** — WebGL-powered (Sigma.js) visualization with zoom, pan, and highlighting
- 🎯 **Smart Filtering** — Filter by org, dependency type, confidence level, cluster, and free-text search
- 📋 **Repo Detail Panel** — Drill into direct, transitive, and reverse dependencies
- 💡 **Insights** — Critical repos, circular dependencies, orphan repos, cluster explorer
- 📤 **Export** — Share filtered views via URL, export as JSON or CSV
- 🌓 **Dark Mode** — Full Primer design system integration
- ♿ **Accessible** — WCAG 2.1 AA, keyboard navigation, screen reader support

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 and upload a `gh-repo-map` JSON file.

## Usage

1. Generate a dependency map: `gh repo-map --orgs my-org --output repomap.json`
2. Open the dashboard and upload the JSON file (drag-and-drop or file picker)
3. Explore the dependency graph, filter by org/type, and drill into individual repos

For split files (per-org mode), upload all files at once — they'll be automatically merged.

## Tech Stack

- React 18 + TypeScript (strict mode)
- GitHub Primer Design System (@primer/react)
- Sigma.js v3 + Graphology (WebGL graph visualization)
- Zustand (state management with URL sync)
- Zod (runtime schema validation)
- Vite (build tooling)
- Vitest + React Testing Library (testing)

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run tests
npm run test:watch   # Watch mode
npm run lint         # Lint
npm run typecheck    # Type check
```

### Generating Test Fixtures

```bash
npx tsx src/test/fixtures/generate.ts
```

Generates `small.json` (50 repos), `medium.json` (1K repos), and `edge-cases.json` fixtures.

## Architecture

Static SPA with zero backend. Users upload JSON files directly in the browser.

- **Data pipeline**: File → Web Worker (parse + validate + build graph) → Zustand store
- **Graph engine**: Graphology (data model) + Sigma.js (WebGL rendering)
- **Filtering**: Toggling hidden attributes on graph nodes/edges (no rebuild)
- **Scale**: Tested with 10K+ repos, virtualized lists, WebGL rendering

## License

MIT
