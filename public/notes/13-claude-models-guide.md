---
title: Claude Models Guide
tags: [claude, models, API, opus, sonnet, haiku, parameters, pricing, context-window]
source: Anthropic docs + course notes
---

# Claude Models Guide

Anthropic's model family is tiered by capability and speed. Choosing the right model for the right task is one of the highest-leverage decisions you make when building with Claude.

---

## The Three Tiers

### Claude Opus — Maximum Intelligence
**Model string:** `claude-opus-4-6`

The most capable model in the family. Best for:
- Complex reasoning and multi-step analysis
- Tasks where quality matters more than speed or cost
- Research synthesis, nuanced writing, hard coding problems
- Evaluating or judging the output of other models

> Use Opus when you'd want your smartest colleague on the problem.

### Claude Sonnet — The Sweet Spot
**Model string:** `claude-sonnet-4-6`

The default choice for most production use cases. Balances intelligence and speed exceptionally well. Best for:
- Agentic workflows and multi-turn tasks
- Code generation and review
- Summarisation, extraction, and classification at scale
- Most things you'd build in a real product

> Sonnet is where you start. Move to Opus if quality isn't good enough; move to Haiku if cost is too high.

### Claude Haiku — Speed & Efficiency
**Model string:** `claude-haiku-4-5-20251001`

The fastest and most cost-effective model. Best for:
- High-volume, latency-sensitive tasks
- Simple extraction, classification, or routing
- Real-time applications (autocomplete, suggestions, streaming)
- Pre-processing inputs before sending to a larger model

> Think of Haiku as a smart, fast first pass — or the model handling your cheaper high-throughput tasks.

---

## Choosing a Model

| Task | Recommended model |
|------|------------------|
| Complex reasoning, strategy, research | Opus |
| Code generation & review | Sonnet |
| Agentic tasks with many steps | Sonnet |
| Summarisation at scale | Sonnet or Haiku |
| Real-time autocomplete / suggestions | Haiku |
| Input routing / classification | Haiku |
| Evaluating outputs of other models | Opus |
| Prototyping and experimentation | Sonnet |

---

## Key API Parameters

These parameters shape how Claude responds at the API level.

### `temperature`
Controls randomness. Range: `0.0` to `1.0`

| Value | Behaviour | Use for |
|-------|-----------|---------|
| `0.0` | Fully deterministic — same input → same output | Extraction, classification, code |
| `0.3–0.5` | Slight variation, still focused | Most writing tasks |
| `0.7–1.0` | Creative, varied, unpredictable | Brainstorming, creative writing |

### `max_tokens`
The maximum number of tokens Claude can generate in its response. Set this thoughtfully — too low truncates responses, too high wastes money on padding.

- Short answers / classifications: `256–512`
- Standard responses: `1024–2048`
- Long-form writing or code: `4096+`

### `system`
The system prompt — instructions that shape Claude's behaviour throughout the entire conversation. Set Claude's role, persona, constraints, and output format here rather than in every user message.

```python
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    system="You are a senior code reviewer. Be concise. Focus on correctness and security.",
    messages=[{"role": "user", "content": "Review this function: ..."}]
)
```

### `top_p` and `top_k`
Alternative sampling controls. In most cases, adjusting `temperature` is sufficient. Use `top_p` (nucleus sampling) when you want fine-grained control over the probability distribution of tokens.

### `stop_sequences`
A list of strings that will stop generation when encountered. Useful for structured outputs where you want Claude to stop at a specific delimiter.

---

## Context Windows

The context window is the total amount of text (input + output) a model can hold in one request.

| Model | Context window |
|-------|---------------|
| Claude Opus 4.6 | 200,000 tokens (~150,000 words) |
| Claude Sonnet 4.6 | 200,000 tokens |
| Claude Haiku 4.5 | 200,000 tokens |

> 200k tokens is roughly the length of two full novels. For most tasks, you will never hit this limit. For RAG and agentic workflows, it's a meaningful design consideration.

---

## Quick API Example (Python)

```python
import anthropic

client = anthropic.Anthropic()  # uses ANTHROPIC_API_KEY from environment

message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    temperature=0.3,
    system="You are a helpful assistant who answers concisely.",
    messages=[
        {"role": "user", "content": "What is the difference between RAG and fine-tuning?"}
    ]
)

print(message.content[0].text)
```

---

## Further Reading
- Anthropic API docs: https://docs.anthropic.com
- Model comparison: https://www.anthropic.com/claude
