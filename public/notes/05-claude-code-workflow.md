---
title: Claude Code — Workflow & Modes
tags: [claude-code, planning-mode, thinking-mode, context-management, compact, clear]
source: Course notes
---

# Claude Code — Workflow & Modes

## Planning Mode

For complex tasks that require broad exploration of your codebase before making changes.

**Enable**: Press **Shift + Tab** twice (or once if already auto-accepting edits)

In Planning Mode, Claude will:
- Read more files in your project
- Create a detailed implementation plan
- Show you exactly what it intends to do
- **Wait for your approval** before proceeding

> Use Planning Mode when a task touches multiple files or components — review the plan and redirect Claude if it missed something.

---

## Thinking Modes

Thinking modes give Claude more reasoning time before answering. Useful for complex logic, not for broad codebase exploration (that's what Planning Mode is for).

| Mode | Use for |
|------|---------|
| `think` | Basic reasoning boost |
| `think more` | Extended reasoning |
| `think a lot` | Comprehensive reasoning |
| `think longer` | Extended time reasoning |
| `ultrathink` | Maximum reasoning capability |

**How to use**: Just include the phrase in your prompt.

```text
This is a tough task, so ultrathink about the best way to implement it.
```

Each mode gives Claude progressively more tokens for deeper analysis.

---

## When to Use Planning vs. Thinking

| Situation | Use |
|-----------|-----|
| Multi-step implementation touching multiple files | **Planning Mode** |
| Understanding a large, unfamiliar codebase | **Planning Mode** |
| Complex logic or algorithmic problem | **Thinking Mode** |
| Debugging a difficult, subtle issue | **Thinking Mode** |
| Both complexity dimensions | **Both** |

---

## Context Management Commands

### `/compact`
Summarizes your entire conversation history while **preserving key knowledge Claude has gained**.

Use it when:
- Claude has learned a lot about your project during a long session
- You want to continue with related tasks without losing context
- The conversation is getting long but the knowledge is valuable

### `/clear`
Completely removes conversation history — **fresh start**.

Use it when:
- Switching to a completely different, unrelated task
- The current context might confuse Claude for the new task
- You just want to reset
