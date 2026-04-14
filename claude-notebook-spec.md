# Claude Notebook — Application Specification

**Version:** 0.1 (Draft)  
**Author:** Al  
**Date:** April 2026  
**Status:** Draft for review

---

## 1. Overview

Claude Notebook is a personal reference application built on top of course notes about the Claude API and Anthropic ecosystem. Instead of passively storing Markdown notes in a folder, the app transforms them into an interactive, queryable knowledge base — part documentation site, part AI-powered tutor.

The app targets a single user (the author) and is designed to be consulted at any time, without requiring a server or deployment infrastructure.

---

## 2. Goals

- **Preserve learning**: Surface knowledge from personal notes rather than relying on generic LLM recall.
- **Enable fast lookup**: Find answers in seconds without scrolling through raw files.
- **Stay simple to maintain**: Adding a new note should automatically make it available in the app.
- **Work anywhere**: No server required. The app runs as a standalone file in any modern browser.
- **Demonstrate Claude in action**: Since the subject matter *is* Claude, the app itself should be a living example of Claude's capabilities.

---

## 3. User Stories

| As a user, I want to… | So that… |
|---|---|
| Browse notes organised by topic | I can explore and review what I learned |
| Search across all notes | I can find a specific concept quickly |
| Ask a question in plain language | I get a direct answer grounded in my notes |
| See which note an answer came from | I can verify and read the full context |
| Add or update a note file | The app reflects my latest knowledge |
| Use the app offline or from a file | I don't depend on any hosting infrastructure |

---

## 4. Features

### 4.1 Browse Mode
- Sidebar navigation listing all topics derived from note filenames or front-matter headings
- Clean, readable rendering of Markdown content (headers, code blocks, lists, emphasis)
- Active section highlighting as the user scrolls
- Collapsible sections for long notes

### 4.2 Search Mode
- Full-text search across all notes, triggered by a search bar
- Results show the note title, a short excerpt, and a relevance indicator
- Keyboard shortcut to open search (e.g. `⌘K` / `Ctrl+K`)
- Search runs client-side (no network needed)

### 4.3 Ask Mode (AI Chat)
- Chat panel where the user types questions in natural language
- Claude answers using the note content as context (RAG pattern)
- Each answer includes a **source reference** — the note(s) used to generate the response
- Conversation history preserved within the session
- Configurable: option to ask Claude to explain, simplify, or give an example
- Clear visual distinction between content from notes vs. Claude's own reasoning

### 4.4 Note Management (Passive)
- Notes are plain `.md` files in a designated folder
- The app loads and indexes them at startup — no manual sync step needed
- Adding or editing a file + refreshing the app is the update workflow
- Optional: front-matter support for metadata (title, tags, date)

---

## 5. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (client only)                │
│                                                         │
│  ┌──────────────┐   ┌──────────────┐  ┌─────────────┐  │
│  │  Sidebar /   │   │   Content    │  │  Chat Panel │  │
│  │  Navigation  │   │   Viewer     │  │  (Ask Mode) │  │
│  └──────────────┘   └──────────────┘  └──────┬──────┘  │
│                                              │          │
│  ┌────────────────────────────────────────┐  │          │
│  │         Note Loader & Indexer          │  │          │
│  │  (reads .md files → in-memory index)  │  │          │
│  └────────────────────────────────────────┘  │          │
│                                              │          │
└──────────────────────────────────────────────┼──────────┘
                                               │ API call
                                    ┌──────────▼──────────┐
                                    │    Claude API        │
                                    │  (claude-sonnet-4-6) │
                                    └─────────────────────┘
