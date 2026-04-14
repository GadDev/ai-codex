# Contributing to AI Codex

Thank you for considering a contribution. Whether you're fixing a typo, adding a note, or improving the app, all contributions are welcome.

---

## Table of Contents

- [Ways to Contribute](#ways-to-contribute)
- [Getting Started](#getting-started)
- [Adding or Editing Notes](#adding-or-editing-notes)
- [Contributing Code](#contributing-code)
- [Commit Style](#commit-style)
- [Pull Request Process](#pull-request-process)
- [Code of Conduct](#code-of-conduct)
- [Contributors](#contributors)

---

## Ways to Contribute

| Type        | Examples                                              |
| ----------- | ----------------------------------------------------- |
| **Notes**   | Fix inaccuracies, add missing topics, improve clarity |
| **App**     | Bug fixes, accessibility improvements, performance    |
| **Tests**   | Increase coverage, improve test quality               |
| **Docs**    | Improve README, CHANGELOG, inline comments            |
| **Tooling** | Biome config, Vite plugins, CI improvements           |

---

## Getting Started

1. **Fork** the repository and clone your fork:

   ```bash
   git clone https://github.com/your-username/ai-codex.git
   cd ai-codex
   npm install
   ```

2. **Create a branch** with a descriptive name:

   ```bash
   git checkout -b fix/tts-sentence-split
   # or
   git checkout -b note/38-structured-outputs
   ```

3. **Make your changes**, then verify everything is clean:

   ```bash
   npm run lint        # Biome linting + formatting check
   npm run typecheck   # TypeScript strict type-check
   npm test            # Full Vitest suite
   ```

4. **Push** and open a pull request against `main`.

---

## Adding or Editing Notes

Notes live in `notes/` and are the single source of truth. Each file must include a YAML front matter block:

```markdown
---
title: "Your Note Title"
emoji: "🤖"
tags: ["tag-one", "tag-two", "tag-three"]
---

# Your Note Title

Content goes here…
```

| Field   | Required | Format                                         |
| ------- | -------- | ---------------------------------------------- |
| `title` | Yes      | Plain string, used in sidebar and search       |
| `emoji` | Yes      | Single emoji, used as the note icon            |
| `tags`  | Yes      | Array of lowercase strings, used for filtering |

After adding or editing a note, run `npm run build:manifest` (or just `npm run dev`) to regenerate the search manifest.

**Naming convention:** `{nn}-{slug}.md` where `nn` is a zero-padded sequence number (e.g. `38-structured-outputs.md`). Copy the file to `public/notes/` as well so the dev server can serve it.

---

## Contributing Code

- Follow the existing code style — Biome enforces it. Run `npm run lint:fix` before committing.
- All new logic should have corresponding tests in `tests/`.
- Keep changes focused — one concern per pull request.
- TypeScript strict mode is enforced; avoid `any`.

---

## Commit Style

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]
[optional footer]
```

| Type       | When to use                          |
| ---------- | ------------------------------------ |
| `feat`     | New feature or note                  |
| `fix`      | Bug fix                              |
| `docs`     | Documentation only                   |
| `test`     | Adding or fixing tests               |
| `chore`    | Tooling, config, dependencies        |
| `refactor` | Code change with no behaviour change |

**Examples:**

```
feat(notes): add note 38 on structured outputs
fix(tts): correct sentence boundary detection for abbreviations
chore(biome): upgrade to 2.5.0
```

---

## Pull Request Process

1. Ensure `npm run lint`, `npm run typecheck`, and `npm test` all pass locally.
2. Update `CHANGELOG.md` under `[Unreleased]` with a brief description of your change.
3. Keep the PR description clear — what changed and why.
4. A maintainer will review and merge once approved.

---

## Code of Conduct

By contributing to this project you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behaviour to the maintainers.

---

## Contributors

| Name                                   | Role                 |
| -------------------------------------- | -------------------- |
| [Al](https://github.com/your-username) | Creator & maintainer |

> To add yourself here, open a PR that includes your contribution and adds your name to this table.
