---
title: The Future of AI Development
tags: [future, inference-scaling, open-source, EU-AI, roadmap, skills]
source: Course notes + research
---

# The Future of AI Development

Where things are heading — and what skills to build now to stay relevant.

---

## The Big Shifts Underway

### 1. Inference-Time Scaling

Training bigger models is hitting diminishing returns. The new frontier: **spending more compute at inference time** to improve answer quality.

- **Chain-of-thought** (o1, o3, DeepSeek R1): models "think" before answering — longer internal reasoning → better answers on hard problems
- **Monte Carlo Tree Search**: generate many candidate answers, score them, return the best
- **Implication for developers**: faster isn't always better — for complex tasks, slower "thinking" models often outperform faster ones significantly

### 2. Open-Source Closing the Gap

Llama 3 (Meta), Mistral, Qwen (Alibaba), DeepSeek, Phi (Microsoft) — the gap with GPT-4 / Claude closes every 3–6 months.

| Model family | Organisation | Self-hostable |
|---|---|---|
| Llama 3.1 / 3.3 | Meta | ✅ |
| Mistral / Mixtral | Mistral AI | ✅ |
| Qwen 2.5 | Alibaba | ✅ |
| DeepSeek R1 | DeepSeek | ✅ |
| Phi-4 | Microsoft | ✅ |

**For European developers**: self-hostable models are the path to GDPR compliance without data leaving your infrastructure.

### 3. Specialised Hardware

- **Groq / Cerebras**: inference chips running open-source models at 500–1000 tokens/second (vs ~60 for GPU)
- **Apple Silicon**: run small models (Llama, Phi) entirely on MacBook / iPhone — offline, private, free
- **Implication**: AI capabilities will increasingly run on-device, not just in the cloud

### 4. AI-Native Development Workflows

Coding assistants (Cursor, GitHub Copilot, Windsurf) are already changing how software is written. By 2026:
- AI writes the boilerplate, humans write the architecture and tests
- Agent pipelines replace many manual data pipelines
- The best developers are those who can direct AI effectively, not just write code

---

## What the EU AI Act Means for Your Work

- **General Purpose AI (GPAI) models** (like Claude, GPT-4): must provide technical documentation and comply with copyright law
- **High-risk AI** (hiring, credit scoring, biometrics, law enforcement): full conformity assessment, human oversight, data governance
- **Most SaaS apps**: not high-risk — standard security + GDPR suffices
- **Applies from**: August 2025 (GPAI provisions), August 2026 (high-risk)

Practical advice: document your system prompts, log model outputs for audit trails, build human-review into consequential decisions.

---

## Skills That Will Matter

### Durable skills (won't be automated soon)
- System design & architecture — deciding *what* to build
- Evaluation design — knowing when the AI is wrong
- Security & trust — protecting users from model failures
- Product sense — understanding what problems are worth solving

### AI-specific skills to build now
- Prompt engineering & system prompt design
- RAG pipeline design and evaluation (RAGAS, Braintrust)
- Agentic workflow design (tool use, human-in-the-loop, safety)
- LLM evaluation — building golden datasets, running evals on every change
- Fine-tuning for narrow tasks
- Multi-modal app development (vision, audio, computer use)

### Tools to learn
- Anthropic SDK + Claude API
- LangGraph (for complex agents)
- Pydantic AI (for structured outputs)
- Langfuse or Braintrust (for observability and evals)
- Ollama (for local model development)
- MCP (for tool integrations)

---

## The Developer Opportunity

AI is creating leverage, not just replacing work. The developers who will thrive:

1. **Use AI to build faster** — copilots, code gen, automated testing
2. **Build AI into products** — embed LLM capabilities in real workflows
3. **Understand the limits** — know when to trust the model and when to add guardrails
4. **Iterate on evals** — treat LLM outputs like test suites: measure before and after every change

The moat isn't knowing the APIs — it's knowing what to build with them and how to make it reliable.

---

## A Personal Roadmap

```
Month 1–2:  Master the Anthropic SDK, build 3 real projects
Month 3:    Build a RAG pipeline over real documents
Month 4:    Build a multi-step agent with tool use
Month 5:    Add evals, observability, cost controls
Month 6:    Ship something publicly — blog post, open-source, or product
```

---

## Further Reading

- Anthropic model spec: https://www.anthropic.com/claude/model-spec
- EU AI Act text: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689
- State of AI Report: https://www.stateof.ai
- Andrej Karpathy on "Software 2.0": https://karpathy.medium.com/software-2-0-a64152b37c35
