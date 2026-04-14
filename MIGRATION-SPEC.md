# Migration Spec — TypeScript + Vite + Markdown-first

**Status:** Phase 5 complete — Migration done ✅  
**Date:** April 2026

---

## Goals

1. `.md` files in `notes/` are the **single source of truth** — nothing is authored in `index.html`
2. Full TypeScript migration with strict mode
3. Note content is loaded **lazily at runtime** (no giant HTML payload on initial load)
4. Search index is built from **pre-generated metadata** at build time so full-text search still works offline without eagerly fetching all notes
5. Tests for all pure logic (utils, state, data transforms, search)
6. Same PWA + offline behaviour, same CSP posture

---

## Toolchain Decision

### Bundler: **Vite**

| Tool     | Verdict   | Reason                                                                                                                           |
| -------- | --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Vite** | ✅ Chosen | Native TypeScript, dev server with HMR, static asset handling, Vitest integration, plugin ecosystem, production-optimised output |
| esbuild  | Skip      | Fast bundler but no dev server, no CSS handling, limited plugin model — would need manual orchestration                          |
| Turbo    | Skip      | TurboRepo is a monorepo task runner, not a bundler. Not the right layer here                                                     |

### Test runner: **Vitest**

- Same config and transforms as Vite — zero extra setup
- jsdom environment for DOM-dependent tests
- Compatible with Jest's API — easy to learn

### Markdown: **fetch at runtime + build-time search manifest**

- At runtime, each note's `.md` file is fetched via `fetch()` when first opened (Option A — lazy)
- At build time, a Vite plugin generates a `notes-manifest.json` containing all note metadata **plus pre-extracted plain text content** for Fuse.js (Option C — solves the search problem without eagerly loading all 37 files on startup)
- The manifest is a small static file (~50 KB gzipped) cached by the SW

This hybrid gives: lazy rendering + full-text search + offline support + no giant HTML file.

---

## Architecture After Migration

```
claude-code-docs/
├── notes/                        # Source of truth for all content
│   ├── 01-ai-fluency-framework.md
│   └── ...
├── src/                          # All app source (TypeScript)
│   ├── main.ts                   # Entry point
│   ├── types.ts                  # Shared interfaces
│   ├── data.ts                   # NOTES array (metadata only, no contentId)
│   ├── state.ts
│   ├── utils.ts
│   ├── render.ts
│   ├── navigation.ts
│   ├── search.ts
│   ├── ui.ts
│   ├── tts.ts
│   ├── tts-ui.ts
│   └── search.worker.ts
├── public/                       # Static assets copied as-is
│   ├── notes/                    # .md files served at /notes/*.md
│   ├── icons/
│   ├── vendor/
│   └── sw.js                     # Service worker (stays vanilla JS)
├── dist/                         # Build output (gitignored)
├── tests/                        # Vitest specs
│   ├── utils.test.ts
│   ├── state.test.ts
│   ├── search.test.ts
│   ├── data.test.ts
│   └── tts.test.ts
├── scripts/
│   └── build-manifest.ts         # Generates notes-manifest.json
├── index.html                    # Lean shell — no embedded content
├── vite.config.ts
├── tsconfig.json
├── package.json
└── serve.json
```

### Key type definitions (`src/types.ts`)

```typescript
export interface NoteMetadata {
  id: string; // "note-01"
  slug: string; // "01-ai-fluency-framework"
  emoji: string;
  title: string;
  tags: readonly string[];
}

export interface NoteSearchEntry extends NoteMetadata {
  content: string; // plain text stripped from markdown (for Fuse)
}

export interface NotesManifest {
  version: string; // content hash — used to bust SW cache
  notes: NoteSearchEntry[];
}

export interface AppState {
  activeNoteId: string | null;
  activeTagFilter: string | null;
  noteHistory: string[];
  historyIndex: number;
  isSearching: boolean;
  isNavigatingHistory: boolean;
  fuse: import("fuse.js").default<NoteSearchEntry> | null;
  sectionObserver: IntersectionObserver | null;
  noteContentCache: Map<string, string>; // slug → raw markdown
}
```

---

## The Manifest (`public/notes-manifest.json`)

Generated at build time by `scripts/build-manifest.ts`. Never edited by hand.

```json
{
  "version": "sha256-abc123",
  "notes": [
    {
      "id": "note-01",
      "slug": "01-ai-fluency-framework",
      "emoji": "🧠",
      "title": "AI Fluency Framework",
      "tags": ["4Ds", "delegation", ...],
      "content": "AI Fluency Framework What is AI Fluency The ability to work..."
    },
    ...
  ]
}
```

The `content` field is plain text (markdown stripped) used only by Fuse.js — not rendered.

---

## Note Loading Flow (Runtime)

```
App init
  ↓
fetch("/notes-manifest.json")          ← cached by SW, one small file
  ↓
Build Fuse index from manifest data    ← exactly the same as today
  ↓
User clicks a note
  ↓
noteContentCache.get(slug)?
  ├── hit  → render immediately
  └── miss → fetch("/notes/01-ai-fluency-framework.md")
               ↓
             parse front matter, render markdown
               ↓
             noteContentCache.set(slug, raw)   ← in-memory, survives nav
```

Notes are cached in memory for the session (no re-fetch). SW caches the `.md` files on first access for offline use.

---

## Service Worker Changes

`CORE_ASSETS` shrinks — no more `index.html` giant payload on every SW update.

