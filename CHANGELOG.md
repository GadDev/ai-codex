# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

> Changes that are merged but not yet tagged in a release.

---

## [1.5.0] — 2026-04-14

### Added

- **Biome** — linter and formatter replacing any ad-hoc style tooling (`biome.json`, `lint`, `lint:fix`, `format` npm scripts)
- `.gitignore` covering `dist/`, `node_modules/`, `coverage/`, `.env*`, editor artefacts
- `CHANGELOG.md`, `CONTRIBUTORS.md`, `CODE_OF_CONDUCT.md`
- Restructured `README.md` to meet open-source project standards (badges, structured sections, contributing/license links)

### Changed

- Fixed all Biome lint errors: missing `type="button"` on two `<button>` elements, `forEach` callbacks with implicit returns across `navigation.ts`, `render.ts`, `tts.ts`, `ui.ts`
- Removed unused variable destructuring in `tests/data.test.ts`

---

## [1.4.0] — 2026-04-12

### Added

- **Phase 5 — PWA hardening**: `CACHE_VERSION` in `sw.js` is now auto-patched by `scripts/build-manifest.ts` from the manifest content hash — no manual version bumps required
- Stale-while-revalidate cache strategy for `/notes/*.md` in the Service Worker
- Updated `serve.json` CSP header to match the in-HTML `<meta http-equiv>` tag (`connect-src 'self'`)

### Changed

- `CORE_ASSETS` list in `sw.js` stripped of Vite-hashed paths which are now cached on first access

---

## [1.3.0] — 2026-04-10

### Added

- **Phase 4 — Tests**: full Vitest suite (104 tests across 5 files)
  - `utils.test.ts` — `readingTime`, `slugify`, `parseFrontMatter`, `scoreRelatedness`
  - `state.test.ts` — `setState`, `getState`, `getFilteredNotes`, history logic
  - `search.test.ts` — index building, search results, tag filtering
  - `data.test.ts` — manifest integrity checks, no duplicate IDs
  - `tts.test.ts` — `extractSpeechContent`, `normalizeForSpeech`, sentence splitting
- `@vitest/coverage-v8` coverage provider; coverage excludes `src/main.ts`

---

## [1.2.0] — 2026-04-08

### Added

- **Phase 3 — Lazy note loading**: notes are fetched via `fetch("/notes/{slug}.md")` on first open and cached in `noteContentCache` (an in-memory `Map` on `AppState`)
- Loading skeleton shown during fetch
- `public/notes/` copies of all `.md` files so Vite dev server and production build serve them at `/notes/*`
- Notes 17–37 added to the curriculum

### Changed

- `src/navigation.ts#showNote()` is now `async`
- CSP updated from `connect-src 'none'` to `connect-src 'self'`
- All `<script type="text/markdown">` blocks removed from `index.html` (now < 200 lines)

---

## [1.1.0] — 2026-04-05

### Added

- **Phase 2 — Build-time manifest**: `scripts/build-manifest.ts` generates `public/notes-manifest.json` with note metadata and plain-text content for Fuse.js
- `predev` and `build:manifest` npm scripts
- `NOTES` and `SEARCH_ENTRIES` derived from the manifest at runtime (`src/data.ts`)

### Removed

- `contentId` field from note metadata in `data.ts`

---

## [1.0.0] — 2026-04-01

### Added

- **Phase 0 — Scaffold**: Vite 6, TypeScript 5 (strict mode), Vitest 3, jsdom
- `vite.config.ts`, `tsconfig.json`, `src/` folder structure
- **Phase 1 — Type-safe codebase**: all modules migrated from vanilla JS to TypeScript with zero `any` escapes; shared interfaces in `src/types.ts`
- `marked`, `highlight.js`, `DOMPurify` moved from CDN to npm packages; CDN `<script>` tags removed
- CSP tightened to `script-src 'self'` (no CDN allowlist)
- Text-to-speech engine (`src/tts.ts`, `src/tts-ui.ts`)
- Dark/light theme toggle
- Collapsible sections, table of contents with scroll-spy, related notes panel
- Web Worker for non-blocking Fuse.js index construction (`src/search.worker.ts`)
- Notes 01–16 covering the core Claude and AI development curriculum

---

[Unreleased]: https://github.com/your-username/claude-code-docs/compare/v1.5.0...HEAD
[1.5.0]: https://github.com/your-username/claude-code-docs/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/your-username/claude-code-docs/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/your-username/claude-code-docs/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/your-username/claude-code-docs/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/your-username/claude-code-docs/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/your-username/claude-code-docs/releases/tag/v1.0.0