```

### Key design decisions

**Client-only**: The entire app runs in the browser with no backend. Note files are either bundled at build time or loaded via the File System Access API. The Claude API is called directly from the browser using the user's API key (stored in `localStorage`).

**RAG without a vector DB**: For a personal knowledge base of this size (tens of files, not thousands), full semantic search with embeddings is overkill. Instead, relevant notes are selected by lightweight keyword matching + Claude's own ability to extract what it needs from the provided context window.

**Single HTML file (MVP)**: The initial version is a self-contained `.html` file. Notes are embedded as a JS object at build time. No bundler, no framework overhead.

---

## 6. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| UI | Vanilla HTML/CSS/JS or React (single file) | No build step required for MVP |
| Markdown rendering | `marked.js` (CDN) | Lightweight, no install needed |
| Syntax highlighting | `highlight.js` (CDN) | For Claude API code examples in notes |
| Search | Fuse.js (CDN) | Fuzzy search, client-side, tiny |
| AI | Claude API (`claude-sonnet-4-6`) | Fast, cost-effective, large context |
| Storage | `localStorage` | API key persistence only |

---

## 7. Implementation Phases

### Phase 1 — Static Reader (no AI)
**Goal**: Get the notes rendered and browsable.

- [ ] Define folder structure for notes (e.g. `/notes/01-basics.md`, `/notes/02-prompting.md`)
- [ ] Build HTML shell: sidebar + content area
- [ ] Load and parse `.md` files
- [ ] Render Markdown with syntax highlighting
- [ ] Add full-text search with Fuse.js

**Deliverable**: A working personal documentation site.

### Phase 2 — Ask Mode (AI integration)
**Goal**: Add the Claude-powered chat panel.

- [ ] Add API key input (stored in `localStorage`, never sent anywhere else)
- [ ] Build chat UI panel (question input, answer display, source citations)
- [ ] Implement context injection: select relevant notes → send as context to Claude
- [ ] Display source references alongside answers
- [ ] Handle streaming responses for a responsive feel

**Deliverable**: A fully interactive notebook you can query.

### Phase 3 — Polish & Quality of Life
**Goal**: Make it delightful to use daily.

- [ ] Keyboard shortcuts (`⌘K` for search, `⌘/` for Ask)
- [ ] Dark/light mode toggle
- [ ] Persistent conversation history (session only)
- [ ] "Explain this differently" / "Give me an example" quick-action buttons
- [ ] Tags and filtering by topic
- [ ] Export a conversation as Markdown

---

## 8. Note Folder Structure (Actual — v1)

```
/notes
  ├── 01-ai-fluency-framework.md     ← The 4Ds, interaction modes (Automation/Augmentation/Agency)
  ├── 02-ai-technical-concepts.md    ← LLMs, RAG, context window, hallucination, temperature…
  ├── 03-prompt-engineering.md       ← Chain-of-thought, few-shot, personas, output formatting
  ├── 04-claude-code-basics.md       ← /init, CLAUDE.md files, @ file mentions, screenshots
  ├── 05-claude-code-workflow.md     ← Planning mode, thinking modes, /compact, /clear
  ├── 06-custom-commands-and-mcp.md  ← Custom slash commands, MCP servers, Playwright example
  └── 07-hooks-and-sdk.md           ← PreToolUse/PostToolUse hooks, exit codes, Claude Code SDK
```

Each file uses this front-matter template:

```markdown
---
title: Topic Name
tags: [tag1, tag2, tag3]
source: Source of the notes
---

# Topic Name

## Key concepts
...

## Examples
...

## My notes / observations
...
```

---

## 9. Out of Scope (v1)

- Multi-user support
- Cloud sync or hosting
- Voice input
- Mobile-native app
- Automatic note generation from URLs or PDFs
- Fine-tuning or embeddings-based retrieval

---

## 10. Open Questions

1. **Where do the notes currently live?** This determines the loading strategy (bundled vs. File System Access API).
2. **API key handling**: For a local file, `localStorage` is fine. If ever hosted, a backend proxy would be needed.
3. **How many notes?** If the corpus grows beyond ~50 files, a smarter retrieval strategy (embeddings) may become worthwhile.
4. **Framework preference?** Vanilla JS keeps it dependency-free; React makes the UI state easier to manage. Decision should be made before Phase 2.

---

*This document is a living spec. Update it as the project evolves.*