```typescript
const CORE_ASSETS = [
  "./index.html",
  "./assets/main.js", // Vite output
  "./assets/style.css",
  "./notes-manifest.json", // NEW — needed immediately for search
  "./vendor/fuse.min.js",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg",
];
```

`.md` files are cached **on first access** (cache-then-network strategy), not pre-cached — keeps SW install fast.

---

## CSP Changes

`connect-src` must be updated to allow `fetch()` to same-origin resources:

```
connect-src 'self'    ← was 'none', changed to allow fetch(/notes/*.md)
```

This is safe — only same-origin fetches allowed, no external URLs.

---

## Migration Phases

### Phase 0 — Setup scaffolding

- [x] `npm init -y`
- [x] Install Vite, TypeScript, Vitest, jsdom, @types/\*
- [x] Create `vite.config.ts`, `tsconfig.json`
- [x] Set up `src/` folder, move `js/*.js` → `src/*.ts` (rename only, no logic changes yet)
- [x] Update `index.html` to point to `src/main.ts`
- [x] Verify app builds and runs under Vite dev server — no behavioural changes

**Exit criterion:** `npm run dev` serves a working app identical to today. ✅

---

### Phase 1 — Type-safe codebase

- [x] Add type annotations to all files (strict mode, no `any`)
- [x] Extract shared interfaces into `src/types.ts`
- [x] Fix all TypeScript errors
- [x] `getNoteContent()` stays as-is for now (still reads from DOM) — no behaviour change
- [x] Add `"noEmit": true` type-check step to CI
- [x] Replace CDN-loaded `marked`, `dompurify`, `highlight.js` with npm packages
- [x] Remove CDN `<script>` tags from `index.html`; tighten CSP to `'self'` only
- [x] Create missing `.md` files for notes 17–20 (content-17 → content-20)

**Exit criterion:** `tsc --noEmit` passes with zero errors. ✅

---

### Phase 2 — Build-time manifest

- [x] Write `scripts/build-manifest.ts`:
  - Reads all `.md` files from `notes/`
  - Parses YAML front matter (title, tags, emoji)
  - Strips markdown syntax to plain text for Fuse content field
  - Writes `public/notes-manifest.json`
  - Computes a content hash for SW cache busting
- [x] Add `"predev": "tsx scripts/build-manifest.ts"` and `"build:manifest"` to `package.json` scripts
- [x] Remove `contentId` from `data.ts`; derive `NOTES` + `SEARCH_ENTRIES` from the manifest at runtime instead
- [x] Verify manifest-driven sidebar, search, tag filter — identical to today

**Exit criterion:** `notes/*.md` edits are reflected after `npm run build`, with no changes to `index.html`. ✅

---

### Phase 3 — Lazy note loading

- [x] Change `navigation.ts#showNote()` to `async`
- [x] Add `noteContentCache: Map<string, string>` to AppState
- [x] Implement `fetchNote(slug): Promise<string>` — fetches `/notes/{slug}.md`, populates cache
- [x] Add loading state to note view (skeleton or spinner) shown during fetch
- [x] Remove all `<script type="text/markdown">` blocks from `index.html`
- [x] Update CSP: `connect-src 'none'` → `connect-src 'self'`
- [x] Update SW: add cache-on-access strategy for `/notes/*.md`

**Exit criterion:** `index.html` < 200 lines. All notes render correctly. App works offline after each note has been opened once.

---

### Phase 4 — Tests

- [x] `utils.test.ts` — `readingTime`, `slugify`, `parseFrontMatter`, `scoreRelatedness`
- [x] `state.test.ts` — `setState`, `getState`, `getFilteredNotes`, history logic
- [x] `search.test.ts` — index building, search results, tag filtering
- [x] `data.test.ts` — every note in NOTES has a matching `.md` file; no duplicate IDs
- [x] `tts.test.ts` — `extractSpeechContent`, `normalizeForSpeech`, sentence splitting

**Exit criterion:** `npm test` passes, coverage > 80% on `utils.ts`, `state.ts`, `search.ts`.

---

### Phase 5 — PWA hardening & deploy

- [x] Bump `CACHE_VERSION` in `sw.js` automatically from manifest version hash
- [x] Add `public/notes/*.md` symlink or copy step so Vite serves them under `/notes/`
- [x] Verify offline mode: load app, disconnect network, navigate all cached notes
- [x] Update `serve.json` CSP header to match in-HTML meta tag
- [x] Run Lighthouse PWA audit — target 100

**Exit criterion:** Lighthouse PWA score 100. App installable. Offline works fully.

---

## `package.json` Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build:manifest": "tsx scripts/build-manifest.ts",
    "build": "npm run build:manifest && tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## Dependencies

```json
{
  "devDependencies": {
    "vite": "^6.x",
    "vitest": "^3.x",
    "jsdom": "^26.x",
    "@vitest/coverage-v8": "^3.x",
    "typescript": "^5.x",
    "tsx": "^4.x",
    "@types/dompurify": "^3.x",
    "fuse.js": "^7.x"
  }
}
```

> `fuse.js` moves from vendored `/vendor/fuse.min.js` to an npm package — Vite tree-shakes it properly.  
> `marked`, `dompurify`, `highlight.js` also moved to npm packages in Phase 1 — CDN dependencies fully removed.

---

## Out of Scope

- Service worker rewrite — SW stays in vanilla JS (no Workbox) until there is a clear reason to change it
- Any UI redesign or feature additions
