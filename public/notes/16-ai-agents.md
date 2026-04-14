---
title: AI Agents & Agentic Patterns
tags: [agents, agentic, planning, memory, tool-use, ReAct, multi-agent, orchestration, LLM-apps]
source: Research + course notes
---

# AI Agents & Agentic Patterns

An AI agent is an LLM that doesn't just answer a question — it **takes actions**, observes the results, and continues until a goal is achieved. Instead of one prompt → one response, an agent runs a loop: think → act → observe → think again.

This is what makes Claude Code itself an agent: it reads your codebase, writes code, runs tests, sees the results, and adjusts — all autonomously.

---

## What Makes Something an Agent?

A standard LLM call: `prompt → response`

An agent:
```
Goal
  ↓
[Think] What's the next step?
  ↓
[Act] Call a tool / write code / search the web
  ↓
[Observe] What was the result?
  ↓
[Think] Did that work? What's next?
  ↓
... repeat until goal is achieved
```

The key ingredient is **tools** — functions the LLM can call to affect the world: search the web, read a file, run code, call an API, send an email.

---

## The ReAct Pattern

ReAct (Reasoning + Acting) is the most common agentic pattern. The model alternates between:

- **Thought**: "I need to find the current price of NVIDIA stock. I'll use the search tool."
- **Action**: `search("NVIDIA stock price today")`
- **Observation**: `"NVIDIA (NVDA): $875.40 as of market close"`
- **Thought**: "I have the price. Now I can answer the question."
- **Answer**: "NVIDIA's stock closed at $875.40 today."

This pattern is powerful because the model can **course-correct** — if a tool call fails or returns unexpected results, it can try a different approach.

---

## Memory Types

Agents need memory to be useful across long tasks. There are four types:

| Type | What it is | Example |
|------|-----------|---------|
| **In-context** | Everything in the current context window | The conversation so far, tool results |
| **External** | A database the agent can read/write | A vector store of past interactions |
| **Episodic** | Summaries of past sessions | "Last time we worked on the auth module" |
| **Semantic** | Persistent facts about the world / user | User preferences, project conventions |

> Most simple agents only use in-context memory. For long-running or persistent agents, you need external or episodic memory.

---

## Tool Use / Function Calling

Tools are how agents interact with the world. You define them, the LLM decides when and how to call them.

### Defining a tool (Anthropic API)

```python
tools = [
    {
        "name": "search_web",
        "description": "Search the web for current information. Use when you need facts after your training cutoff or real-time data.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query"
                }
            },
            "required": ["query"]
        }
    }
]

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    tools=tools,
    messages=[{"role": "user", "content": "What's the latest news on AI regulation in the EU?"}]
)
```

### The tool call loop

```python
while response.stop_reason == "tool_use":
    # Extract tool calls from the response
    tool_use = next(b for b in response.content if b.type == "tool_use")

    # Execute the tool
    result = execute_tool(tool_use.name, tool_use.input)

    # Feed the result back to Claude
    messages.append({"role": "assistant", "content": response.content})
    messages.append({
        "role": "user",
        "content": [{"type": "tool_result", "tool_use_id": tool_use.id, "content": result}]
    })

    response = client.messages.create(model="claude-sonnet-4-6", tools=tools, messages=messages)
```

---

## Common Agentic Patterns

### Single Agent
One LLM with access to multiple tools. Handles the full task end-to-end.

**Good for:** Self-contained tasks — research, writing, analysis, code generation.

### Orchestrator + Workers
A "manager" agent breaks a task into subtasks and delegates to specialised "worker" agents.

```
Orchestrator: "Write a competitive analysis report"
    ├── Worker A: "Research Company X"
    ├── Worker B: "Research Company Y"
    └── Worker C: "Synthesise findings into a report"
```

**Good for:** Parallel workloads, tasks requiring different specialisations.

### Generator + Critic
One agent generates output, another evaluates it and sends feedback until quality is acceptable.

```
Generator: Writes a first draft
Critic: "The argument in paragraph 3 is weak — add evidence"
Generator: Revises based on feedback
Critic: "Approved"
```

**Good for:** High-quality writing, code generation with automated review, alignment checking.

### RAG Agent
An agent that uses retrieval as one of its tools — it decides *when* to search your knowledge base rather than always retrieving.

**Good for:** Q&A bots, assistants that need to balance general knowledge with private knowledge.

---

## Planning

Complex agents need a planning step before acting. Two approaches:

**Explicit planning** — ask the model to produce a plan first, get approval, then execute:
```
"Before you start, outline the steps you'll take to complete this task.
List them as a numbered plan. I'll approve before you proceed."
```

**Chain-of-thought planning** — let the model plan internally in each Thought step (ReAct style).

> For high-stakes or irreversible actions, always use explicit planning with human approval in the loop.

---

## When Agents Go Wrong

| Failure mode | Cause | Prevention |
|-------------|-------|-----------|
| **Infinite loops** | Model keeps trying and failing without recognising it's stuck | Set a max step limit; add a "stuck" detection prompt |
| **Tool misuse** | Model calls the wrong tool or with bad arguments | Write detailed tool descriptions; add input validation |
| **Context overflow** | Long tasks exhaust the context window | Summarise intermediate results; use external memory |
| **Compounding errors** | Early mistake leads to increasingly bad subsequent steps | Add checkpoints; ask model to verify key facts before continuing |
| **Prompt injection** | Malicious content in tool results hijacks the agent's behaviour | Treat all tool results as untrusted; add a safety layer |

---

## Frameworks

| Framework | Language | Best for |
|-----------|----------|---------|
| **LangChain** | Python / JS | Broad ecosystem, many integrations |
| **LlamaIndex** | Python | RAG-heavy agentic workflows |
| **Pydantic AI** | Python | Type-safe, structured outputs |
| **CrewAI** | Python | Multi-agent orchestration |
| **Claude Code SDK** | Python / TS | Agents built on top of Claude Code |
| **Anthropic API (raw)** | Any | Full control, no abstraction overhead |

> Start with the raw Anthropic API to understand what's happening. Add a framework once you know what problem it's solving for you.

---

## The Agentic Mindset

Building agents well requires a shift in thinking:

- **Design for failure** — assume tools will sometimes return bad data or errors
- **Keep humans in the loop** for anything irreversible (sending emails, deleting data, spending money)
- **Log everything** — agent reasoning is hard to debug without a full trace of thoughts and actions
- **Start narrow** — a focused agent that does one thing well is more useful than a general agent that does many things poorly
- **Evaluate relentlessly** — define what "success" looks like before you build

---

## Further Reading

- **Anthropic tool use docs**: https://docs.anthropic.com/en/docs/tool-use
- **DeepLearning.AI — AI Agents in LangGraph**: https://learn.deeplearning.ai
- **Anthropic's "Building Effective Agents"** (blog post): https://www.anthropic.com/research/building-effective-agents
