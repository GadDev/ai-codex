---
title: Using Claude with Playwright
tags: [playwright, MCP, browser-automation, visual-debugging, UI-testing]
source: Course notes
---

# Using Claude with Playwright

The Playwright MCP server gives Claude a real, controllable browser. Instead of reasoning about code alone, Claude can **see and interact with your running application** — opening a powerful visual feedback loop for UI development and debugging.

---

## Setup

### 1. Install the Playwright MCP server

Run this in your **terminal** (not inside Claude Code):

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

### 2. (Optional) Pre-approve it to skip permission prompts

Edit `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": ["mcp__playwright"],
    "deny": []
  }
}
```

### 3. Start your dev server, then start Claude Code

Claude needs your app running at a local URL (e.g. `localhost:3000`) to interact with it.

---

## What Claude Can Do with Playwright

| Action | Description |
|--------|-------------|
| **Navigate** | Open any URL, follow links, handle redirects |
| **Screenshot** | Capture the full page or a specific element |
| **Click** | Interact with buttons, links, dropdowns |
| **Type** | Fill in forms, search boxes, text fields |
| **Scroll** | Scroll to elements or specific positions |
| **Wait** | Wait for elements to appear or network requests to complete |
| **Inspect** | Read page content, check element attributes |
| **Assert** | Verify text, visibility, or element state |

---

## Core Workflows

### Visual component review

Ask Claude to generate a component, screenshot it, and improve it based on what it sees:

```
Navigate to localhost:3000/components, render the Button component in all its
variants, screenshot each one, then update the Tailwind classes in
@src/components/Button.tsx to make the hover states more distinct.
```

### Cosmetic bug fixing

Show Claude exactly what's broken without describing it manually:

```
Navigate to localhost:3000/dashboard, take a screenshot, and fix whatever
layout issue you find in @src/pages/Dashboard.tsx. Make sure the sidebar
doesn't overlap the main content on screens narrower than 1280px.
```

### Prompt-driven UI improvement

Let Claude see the current state and improve the generation logic:

```
Navigate to localhost:3000, generate a card component using the current
prompt at @src/lib/prompts/card.ts, screenshot the result, evaluate whether
it looks polished and original, then update the prompt to produce better
visual designs going forward.
```

### Automated smoke testing

Run a quick visual sanity check across key pages:

```
Navigate to each of these routes: /, /login, /dashboard, /settings.
Screenshot each page and tell me if anything looks visually broken.
Don't make any code changes — just report what you see.
```

---

## The Visual Feedback Loop

This is the real power of Playwright + Claude:

```
You describe goal
      ↓
Claude navigates to your app
      ↓
Claude screenshots the current state
      ↓
Claude reads the relevant source files (@file)
      ↓
Claude proposes and applies a fix
      ↓
Claude screenshots again to verify
      ↓
Repeat until the goal is met
```

Without Playwright, Claude can only reason about code. With it, Claude can verify its own changes visually — catching layout bugs, style regressions, and rendering issues that aren't visible in the source.

---

## Tips

**Always have your dev server running first.** Claude can't start it automatically unless you explicitly ask it to run `npm run dev` via Bash.

**Be specific about viewport size** when reporting responsive bugs:
```
At 768px viewport width, navigate to /pricing and screenshot the hero section.
```

**Ask for a "before" screenshot first** on complex fixes — it gives you a clear reference point if you want to roll back.

**Combine with Planning Mode** for multi-page fixes:
```
Shift+Tab twice, then: Review all pages at localhost:3000 and create a plan
for standardising the spacing and typography before making any changes.
```
