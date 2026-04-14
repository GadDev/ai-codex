---
title: Screenshot Tools for Fixing Cosmetic Bugs
tags: [screenshots, macOS, windows, visual-debugging, cosmetic-bugs, workflow]
source: Course notes
---

# Screenshot Tools for Fixing Cosmetic Bugs

The fastest way to communicate a visual bug to Claude is to **show it, not describe it**. A screenshot eliminates ambiguity about which element is broken, what it looks like, and where it sits on the page. This page covers the screenshot tools on both macOS and Windows, and how to feed them directly into Claude Code.

---

## macOS

### Capture shortcuts

| Shortcut | What it captures | Where it goes |
|----------|-----------------|---------------|
| `Cmd + Shift + 3` | Entire screen | Saved to Desktop |
| `Cmd + Shift + 4` | Region you drag-select | Saved to Desktop |
| `Cmd + Shift + 4`, then `Space` | The window you click | Saved to Desktop |
| `Cmd + Shift + 5` | Opens the screenshot toolbar (video + options) | Saved to Desktop |

### Capture to clipboard instead of a file

Add `Ctrl` to any of the above shortcuts to copy directly to your clipboard instead of saving a file:

| Shortcut | What it captures | Where it goes |
|----------|-----------------|---------------|
| `Ctrl + Cmd + Shift + 3` | Entire screen | Clipboard |
| `Ctrl + Cmd + Shift + 4` | Region you drag-select | Clipboard |
| `Ctrl + Cmd + Shift + 4`, then `Space` | The window you click | Clipboard |

> 💡 The clipboard variants are the fastest for a Claude workflow — no file to find, just paste immediately.

### Paste into Claude Code

Once your screenshot is on the clipboard:

```
Ctrl + V   ← paste into Claude Code chat (NOT Cmd+V)
```

This is a common gotcha — Claude Code uses `Ctrl+V` for paste, not the macOS default `Cmd+V`.

---

## Windows

### Capture shortcuts

| Shortcut | What it captures | Where it goes |
|----------|-----------------|---------------|
| `Win + Shift + S` | Region, window, or full screen (your choice) | Clipboard |
| `Print Screen` | Entire screen | Clipboard |
| `Alt + Print Screen` | Active window only | Clipboard |
| `Win + Print Screen` | Entire screen | Saved to `Pictures/Screenshots` |

### Snipping Tool

Open with `Win + Shift + S` or search for **Snipping Tool** in the Start menu.

- **Rectangular snip** — drag to select any region
- **Window snip** — click any open window
- **Full-screen snip** — captures everything
- **Free-form snip** — draw any shape

After capturing, the Snipping Tool editor lets you annotate before copying or saving.

### Paste into Claude Code

```
Ctrl + V   ← same as macOS, paste directly into the chat
```

---

## The Visual Bug Fixing Workflow

```
1. Spot the bug
   └─ Something looks wrong in the browser

2. Capture it
   └─ macOS: Ctrl+Cmd+Shift+4 → drag region → clipboard
      Windows: Win+Shift+S → drag region → clipboard

3. Switch to Claude Code and paste
   └─ Ctrl+V in the chat input

4. Describe the bug concisely
   └─ "The sidebar overlaps the main content on this screen.
       Fix it in @src/layouts/AppLayout.tsx"

5. Let Claude fix it, then verify
   └─ Refresh your browser and check visually
      Or ask Claude to use Playwright to screenshot the result
```

---

## Tips for Better Screenshots

**Capture only what's relevant.** A tight crop around the broken element is far more useful than a full-screen shot — Claude focuses on exactly what you show it.

**Show the bug at the right viewport size.** If it only appears on mobile widths, resize your browser window before capturing.

**Annotate if needed.** macOS Preview and Windows Snipping Tool both let you draw arrows and circles before pasting. Use them to highlight exactly what's wrong when the bug is subtle.

**Capture both states for "before/after" bugs.** If a hover state or animation is broken, screenshot both the normal and broken state so Claude understands the expected vs. actual behaviour.

**Use browser DevTools for precision.** If the bug is a specific CSS property, right-click the element → Inspect, and screenshot the DevTools panel alongside the UI. Claude can read both.

---

## Quick Reference Card

| Goal | macOS | Windows |
|------|-------|---------|
| Screenshot a region → clipboard | `Ctrl+Cmd+Shift+4` | `Win+Shift+S` |
| Screenshot a window → clipboard | `Ctrl+Cmd+Shift+4` + `Space` | `Alt+Print Screen` |
| Screenshot full screen → clipboard | `Ctrl+Cmd+Shift+3` | `Print Screen` |
| Paste into Claude Code | `Ctrl+V` | `Ctrl+V` |
