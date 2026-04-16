---
title: Claude Commands Glossary
tags: [commands, slash-commands, keyboard-shortcuts, syntax, quick-reference]
source: Course notes + official docs
---

# Claude Commands Glossary

A quick-reference of every command, shortcut, and special syntax available in Claude Code.

---

## Built-in Slash Commands

These commands ship with Claude Code out of the box.

| Command | What it does |
|---------|-------------|
| `/init` | Analyses the current codebase and creates a `CLAUDE.md` summary file |
| `/compact` | Summarises conversation history, preserving key context — use when sessions get long |
| `/clear` | Wipes the entire conversation history for a clean slate |
| `/help` | Lists all available commands and their descriptions |
| `/doctor` | Runs a health check on your Claude Code installation and configuration |
| `/model` | Shows or switches the active Claude model for the session |
| `/status` | Displays the current session status (model, context usage, permissions) |
| `/review` | Asks Claude to review the last code change or diff in the working directory |

---

## Custom Slash Commands

Commands you create yourself by adding Markdown files to `.claude/commands/`.

### File structure

```
your-project/
└── .claude/
    └── commands/
        ├── audit.md          →  /audit
        ├── write_tests.md    →  /write_tests
        └── summarise.md      →  /summarise
```

> ⚠️ Restart Claude Code after adding or renaming command files.

### Using `$ARGUMENTS`

Any text you type after the command name is passed as `$ARGUMENTS` inside the command file.

```
/write_tests the use-auth.ts hook in src/hooks/
```

Inside `write_tests.md`, `$ARGUMENTS` becomes: `"the use-auth.ts hook in src/hooks/"`

---

## Special Syntax

| Syntax | What it does |
|--------|-------------|
| `@filename` | Includes the file's content in your message. Claude shows matching files to choose from |
| `@path/to/file` | Direct file reference — no file picker, included immediately |
| `@CLAUDE.md` | Explicitly includes your project context file |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Shift + Tab` (×1) | Toggle auto-accept edits on/off |
| `Shift + Tab` (×2) | Enable Planning Mode (thorough exploration before acting) |
| `Ctrl + V` | Paste a screenshot into the chat (macOS — **not** `Cmd+V`) |
| `↑` | Recall the previous message in the input box |
| `Esc` | Cancel the current generation |

---

## Thinking Mode Phrases

Type these directly in your prompt — they are not slash commands, just natural language triggers.

| Phrase | Effect |
|--------|--------|
| `think` | Basic extended reasoning |
| `think more` | More reasoning tokens |
| `think a lot` | Deep analysis |
| `think longer` | Extended time reasoning |
| `ultrathink` | Maximum reasoning — for the hardest problems |

**Example:**
```
This refactor touches 12 files. Ultrathink about the safest order of operations
before you begin, and flag any risk of breaking changes.
```

---

## Permission & Settings Files

| File | Purpose |
|------|---------|
| `.claude/settings.json` | Project-level settings (shared with team) |
| `.claude/settings.local.json` | Personal settings, not committed to git |
| `~/.claude/settings.json` | Global settings for all projects |
| `CLAUDE.md` | Project context Claude reads on every request |
| `CLAUDE.local.md` | Personal project context (not shared) |
| `~/.claude/CLAUDE.md` | Global context included in all projects |
