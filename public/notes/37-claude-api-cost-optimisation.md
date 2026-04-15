---
title: Claude API Cost Optimisation
tags: [cost, prompt-caching, batch-api, token-counting, model-tiering, cache_control]
source: Anthropic docs + pricing page
---

# Claude API Cost Optimisation 💰

Token counting, prompt caching, Batch API, and model tiering — four levers to dramatically cut costs.

---

## Understand Your Token Costs

Always check `response.usage` — the source of truth.

```python
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.usage)
# Usage(input_tokens=12, output_tokens=8, cache_read_input_tokens=0, cache_creation_input_tokens=0)
```

**Token counting before sending** (avoids surprises):

```python
count = client.messages.count_tokens(
    model="claude-sonnet-4-6",
    messages=[{"role": "user", "content": very_long_document}]
)
print(f"This request will use ~{count.input_tokens} input tokens")
```

---

## Prompt Caching — The Biggest Win

Cache a static prefix (system prompt + docs) so repeated requests don't re-process it.

```python
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    system=[
        {"type": "text", "text": "You are a legal assistant specialising in EU GDPR."},
        {
            "type": "text",
            "text": very_long_gdpr_document,      # 50K tokens of legal text
            "cache_control": {"type": "ephemeral"} # ← cache this prefix
        }
    ],
    messages=[{"role": "user", "content": "What are the data retention obligations?"}]
)
```

**First request**: full price for all tokens.  
**Subsequent requests**: cached tokens cost ~10% of normal input price.

| Model | Normal input | Cache read | Cache write |
|---|---|---|---|
| claude-opus-4-6 | $15 / MTok | $1.50 / MTok | $18.75 / MTok |
| claude-sonnet-4-6 | $3 / MTok | $0.30 / MTok | $3.75 / MTok |
| claude-haiku-4-5 | $0.80 / MTok | $0.08 / MTok | $1.00 / MTok |

Cache lifetime: 5 minutes (reset on each cache hit).

---

## Batch API — 50% Off for Async Work

For tasks that don't need real-time responses, use the Batch API and pay half price.

```python
batch = client.messages.batches.create(
    requests=[
        {
            "custom_id": f"req-{i}",
            "params": {
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 512,
                "messages": [{"role": "user", "content": doc}]
            }
        }
        for i, doc in enumerate(documents)
    ]
)

# Poll until done
import time
while True:
    batch = client.messages.batches.retrieve(batch.id)
    if batch.processing_status == "ended":
        break
    time.sleep(60)

# Retrieve results
for result in client.messages.batches.results(batch.id):
    print(result.custom_id, result.result.message.content[0].text)
```

**Best for**: overnight data processing, classification, summarisation pipelines, eval runs.

---

## Model Tiering — Pick the Right Tool

Not every task needs Opus.

| Task | Best model | Why |
|---|---|---|
| Complex reasoning, hard coding | claude-opus-4-6 | Highest capability |
| Most production tasks | claude-sonnet-4-6 | Best capability/cost ratio |
| Classification, summarisation, routing | claude-haiku-4-5 | 10–20× cheaper than Sonnet |
| Batch data processing | claude-haiku-4-5 | Fast + cheap at scale |

```python
# Route by complexity — use a cheap model to classify
def smart_route(user_query):
    classification = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=10,
        messages=[{"role": "user", "content": f"Is this query simple or complex? One word.\n\n{user_query}"}]
    ).content[0].text.strip().lower()

    return "claude-opus-4-6" if classification == "complex" else "claude-haiku-4-5-20251001"
```

---

## Cost Optimisation Checklist

- [ ] Use `count_tokens` before expensive calls during development
- [ ] Add `cache_control` to any static content > 1,024 tokens
- [ ] Use Batch API for non-real-time processing (50% saving)
- [ ] Route simple tasks to Haiku, complex tasks to Sonnet/Opus
- [ ] Set `max_tokens` as low as the task actually needs
- [ ] Monitor `cache_read_input_tokens` — if it's 0, your cache isn't hitting

---

## Further Reading

- Token counting: https://docs.anthropic.com/en/docs/build-with-claude/token-counting
- Prompt caching: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- Batch API: https://docs.anthropic.com/en/docs/build-with-claude/message-batches
- Model pricing: https://www.anthropic.com/pricing
