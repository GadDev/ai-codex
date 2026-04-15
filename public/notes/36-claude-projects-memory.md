---
title: Claude Projects & Memory
tags: [projects, memory, context, conversation-history, persistent-context]
source: Anthropic docs + support
---

# Claude Projects & Memory 🗂️

How context persists across conversations — and how to replicate project-style memory at the API level.

---

## The Two Memory Modes

| | Claude.ai Projects | Claude API |
|---|---|---|
| **What it is** | UI feature — persistent system prompt + files shared across all chats | Stateless HTTP calls — no memory between requests |
| **How it works** | Anthropic stores the project context, prepends it to every chat | You manage all history in your `messages` array |
| **Best for** | Personal workflows, team knowledge bases | Production apps, custom memory logic |

---

## Claude.ai Projects (UI)

A **Project** gives you:
- A persistent **system prompt** (instructions, persona, style guide)
- Uploaded **files** available to every chat in the project
- Shared context across all team members (Team/Enterprise plans)

Practical uses: customer support playbooks, personal research assistant, team coding standards, writing style guides.

---

## Building Persistent Memory at the API Level

### Simple: Append-only conversation

```python
messages = []

def chat(user_input):
    messages.append({"role": "user", "content": user_input})

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system="You are a helpful assistant. Remember what the user tells you.",
        messages=messages
    )

    assistant_msg = response.content[0].text
    messages.append({"role": "assistant", "content": assistant_msg})
    return assistant_msg
```

### Intermediate: Summarise old turns to save tokens

```python
MAX_TURNS = 20

def trim_history(messages):
    if len(messages) > MAX_TURNS:
        old_turns = messages[:MAX_TURNS // 2]
        summary = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            messages=[
                *old_turns,
                {"role": "user", "content": "Summarise this conversation in 3 bullet points."}
            ]
        ).content[0].text

        messages = [
            {"role": "user", "content": f"[Earlier conversation summary]: {summary}"},
            {"role": "assistant", "content": "Understood, I have the context."}
        ] + messages[MAX_TURNS // 2:]
    return messages
```

### Advanced: Semantic memory with embeddings

```python
def build_system_with_memory(user_id, current_query):
    relevant_facts = memory_db.search(user_id, current_query, top_k=5)
    facts_text = "\n".join(f"- {f}" for f in relevant_facts)
    return f"""You are a personal assistant.

Relevant facts about this user:
{facts_text}

Use these facts naturally in your responses."""
```

---

## What Fits in Context vs. What Needs RAG

| Content | Approach |
|---|---|
| Recent conversation (< 50 turns) | Include in `messages` directly |
| Long documents (< 200K tokens) | Paste into system prompt |
| Large knowledge base (> 200K tokens) | RAG — embed and retrieve chunks |
| User preferences / facts | Extract and store in vector DB |
| Structured data (orders, records) | Query a real database via tool use |

---

## Context Window Tips

- **claude-sonnet-4-6** has a 200K token context window
- Always track token usage: `response.usage.input_tokens`
- Summarise rather than truncate — truncation loses continuity
- Set a token budget alert: warn when approaching 150K tokens

---

## Further Reading

- Claude.ai Projects: https://support.anthropic.com/en/articles/9517075
- Context windows & models: https://docs.anthropic.com/en/docs/about-claude/models
