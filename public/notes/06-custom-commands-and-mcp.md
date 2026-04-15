---
title: Claude Code — Custom Commands & MCP Servers
tags: [claude-code, custom-commands, slash-commands, MCP, playwright, permissions]
source: Course notes
---

# Claude Code — Custom Commands & MCP Servers

## Custom Commands

Custom commands let you save reusable instructions as slash commands that you can invoke any time.

### How to Create a Custom Command

1. Find the `.claude` folder in your project directory
2. Create a `commands/` directory inside it
3. Create a Markdown file with your desired command name (e.g. `audit.md`)

The filename becomes the command — `audit.md` → `/audit`

> ⚠️ You must **restart Claude Code** after creating a new command for it to be recognized.

### Example: `/audit` Command

A command that audits project dependencies:

```markdown
Run npm audit to find vulnerable installed packages.
Run npm audit fix to apply updates.
Run the test suite to verify nothing broke.
```

### Commands with Arguments

Use the `$ARGUMENTS` placeholder to make commands flexible and reusable.

**File: `.claude/commands/write_tests.md`**
```markdown
Write comprehensive tests for: $ARGUMENTS

Testing conventions:
* Use Vitest with React Testing Library
* Place test files in a __tests__ directory alongside the source file
* Name test files as [filename].test.ts(x)
* Use @/ prefix for imports

Coverage:
* Test happy paths
* Test edge cases
* Test error states
```

**Usage:**
```text
/write_tests the use-auth.ts file in the hooks directory
```

Arguments can be anything — file paths, descriptions, feature names. They give Claude the context and direction to execute the command correctly.

---

## MCP Servers (Model Context Protocol)

MCP servers extend Claude Code's capabilities by giving it new tools and the ability to interact with external systems.

### Installing an MCP Server

Run this in your **terminal** (not inside Claude Code):

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

This command:
- Names the MCP server `"playwright"`
- Provides the command that starts the server locally

### Managing Permissions

By default, Claude will ask for permission each time it uses an MCP tool. To pre-approve a server, edit `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": ["mcp__playwright"],
    "deny": []
  }
}
```

> Note the **double underscores** in `mcp__playwright`.

### Example: Playwright MCP for Visual Development

The Playwright server gives Claude a real browser. You can ask Claude to:

1. Navigate to your running app (`localhost:3000`)
2. Generate a test component
3. Analyze the visual styling and code quality
4. Update the generation prompt based on what it observes
5. Test the improved result

```text
"Navigate to localhost:3000, generate a basic component, review the styling, 
and update the generation prompt at @src/lib/prompts/generation.tsx to produce 
better components going forward."
```

The key advantage: Claude can **see** the actual visual output, not just the code.

### The MCP Ecosystem

MCP servers exist for many integrations:
- **Database interactions** — query and update databases directly
- **API testing and monitoring** — call and inspect APIs
- **File system operations** — advanced file handling
- **Cloud service integrations** — AWS, GitHub, etc.
- **Development tool automation** — CI/CD, build tools

MCP transforms Claude from a code assistant into a comprehensive development partner that can interact with your entire toolchain.
