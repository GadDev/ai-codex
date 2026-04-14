---
title: AI Evaluation & Benchmarks
tags: [benchmarks, MMLU, HumanEval, evals, LLM-as-judge, RAGAS, testing]
source: Course notes + research papers
---

# AI Evaluation & Benchmarks

How to measure LLM quality — standard benchmarks, what they actually test, and how to build evals for your own use case.

---

## Why Evaluation Is Hard

LLMs produce free-form text. Evaluating "good" requires judgement — which is expensive, subjective, and hard to scale. The field has converged on three approaches: academic benchmarks, human preference ratings, and LLM-as-judge.

---

## Academic Benchmarks

| Benchmark | Questions | Topic |
|-----------|-----------|-------|
| **MMLU** | 15,908 | 57 subjects (law, medicine, maths…) |
| **HumanEval** | 164 | Python coding — does it pass unit tests? |
| **MATH** | 12,500 | Competition maths (AMC/AIME level) |
| **GPQA Diamond** | 448 | PhD-level science |
| **TruthfulQA** | 817 | Factual accuracy — does the model hallucinate? |
| **GSM8K** | 8,500 | Grade school maths word problems |
| **BigBench Hard** | 6,511 | Logical reasoning |

**Critical caveat**: Benchmarks degrade when models train on them. Treat published scores as rough signals, not ground truth.

---

## Human Preference — Chatbot Arena

The **LMSYS Chatbot Arena** (chat.lmsys.org) is the gold standard for real-world quality:

1. Two random models answer the same user question (blind)
2. Users vote which response is better
3. Elo ratings computed from millions of votes

Why it's more trustworthy: novel prompts (no overfitting), real users, continuously updated.

---

## LLM-as-Judge

Use a strong model (Claude Opus or GPT-4) to evaluate outputs — scales cheaply while approximating human judgement.

```python
import anthropic, json

client = anthropic.Anthropic()

def evaluate_response(question, response, reference):
    result = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": f"""Rate this response (1-5 each):
Question: {question}
Reference: {reference}
Response: {response}

JSON: {{"accuracy": N, "completeness": N, "clarity": N, "reasoning": "..."}}"""}]
    )
    return json.loads(result.content[0].text)
```

---

## Building Evals for Your Own Use Case

### Step 1: Golden dataset

Collect 50–200 real inputs with ideal outputs verified by humans.

### Step 2: Define metrics

| Task | Good metrics |
|------|-------------|
| Q&A / RAG | Faithfulness, answer relevance |
| Summarisation | Coverage, no hallucinations |
| Code gen | Pass rate on unit tests |
| Extraction | Exact match, F1 |

### Step 3: Run and score

```python
def run_eval(dataset, model="claude-sonnet-4-6"):
    results = []
    for example in dataset:
        response = client.messages.create(
            model=model, max_tokens=512,
            messages=[{"role": "user", "content": example["input"]}]
        )
        score = evaluate_response(example["input"], response.content[0].text, example["expected"])
        results.append({"score": score, **example})
    return results
```

### Step 4: Track over time

Run evals every time you change your system prompt, switch models, or update your RAG pipeline. Tools: **Braintrust**, **LangSmith**, **Weights & Biases**.

---

## RAG-Specific Metrics (RAGAS)

| Metric | Measures |
|--------|---------|
| **Faithfulness** | Does the answer only use retrieved context? |
| **Answer relevance** | Does the answer address the question? |
| **Context recall** | Were the right chunks retrieved? |
| **Context precision** | Were retrieved chunks all useful? |

```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_recall

results = evaluate(dataset=eval_dataset, metrics=[faithfulness, answer_relevancy, context_recall])
```

---

## Common Pitfalls

**Benchmark leakage**: Training data may include benchmark answers → inflated scores.
**Reference bias**: LLM judges prefer longer responses — counter with pairwise comparisons.
**Dataset drift**: Update your golden dataset regularly with fresh production samples.

---

## Further Reading

- LMSYS Arena: https://chat.lmsys.org
- Open LLM Leaderboard: https://huggingface.co/spaces/HuggingFaceH4/open_llm_leaderboard
- RAGAS: https://docs.ragas.io
- Braintrust: https://braintrustdata.com
