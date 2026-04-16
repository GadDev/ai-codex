# AI Codex — GitHub Copilot Instructions

## Project Overview

A TypeScript + Vite offline-first PWA for browsing AI/Claude development notes.
Key parts: `src/` (frontend modules), `scripts/agent/` (CLI ingestion pipeline), `notes/` (Markdown source of truth), `scripts/build-manifest.ts` (build-time manifest generator).

---

## TypeScript Standards

### Types and Interfaces

- Prefer **`interface`** for object shapes, **`type`** for unions, intersections, and aliases.
- Use **`readonly`** on all properties that are never mutated after construction.
- Avoid `any`. Use `unknown` with explicit narrowing. Never use type assertions (`as X`) without validating first.
- Keep types **co-located** with the code that owns them unless they are shared across modules — in that case, place them in `src/types.ts`.
- Write precise return types on all exported functions. Let TypeScript infer only for local variables.

### Module Design (SOLID)

- **Single Responsibility**: each module exports one cohesive concern. `fetch.ts` fetches, `sanitize.ts` sanitizes — no cross-cutting logic.
- **Open/Closed**: extend behaviour via parameters and composition, not by modifying existing functions.
- **Liskov**: subtypes and narrowed generics must honour the contract of their parent type.
- **Interface Segregation**: keep interfaces small. Split a broad interface before adding an optional property that only one consumer needs.
- **Dependency Inversion**: modules depend on types/interfaces, not concrete implementations. Pass dependencies as arguments.

### YAGNI & Simplicity

- Do **not** add abstractions, helpers, or utilities for one-off operations.
- Do **not** add optional parameters or config flags for hypothetical future callers.
- Do **not** over-engineer: if a plain function solves it, don't introduce a class.
- If two implementations are equally readable, choose the shorter one.

### Clean Code (Uncle Bob)

- Functions do **one thing** — if you need "and" in its name, split it.
- Limit function arguments to three; prefer a named-object parameter beyond two.
- Avoid boolean flags as function arguments — they signal a missing abstraction.
- Names should reveal **intent**: prefer `extractReadableText` over `process` or `handle`.
- No magic numbers or strings — name them as constants.
- Prefer **early returns** to deeply nested if/else blocks.

### Refactoring (Martin Fowler)

When improving existing code, apply these catalogue patterns explicitly:

- **Extract Function** — when a comment explains what a block does, the comment is the function name.
- **Inline Variable** — remove intermediary variables that add no clarity.
- **Replace Temp with Query** — replace a derived variable with a function returning the same value.
- **Decompose Conditional** — extract complex `if` predicates into clearly-named functions.
- **Replace Conditional with Polymorphism** — when a type tag drives branching across multiple places.
- **Introduce Parameter Object** — when 3+ related parameters travel together.
- **Move Function** — if a function uses more data from another module than its own, it belongs there.
- Never refactor and add features in the same commit. Separate the two.

### Error Handling

- Surface errors as typed values where possible (`Result`-style or discriminated unions for agent pipeline steps).
- Throw only for truly unexpected, unrecoverable conditions.
- Every `async` function either handles its rejection internally or documents that its caller must.
- Log errors at the boundary where context is richest, not deep in utilities.

---

## Security Standards

All guidance derives from [notes/30-ai-app-security-checklist.md](../notes/30-ai-app-security-checklist.md).

### General Rules

- **No secrets in source code.** All API keys and credentials must come from `process.env`. Never hardcode, log, or interpolate them into strings for user display.
- **`.env` is never committed.** It is already listed in `.gitignore`. Do not add exceptions.
- **Never read `.env` files.** Do not open, read, summarise, or reference the contents of any `.env`, `.env.local`, `.env.*.local`, or similarly named secrets file. Do not suggest edits to these files that would expose their values. If a task requires an API key, refer to the environment variable name only (e.g. `OPENAI_API_KEY`) — never its value.
- **Validate all external inputs at the boundary.** Treat anything arriving from outside the process (URLs, file content, API responses, CLI arguments) as untrusted.
- **No dynamic code execution.** Do not use `eval`, `Function()`, or dynamic `import()` on user-supplied strings.

### Agent Pipeline Security (scripts/agent/)

- **Prompt injection defence**: every LLM call must instruct the model that input content is untrusted data, not instructions, and that embedded commands must be ignored.
- **Path traversal prevention**: before writing any file, resolve the absolute path and assert it begins with the allowed project root. Reject slugs containing `..`, `/`, or null bytes.
- **Input validation**: only accept `http://` or `https://` URLs. Reject `file://`, `javascript:`, `data:`, and all other protocols. Enforce a per-run URL count limit (`MAX_URLS = 3`).
- **HTML sanitisation**: strip `<script>`, `<iframe>`, `<object>`, event-handler attributes (`on*`), and `javascript:` hrefs before passing content to the LLM.
- **No overwriting existing files**: check existence before write; fail loudly if the target path already exists.
- **Rate limiting**: enforce `MAX_URLS` in the orchestrator before starting any I/O.

