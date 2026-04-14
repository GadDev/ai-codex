# Release Process

This document is the single source of truth for how releases are cut, what automation runs, and what each participant (developer, CI, GitHub release) is responsible for.

Releases are **fully automated** via [semantic-release](https://semantic-release.gitbook.io/semantic-release). There are no manual version bumps, no git tagging by hand, and no `npm run release:*` commands. Every merge to `main` that contains a releasable commit triggers the pipeline automatically.

---

## Table of Contents

- [Overview](#overview)
- [How semantic-release Works](#how-semantic-release-works)
- [Versioning Policy](#versioning-policy)
- [Branch & Tag Strategy](#branch--tag-strategy)
- [What Counts as a Release?](#what-counts-as-a-release)
- [What Automation Does](#what-automation-does)
- [Commit Convention Quick Reference](#commit-convention-quick-reference)
- [Emergency: Hotfix Process](#emergency-hotfix-process)
- [Troubleshooting](#troubleshooting)

---

## Overview

```
Developer machine          GitHub / CI
──────────────────         ──────────────────────────────────────────────
feature branch             PR opened
  └── git push        ──▶  CI: lint + typecheck + tests + build
                           commitlint validates every commit in the PR

  └── PR merged       ──▶  release.yml triggers on push to main:
                             lint + typecheck + tests + build
                             semantic-release analyses commits
                             → no releasable commits? workflow exits silently
                             → releasable commits found:
                                version bumped in package.json
                                CHANGELOG.md updated
                                git tag v1.x.0 created & pushed
                                GitHub Release published with release notes
```

No local release commands. No manual tagging. Write good commits, merge to `main`, done.

---

## How semantic-release Works

semantic-release reads every commit on `main` since the last published tag and determines:

1. **Whether to release** — if no commits map to a releasable type, it exits without doing anything
2. **What version to bump** — based on the highest-impact commit type found (see rules below)
3. **What to publish** — updates `package.json`, generates `CHANGELOG.md`, creates the git tag, and opens the GitHub Release

This logic is configured in [`.releaserc.json`](.releaserc.json).

---

## Versioning Policy

This project follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html). The bump level is determined automatically from commit types:

| Version bump    | Triggered by                                       | Example commit                          |
| --------------- | -------------------------------------------------- | --------------------------------------- |
| `MAJOR` (x.0.0) | Any commit with `BREAKING CHANGE:` footer          | `feat!: remove legacy search API`       |
| `MINOR` (0.x.0) | `feat` commits                                     | `feat(search): add tag-based filtering` |
| `PATCH` (0.0.x) | `fix`, `perf`, `revert`, `note` commits            | `fix(tts): correct sentence boundaries` |
| _(no release)_  | `docs`, `refactor`, `test`, `chore`, `ci`, `style` | `chore(deps): upgrade vite`             |

**Rules:**

- Tags always have a `v` prefix: `v1.2.3`
- The `main` branch is always releasable; broken code must not reach `main`

---

## Branch & Tag Strategy

```
main ─────────────────────────────────────────── always deployable
       ↑             ↑             ↑
  PR merged      PR merged     PR merged with feat commit
  (chore only)   (docs only)   → semantic-release auto-tags v1.1.0
  no release     no release    → GitHub Release published
```

- **`main`** — the only long-lived branch; all work merges here via PRs
- **Feature branches** — short-lived, named `feat/`, `fix/`, `docs/`, etc.
- **Tags** — created only by semantic-release; never created manually

---

## What Counts as a Release?

| Commit type                                        | Triggers a release? | Bump  |
| -------------------------------------------------- | ------------------- | ----- |
| `feat`                                             | Yes                 | minor |
| `fix`                                              | Yes                 | patch |
| `perf`                                             | Yes                 | patch |
| `revert`                                           | Yes                 | patch |
| `note`                                             | Yes                 | patch |
| `BREAKING CHANGE` footer                           | Yes                 | major |
| `docs`, `refactor`, `test`, `chore`, `ci`, `style` | No                  | —     |

If a PR contains only `chore`/`docs`/`test` commits, semantic-release runs, finds nothing releasable, and silently exits.

---

## What Automation Does

### On every `push` and `pull_request` to `main` — [ci.yml](.github/workflows/ci.yml)

| Job                 | Runs                                         | Blocks merge |
| ------------------- | -------------------------------------------- | ------------ |
| **Lint & Format**   | `biome check .`                              | Yes          |
| **TypeScript**      | `tsc --noEmit`                               | Yes          |
| **Tests**           | `vitest run --coverage`                      | Yes          |
| **Build**           | `vite build` (only after above pass)         | Yes          |
| **Commit Messages** | `commitlint --from base --to head` (PR only) | Yes          |

A PR cannot be merged if any job is red.

### On every `push` to `main` — [release.yml](.github/workflows/release.yml)

All steps run sequentially in a single job. If any step fails the release is aborted.

| Step                 | What it does                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Lint**             | `biome check .`                                                                                                      |
| **Type-check**       | `tsc --noEmit`                                                                                                       |
| **Tests**            | `vitest run`                                                                                                         |
| **Build**            | `npm run build` → generates `dist/`                                                                                  |
| **semantic-release** | Analyses commits, determines version, updates `package.json` + `CHANGELOG.md`, creates tag, publishes GitHub Release |

> The release job requires `GITHUB_TOKEN` which GitHub provides automatically — no secrets to configure.

### On every local `git commit` — husky hooks

| Hook         | Runs                                                                  |
| ------------ | --------------------------------------------------------------------- |
| `pre-commit` | `lint-staged` (Biome on staged files only) → `typecheck` → `npm test` |
| `commit-msg` | `commitlint` — rejects non-conventional messages                      |

---

## Commit Convention Quick Reference

Format: `type(scope): subject`

| Type       | Use for                               |
| ---------- | ------------------------------------- |
| `feat`     | New feature                           |
| `fix`      | Bug fix                               |
| `docs`     | Documentation only                    |
| `refactor` | Code restructure, no behaviour change |
| `test`     | Adding or updating tests              |
| `chore`    | Tooling, config, dependency updates   |
| `perf`     | Performance improvement               |
| `ci`       | CI/CD changes                         |
| `note`     | Curriculum note added or updated      |
| `revert`   | Reverts a previous commit             |

**Examples:**

```
feat(search): add tag-based filtering to search results
fix(tts): correct sentence boundary detection for abbreviations
chore(deps): upgrade vite to 6.5.0
note: add note 38 on structured outputs
docs(readme): update getting started section
ci: add dependency review workflow
```

**Rules enforced by commitlint:**

- Subject must be lowercase
- Subject must not end with a period
- Header max 100 characters
- Scope must be one of the allowed values if provided (warning, not error)

---

## Emergency: Hotfix Process

For critical fixes that cannot wait for the normal merge flow:

```bash
# 1. Branch from the last release tag — NOT from main if main has unreleased changes
git checkout v1.2.0
git checkout -b hotfix/fix-offline-crash

# 2. Apply the fix + write a test
# ... make changes ...

# 3. Commit with conventional format — semantic-release will pick this up
git commit -m "fix(sw): prevent crash on empty cache during offline init"

# 4. Open a PR to main for review — do not bypass CI
# 5. Once merged, semantic-release handles the rest automatically
```

No need to manually bump the version or push a tag — merging the hotfix PR to `main` triggers semantic-release which detects the `fix:` commit and cuts a patch release.

---

## Troubleshooting

### "The release workflow ran but no release was published"

semantic-release found no releasable commits since the last tag. Check the workflow logs — it will say `"The next release version is undefined"`. This is expected if all merged commits are `chore`/`docs`/`test`/`refactor`.

To verify locally:

```bash
npx semantic-release --dry-run
```

### "CHANGELOG.md was not updated"

semantic-release only processes commits that follow the Conventional Commits format. Check recent commits:

```bash
git log --oneline -10
```

Free-form commits (e.g. "fixed stuff") are invisible to it. commitlint enforces the format on every local commit, but a direct push to `main` bypasses this — configure [branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) with required status checks to prevent that.

### "The release job failed with 'ENOGITHUBTOKEN'"

The `GITHUB_TOKEN` is not being passed to the `semantic-release` step. Check that [release.yml](.github/workflows/release.yml) has:

```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

and that the workflow has `permissions: contents: write`.

### "semantic-release created a tag but CI re-triggered infinitely"

The commit created by `@semantic-release/git` includes `[skip ci]` in the message, which stops GitHub Actions from re-running. If you're on another CI system, ensure it respects this flag.
