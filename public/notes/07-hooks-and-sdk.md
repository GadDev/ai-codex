---
title: Claude Code — Hooks & SDK
tags: [claude-code, hooks, PreToolUse, PostToolUse, SDK, permissions, automation]
source: Course notes + slides
---

# Claude Code — Hooks & SDK

## Hooks

Hooks let you intercept and respond to Claude's tool calls — either **before** or **after** they execute. They are scripts or commands that Claude Code runs automatically at specific moments.

### Two Types of Hooks

| Hook Type | When it runs | Can it block? |
|-----------|-------------|---------------|
| `PreToolUse` | Before a tool call executes | ✅ Yes — exit code 2 blocks the call |
| `PostToolUse` | After a tool call has completed | ❌ No — the action already happened |

### Common Use Cases

- **Code formatting** — Automatically format files after Claude edits them
- **Testing** — Run tests automatically when files are changed
- **Access control** — Block Claude from reading or editing specific files
- **Code quality** — Run linters or type checkers and return feedback to Claude
- **Logging** — Track what files Claude accesses or modifies
- **Validation** — Enforce naming conventions or coding standards

---

## Building a Hook — 4 Steps

**Step 1**: Decide on PreToolUse or PostToolUse

**Step 2**: Determine which tool calls to watch for

Available tool names:

| Tool | Purpose |
|------|---------|
| `Read` | Read a file |
| `Edit`, `MultiEdit` | Edit an existing file |
| `Write` | Create a file and write to it |
| `Bash` | Execute a command |
| `Glob` | Find files/folders based on a pattern |
| `Grep` | Search for content |
| `Task` | Create a sub-agent to complete a task |
| `WebFetch`, `WebSearch` | Search or fetch a web page |

**Step 3**: Write a command that receives the tool call data

When your hook runs, Claude passes a JSON object via **standard input** containing:

```json
{
  "session_id": "2d6a1e4d-6...",
  "transcript_path": "/Users/sg/...",
  "hook_event_name": "PreToolUse",
  "tool_name": "Read",
  "tool_input": {
    "file_path": "/code/queries/.env"
  }
}
```

**Step 4**: Provide feedback to Claude via exit code

| Exit Code | Meaning |
|-----------|---------|
| `0` | All is well — proceed normally |
| `2` | **Block the tool call** (PreToolUse only). Stderr output is sent to Claude as an explanation |

---

## Security Best Practices for Hooks

1. **Validate and sanitize inputs** — Never trust input data blindly
2. **Always quote shell variables** — Use `"$VAR"` not `$VAR`
3. **Block path traversal** — Check for `..` in file paths
4. **Use absolute paths** — Specify full paths for scripts
5. **Skip sensitive files** — Avoid `.env`, `.git/`, keys, etc.

---

## The Claude Code SDK

The SDK lets you run Claude Code **programmatically** from within your own applications and scripts. Available for TypeScript, Python, and the CLI.

Key characteristic: it runs the **same Claude Code** you use at the terminal, inheriting all settings from an instance launched in the same directory.

### TypeScript Example

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
// Note: package was renamed from @anthropic-ai/claude-code

const prompt = "Add a description to the package.json file in the current directory.";

for await (const message of query({
  prompt,
  options: {
    allowedTools: ["Edit"],
  },
})) {
  console.log(JSON.stringify(message, null, 2));
}
```

### Python Example

```python
import anyio
from claude_code_sdk import query

async def main():
    prompt = "Look for duplicate queries"
    async for message in query(prompt=prompt):
        print(message)

anyio.run(main)
```

### Permissions

> ⚠️ **Read-only by default** — The SDK can read files, search directories, and grep, but cannot write, edit, or create files unless you explicitly allow it.

To enable write permissions, add `allowedTools` to your query options:

```typescript
options: {
  allowedTools: ["Edit", "Write", "Bash"]
}
```

### Practical Applications

- **Git hooks** — Automatically review code changes before commits
- **Build scripts** — Analyze and optimize code during builds
- **CI/CD pipelines** — Code quality checks in automated pipelines
- **Helper commands** — Code maintenance and documentation generation
- **Custom tooling** — AI-powered intelligence at any point in your dev workflow
