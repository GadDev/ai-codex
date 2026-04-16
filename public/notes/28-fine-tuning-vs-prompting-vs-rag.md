---
title: Fine-tuning vs. Prompting vs. RAG
tags: [fine-tuning, prompting, RAG, comparison, decision-framework]
source: Course notes + Anthropic docs
---

# Fine-tuning vs. Prompting vs. RAG

Three ways to customise LLM behaviour — when to use each, and why starting simple usually wins.

---

## The Decision Framework

```
Does the model already know the domain?
├── YES → Start with prompting
└── NO  → Does the knowledge change frequently?
          ├── YES → RAG
          └── NO  → Fine-tuning (or RAG + prompting first)
```

---

## Prompting — Always Try First

**What it is**: Craft system prompts and few-shot examples to guide behaviour.

**Pros**: Zero cost, zero infrastructure, works immediately, easy to iterate.

**Cons**: Context window limits, knowledge cutoff baked in, prompt must travel with every request.

```python
system = """You are a customer support specialist for Acme Corp.
Always be concise. If you don't know, say so.
Never make up order numbers or delivery dates.

Examples:
User: Where is my order?
Assistant: Please share your order number and I'll look it up for you."""
```

**Use when**: The model already has the knowledge you need and you just want to shape tone, format, or persona.

---

## RAG — Retrieval-Augmented Generation

**What it is**: Embed your documents → store in a vector DB → retrieve relevant chunks at query time → inject into the prompt.

**Pros**: Live/updatable knowledge, source citations, no retraining, works with any model.

**Cons**: Retrieval can fail (bad embeddings, wrong chunks), adds latency and infrastructure, context window still limits how much you can inject.

```python
# Minimal RAG loop
def rag_answer(question, collection, client):
    # 1. Embed the question
    q_vec = embed(question)

    # 2. Retrieve top-k chunks
    results = collection.query(query_embeddings=[q_vec], n_results=5)
    context = "\n\n".join(results["documents"][0])

    # 3. Augment the prompt
    response = client.messages.create(
        model="claude-sonnet-4-6",
        system="Answer only using the provided context. Say 'I don't know' if not covered.",
        messages=[{"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}]
    )
    return response.content[0].text
```

**Use when**: Knowledge is proprietary, large, or changes over time (docs, support tickets, policies).

---

## Fine-tuning — Teach the Model New Behaviour

**What it is**: Continue training on your dataset to bake in specific knowledge, style, or format.

**Pros**: Smaller prompts (style is implicit), better performance on narrow tasks, consistent voice.

**Cons**: Expensive ($$$), slow to iterate, knowledge freezes at training time, needs 100–10,000 quality examples.

```jsonl
{"messages": [
  {"role": "user", "content": "Summarise this support ticket: ..."},
  {"role": "assistant", "content": "Category: Billing | Priority: High | Summary: ..."}
]}
```

**Use when**: You need a specific output format consistently, the task is very narrow and stable (classification, structured extraction), or prompting + RAG have genuinely hit a ceiling.

---

## Comparison Table

| | Prompting | RAG | Fine-tuning |
|---|---|---|---|
| **Setup time** | Minutes | Hours | Days–weeks |
| **Cost** | API calls only | API + vector DB | API + training cost |
| **Knowledge updates** | Edit prompt | Re-index docs | Retrain |
| **Knowledge cutoff** | Model's cutoff | Real-time | Training snapshot |
| **Best for** | Tone / format / persona | Private or live knowledge | Narrow task, consistent format |

---

## The Practical Playbook

1. **Start with prompting** — 80% of use cases solved here
2. **Add RAG** if you need private or recent knowledge
3. **Fine-tune only** if you've exhausted 1 & 2 and have quality training data

Combining all three is valid: fine-tune for style, RAG for knowledge, prompting for per-request context.

---

## Further Reading

- Anthropic prompt engineering guide: https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview
- OpenAI fine-tuning docs: https://platform.openai.com/docs/guides/fine-tuning
- RAG vs fine-tuning (Pinecone blog): https://www.pinecone.io/learn/retrieval-augmented-generation/
