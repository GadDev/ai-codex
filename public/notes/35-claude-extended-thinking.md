---
title: Claude Extended Thinking
tags: [extended-thinking, thinking, reasoning, budget-tokens, chain-of-thought]
source: Anthropic docs
---

# Claude Extended Thinking 🧠

Extended thinking lets Claude reason through hard problems step-by-step before answering — trading latency for accuracy.

---

## What It Is

When thinking is enabled, Claude produces an internal `thinking` block before its final answer. This reasoning is visible to you but not re-sent to the model — it's a scratchpad, not conversation history.

```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=16000,           # must be > budget_tokens
    thinking={
        "type": "enabled",
        "budget_tokens": 10000  # max tokens Claude can use for reasoning
    },
    messages=[{
        "role": "user",
        "content": "A snail travels at 0.03 mph. A garden is 200m long. If it starts at 6 AM, when does it reach the other end?"
    }]
)

for block in response.content:
    if block.type == "thinking":
        print("=== THINKING ===")
        print(block.thinking)
    elif block.type == "text":
        print("=== ANSWER ===")
        print(block.text)
```

---

## Budget Tokens

`budget_tokens` sets the *maximum* reasoning budget — Claude uses what it needs, not necessarily all of it.

| Task complexity | Suggested budget |
|---|---|
| Simple reasoning | 1,000 – 2,000 |
| Multi-step maths | 5,000 – 8,000 |
| Complex analysis | 10,000 – 16,000 |
| Hardest problems | Up to 32,000 |

**Rule**: `max_tokens` must always be greater than `budget_tokens`.

---

## When to Use Extended Thinking

✅ **Use it for**:
- Complex maths or logic puzzles
- Multi-step reasoning where errors compound
- Code problems requiring careful planning
- Ambiguous tasks where thinking reveals assumptions
- Anything where accuracy > speed

❌ **Skip it for**:
- Simple factual questions
- Summarisation or formatting tasks
- High-throughput / low-latency pipelines

---

## Interpreting Thinking Traces

Thinking blocks reveal *how* Claude approaches a problem:

- **Debugging wrong answers** — see where reasoning went off track
- **Prompt iteration** — identify what information Claude was missing
- **Trust calibration** — confident, linear thinking → reliable; circular thinking → flag for review

```python
thinking_text = thinking_block.thinking
if "I'm not sure" in thinking_text or "unclear" in thinking_text.lower():
    flag_for_human_review(response)
```

---

## Streaming with Thinking

```python
with client.messages.stream(
    model="claude-opus-4-6",
    max_tokens=16000,
    thinking={"type": "enabled", "budget_tokens": 8000},
    messages=[{"role": "user", "content": "..."}]
) as stream:
    for event in stream:
        if hasattr(event, 'type'):
            if event.type == 'content_block_start':
                print(f"\n[{event.content_block.type.upper()}]")
            elif event.type == 'content_block_delta':
                if hasattr(event.delta, 'thinking'):
                    print(event.delta.thinking, end='', flush=True)
                elif hasattr(event.delta, 'text'):
                    print(event.delta.text, end='', flush=True)
```

---

## Cost Considerations

Thinking tokens are billed at the same rate as output tokens. A 10,000-token thinking budget can cost 5–10× more than a standard request. Profile before enabling in production.

---

## Further Reading

- Extended thinking guide: https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking
- Cookbook: https://github.com/anthropics/anthropic-cookbook/tree/main/extended_thinking
