<div align="center">

# AI Codex

**A modern, offline-first PWA for exploring AI & Claude development notes.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-3.x-6e9f18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Biome](https://img.shields.io/badge/Biome-2.x-60a5fa?logo=biome&logoColor=white)](https://biomejs.dev/)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)

[Getting Started](#getting-started) · [Architecture](#architecture) · [PWA & Offline](#pwa--offline) · [Security](#security) · [Contributing](CONTRIBUTORS.md) · [Changelog](CHANGELOG.md)

</div>

---

## Overview

37 structured Markdown notes covering the Claude and AI development ecosystem, served by a fast TypeScript + Vite single-page app. Notes are the single source of truth — the app shell stays lean and fetches content lazily at runtime. Full-text search works immediately from a build-time manifest, and every visited note is cached for offline access.

## What's in this repo

```
ai-codex/
├── notes/                        ← Source of truth — 37 Markdown course notes
├── src/                          ← TypeScript app source
│   ├── main.ts                   ← Entry point
│   ├── types.ts                  ← Shared interfaces
│   ├── data.ts                   ← NOTES array (derived from manifest at runtime)
│   ├── state.ts                  ← App state management
│   ├── utils.ts                  ← Pure helpers (reading time, slugify, etc.)
│   ├── render.ts                 ← DOM rendering (nav, content, welcome grid)
│   ├── navigation.ts             ← Note navigation and history
│   ├── search.ts                 ← Fuse.js integration
│   ├── search.worker.ts          ← Web Worker: builds search index off main thread
│   ├── ui.ts                     ← UI interactions (theme, keyboard, tags)
│   ├── tts.ts                    ← Text-to-speech engine
│   └── tts-ui.ts                 ← TTS controls UI
├── public/                       ← Static assets served as-is
│   ├── notes/                    ← .md files served at /notes/*.md (for runtime fetch)
│   ├── icons/                    ← PWA icons (SVG, 192 × 192 and 512 × 512)
│   ├── manifest.json             ← PWA manifest
│   ├── notes-manifest.json       ← Build-time generated search index + metadata
│   └── sw.js                     ← Service worker (vanilla JS)
├── tests/                        ← Vitest specs
├── scripts/
│   └── build-manifest.ts         ← Generates notes-manifest.json at build time
├── dist/                         ← Vite build output (gitignored)
├── index.html                    ← Lean app shell
├── style.css                     ← App styles
├── vite.config.ts
├── tsconfig.json
├── biome.json
├── package.json
├── serve.json                    ← CSP + security headers for `npx serve`
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTORS.md
└── SECURITY.md
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10

### Installation

```bash
git clone https://github.com/your-username/ai-codex.git
cd ai-codex
npm install
```

### Development

```bash
npm run dev
# → http://localhost:5173 with HMR
```

The manifest is auto-generated before the dev server starts. Any change to a `.md` file in `notes/` is reflected after restarting the dev server.

### Production Build

```bash
npm run build
# → dist/
```

### Preview the Build

```bash
npm run preview
# → http://localhost:4173
```

### Install as a PWA

Service workers require HTTP/HTTPS. Build the app and serve the output:

```bash
npm run build
npx serve dist/
# Open http://localhost:3000 → click the install icon in the address bar
```

All notes are cached after first access. Subsequent loads work fully offline.

---

## Features

| Feature                | Details                                                       |
| ---------------------- | ------------------------------------------------------------- |
| 37 structured notes    | Progressive learning path through the Claude and AI ecosystem |
| Fuzzy full-text search | Fuse.js index built on a Web Worker — non-blocking            |
| Lazy note loading      | Notes are fetched on demand and cached in memory              |
| Collapsible sections   | Auto-generated from heading structure                         |
| Table of contents      | In-page navigation with scroll-spy                            |
| Related notes panel    | Surfaced by tag and content similarity                        |
| Text-to-speech         | Built-in TTS reader with rate and voice controls              |
| Dark / light theme     | Persisted across sessions                                     |
| Offline PWA            | Installable; all visited notes cached by the Service Worker   |

---

## npm Scripts

| Script               | Description                                               |
| -------------------- | --------------------------------------------------------- |
| `npm run dev`        | Start Vite dev server with HMR (generates manifest first) |
| `npm run build`      | Generate manifest → type-check → Vite production build    |
| `npm run preview`    | Preview the production build locally                      |
| `npm test`           | Run the full Vitest suite (104 tests)                     |
| `npm run test:watch` | Run tests in watch mode                                   |
| `npm run typecheck`  | Type-check with `tsc --noEmit`                            |
| `npm run lint`       | Biome — check linting and formatting                      |
| `npm run lint:fix`   | Biome — auto-fix lint and formatting                      |
| `npm run format`     | Biome — format all files                                  |

---

## Architecture

### Note Loading Flow

Notes are fetched lazily — only when a user opens them. The search index is populated from a pre-built manifest so search is available immediately without loading all 37 files at startup.

```
App init
  ↓
fetch("/notes-manifest.json")       ← pre-cached by SW (~50 KB)
  ↓
Build Fuse.js index (Web Worker)    ← off the main thread, non-blocking
  ↓
User opens a note
  ↓
noteContentCache.get(slug)?
  ├── hit  → render immediately
  └── miss → fetch("/notes/{slug}.md")
               ↓
             parse front matter → render markdown → cache
```

### Build-time Manifest

`scripts/build-manifest.ts` runs before every dev/build. It reads all `.md` files, parses front matter, strips markdown to plain text for Fuse.js, and writes `public/notes-manifest.json`. The content hash auto-patches the `CACHE_VERSION` in the Service Worker — no manual bumps needed.

```jsonc
{
  "version": "sha256-abc123",
  "notes": [
    {
      "id": "note-01",
      "slug": "01-ai-fluency-framework",
      "emoji": "🧠",
      "title": "AI Fluency Framework",
      "tags": ["4Ds", "delegation"],
      "content": "Plain text for Fuse.js search index…",
    },
  ],
}
```

### Toolchain

| Tool                                             | Role                                            |
| ------------------------------------------------ | ----------------------------------------------- |
| [Vite 6](https://vitejs.dev/)                    | Dev server, bundler, sourcemaps                 |
| [TypeScript 5](https://www.typescriptlang.org/)  | Strict type-checking across all source files    |
| [Vitest 3](https://vitest.dev/)                  | Unit tests with jsdom environment               |
| [Biome 2](https://biomejs.dev/)                  | Linter + formatter (replaces ESLint + Prettier) |
| [marked](https://marked.js.org/)                 | Markdown → HTML rendering                       |
| [highlight.js](https://highlightjs.org/)         | Syntax highlighting                             |
| [DOMPurify](https://github.com/cure53/DOMPurify) | HTML sanitisation                               |
| [Fuse.js](https://www.fusejs.io/)                | Client-side fuzzy search                        |

---

## PWA & Offline

### Service Worker

Three-tier cache strategy — all dependencies are bundled locally, no CDN:

| Request type                                | Strategy                            | Why                                               |
| ------------------------------------------- | ----------------------------------- | ------------------------------------------------- |
| Core assets (`index.html`, manifest, icons) | Cache-first, pre-cached on install  | Stable; enables instant load                      |
| Vite-hashed JS/CSS bundles                  | Cache-first, cached on first access | Content-addressed — safe to cache indefinitely    |
| Note `.md` files                            | Stale-while-revalidate              | Serve from cache instantly; refresh in background |

### Web Worker

The Fuse.js search index is built on a background thread so the main thread stays responsive during startup. Falls back gracefully to main-thread indexing on unsupported browsers.

---

## Security

All runtime dependencies are npm packages bundled by Vite. There are no third-party CDN script tags and no Subresource Integrity hashes to maintain.

### Content Security Policy

Enforced via `serve.json` and mirrored in the `<meta http-equiv>` tag in `index.html`:

```
default-src 'self';
script-src  'self';
style-src   'self' 'unsafe-inline';
img-src     'self' data:;
font-src    'self';
connect-src 'self';
object-src  'none';
base-uri    'self';
frame-ancestors 'none';
```

| Directive         | Value                    | Rationale                           |
| ----------------- | ------------------------ | ----------------------------------- |
| `script-src`      | `'self'`                 | All JS bundled locally — no CDN     |
| `connect-src`     | `'self'`                 | Required for `fetch("/notes/*.md")` |
| `style-src`       | `'self' 'unsafe-inline'` | highlight.js applies inline styles  |
| `frame-ancestors` | `'none'`                 | Prevents clickjacking               |

See [SECURITY.md](SECURITY.md) for the full security posture and vulnerability reporting process.

---

## Notes Curriculum

37 notes covering a progressive learning path:

| #   | Topic                                          |
| --- | ---------------------------------------------- |
| 01  | AI Fluency Framework (Anthropic's 4Ds)         |
| 02  | AI/ML Technical Concepts                       |
| 03  | Prompt Engineering                             |
| 04  | Claude Code Basics                             |
| 05  | Claude Code Workflow                           |
| 06  | Custom Commands & MCP                          |
| 07  | Hooks & SDK                                    |
| 08  | Commands Glossary                              |
| 09  | Claude with Playwright                         |
| 10  | Screenshot Tools                               |
| 11  | Deep Learning Resources                        |
| 12  | Attention Is All You Need (Transformers paper) |
| 13  | Claude Models Guide                            |
| 14  | Prompt Templates                               |
| 15  | RAG (Retrieval-Augmented Generation)           |
| 16  | AI Agents                                      |
| 17  | The AI Landscape                               |
| 18  | AI Safety & Alignment                          |
| 19  | Embeddings & Vector Search                     |
| 20  | Multimodal AI                                  |
| 21  | Building a RAG App                             |
| 22  | AI Models Benchmark                            |
| 23  | Constitutional AI & RLHF                       |
| 24  | Embeddings & Vector Databases                  |
| 25  | AI Evaluation Benchmarks                       |
| 26  | AI Agents in Production                        |
| 27  | AI Safety Red Teaming                          |
| 28  | Fine-Tuning vs Prompting vs RAG                |
| 29  | LLM Frameworks Overview                        |
| 30  | AI App Security Checklist                      |
| 31  | Multimodal & Agentic Trends 2025–2026          |
| 32  | Future of AI Development                       |
| 33  | Claude Tool Use                                |
| 34  | Claude Vision & Multimodal                     |
| 35  | Claude Extended Thinking                       |
| 36  | Claude Projects & Memory                       |
| 37  | Claude API Cost Optimisation                   |

---

## Contributing

Contributions are welcome — whether that's fixing a bug, adding a note, or improving the app. Please read [CONTRIBUTORS.md](CONTRIBUTORS.md) before opening a pull request.

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a full history of releases and notable changes.

---

## License

Distributed under the [ISC License](LICENSE).

---

<div align="center">
  <sub>Built by Al · April 2026</sub>
</div>