### Dependency Management

- Run `npm audit` before shipping any change that adds or upgrades a dependency.
- Fix `critical` and `high` CVEs immediately. Document accepted `moderate` risks with a comment.

---

## Code Style

- **Formatter**: Biome (`npm run format`). Configuration is in `biome.json` — do not override it inline.
- **Linter**: Biome (`npm run lint`). All lint errors must be resolved; do not suppress with `// biome-ignore` without a written justification comment.
- **Imports**: use `import type` for type-only imports (`verbatimModuleSyntax` is on).
- **File extensions in imports**: always include `.ts` extensions in scripts (required by the `tsx` runtime and `verbatimModuleSyntax`).
- **No default exports** in shared modules — named exports are easier to rename and discover.
- **Async/await only** — no raw `.then()` / `.catch()` chains unless composing promises in parallel (`Promise.all`).

---

## Testing

- Tests live in `tests/`. File naming: `{module}.test.ts`.
- Use Vitest. Runner: `npm test`.
- Test **behaviour**, not implementation. Assert observable outputs, not internal state.
- One `describe` block per module. Each `it` reads as a sentence: `it("returns empty array when manifest has no notes", ...)`.
- Do not mock what you own — only mock at external boundaries (network, file system, API clients).

---

## Build & Commands

```bash
npm run dev          # dev server (runs build:manifest first)
npm run build        # type-check + Vite production build
npm run test         # Vitest run
npm run lint         # Biome lint
npm run format       # Biome format
npm run ingest -- --url="https://example.com"   # agent ingestion CLI
```

---

## Commit Message Convention

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/) and pass `commitlint`. Rules enforced by `commitlint.config.js`:

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Allowed Types

| Type       | When to use                            |
| ---------- | -------------------------------------- |
| `feat`     | New feature                            |
| `fix`      | Bug fix                                |
| `docs`     | Documentation only                     |
| `style`    | Formatting, no logic change            |
| `refactor` | Code change with no feature or fix     |
| `test`     | Adding or updating tests               |
| `chore`    | Tooling, config, or dependency changes |
| `perf`     | Performance improvement                |
| `ci`       | CI/CD changes                          |
| `revert`   | Reverts a previous commit              |
| `note`     | Curriculum note added or updated       |

### Allowed Scopes (optional)

`app` · `tts` · `search` · `sw` · `manifest` · `notes` · `deps` · `ci` · `config` · `docs` · `biome` · `types`

### Subject Rules

- Must start with a **lowercase letter**
- Must **not** end with a period
- Maximum header length: **100 characters**
- Use imperative mood: `add`, `fix`, `update` — not `added`, `fixes`, `updated`

### Header

- Must not be longer than 100 characters
- Must be lower-cased and imperative

### Subject

- Must be lower-cased and imperative

### Body & Footer

- Must be preceded by a **blank line**
- Each line must not exceed **100 characters**

### Examples

```
feat(search): add fuzzy matching for tag filters
fix(sw): correct cache version key after manifest rebuild
test(utils): add edge cases for readingTime with front matter
chore(deps): upgrade vite to 6.2.0
note(notes): add claude extended thinking note
refactor(app): extract note renderer into dedicated module
docs: update README with agent ingestion section
```

---

## File Structure Conventions

```
src/           # Frontend TypeScript modules (Vite)
scripts/       # Build and CLI scripts (Node/tsx)
  agent/       # Ingestion pipeline — one concern per file
notes/         # Markdown source of truth — never auto-modified by agents
notes/drafts/  # Agent-generated drafts awaiting manual review
logs/          # Local runtime logs — never committed
public/        # Static assets + generated manifest
tests/         # Vitest test files
```

---

## Agent Ingestion Conventions (scripts/agent/)

- Each module exports exactly one primary function that matches the file name: `fetch.ts` → `fetchUrl`, `sanitize.ts` → `sanitizeHtml`, etc.
- All modules are pure input→output with no global side effects, except `save.ts` (file I/O) and `summarize.ts` (network I/O) — these must be explicitly awaited.
- The orchestrator (`ingest.ts`) is the **only** file allowed to compose pipeline steps. Other modules must not import from sibling agent files.
- Draft notes are the **only** output. The `/notes/` directory is never touched by the agent.
