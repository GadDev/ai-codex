---
title: AI Models Benchmark — Proprietary vs Open Source
tags: [benchmarks, open-source, proprietary, GDPR, self-hosted, llama, mistral, Claude, GPT, on-premise, privacy, EU-AI-Act]
source: Course notes + Anthropic docs + EU regulatory texts
---

# AI Models Benchmark: Proprietary vs Open Source

A practical guide to comparing frontier AI models — with a focus on which can be **self-hosted** for building **GDPR-compliant** applications in Europe.

---

## Why This Matters for European Developers

The EU's GDPR has one rule that shapes every AI architecture decision: **personal data must not leave the EU without adequate protection**. When you call the OpenAI or Anthropic API, you're sending data to US-based servers. That's manageable with DPAs (Data Processing Agreements) — but some data categories (health, biometrics, legal) require stricter controls. **Self-hosting an open-source model keeps data entirely on your infrastructure**, eliminating the cross-border transfer problem entirely.

---

## The Benchmark Landscape

### Key Benchmarks Explained

| Benchmark | What it measures |
|-----------|-----------------|
| **MMLU** | Multitask Language Understanding — 57 subjects (law, medicine, maths…) |
| **HumanEval** | Code generation: does the code run and pass tests? |
| **MATH** | Competition-level maths reasoning |
| **GPQA** | Graduate-level science questions (PhD-hard) |
| **MT-Bench** | Multi-turn conversation quality, rated by GPT-4 as judge |
| **LMSYS Chatbot Arena** | Human preference votes in blind A/B comparisons |
| **BigBench Hard** | Logical reasoning tasks designed to defeat earlier models |
| **HellaSwag** | Common-sense reasoning / sentence completion |

> ⚠️ **Benchmark caveat**: Models can be (and often are) trained to score well on published benchmarks without being genuinely better. The LMSYS Chatbot Arena is the most trustworthy signal because it uses human blind comparisons on novel prompts.

---

## Proprietary Frontier Models (API Only)

These cannot be self-hosted. You call them via API; the provider processes your data.

### Anthropic Claude Family

| Model | Context | Strengths | Best for |
|-------|---------|-----------|----------|
| **claude-opus-4-6** | 200k tokens | Reasoning, nuance, coding, long docs | Complex tasks, research |
| **claude-sonnet-4-6** | 200k tokens | Best speed/quality balance | Production apps |
| **claude-haiku-4-5** | 200k tokens | Ultra-fast, very cheap | High-volume, latency-sensitive |

Claude differentiators: Constitutional AI safety training, strongest at following nuanced instructions, excellent at long-document analysis. GDPR: Anthropic offers EU Data Processing Agreements; data can be processed in EU regions.

### OpenAI GPT Family

| Model | Context | Strengths |
|-------|---------|-----------|
| **GPT-4o** | 128k tokens | Multimodal (vision + audio), tool use |
| **GPT-4o mini** | 128k tokens | Fast, cheap GPT-4 quality |
| **o3 / o3-mini** | 200k tokens | Extended reasoning ("thinking") mode |

### Google Gemini Family

| Model | Context | Strengths |
|-------|---------|-----------|
| **Gemini 2.5 Pro** | 1M tokens | Massive context, multimodal, coding |
| **Gemini 2.0 Flash** | 1M tokens | Fast + cheap at scale |

### xAI Grok

| Model | Notes |
|-------|-------|
| **Grok-3** | Real-time web access, strong at STEM |

---

## Open Source Models (Self-Hostable ✅)

These models can run on **your own servers** — on-premise in an EU data centre or on EU-hosted cloud VMs (OVHcloud, Hetzner, Scaleway, Deutsche Telekom OTC).

### Meta LLaMA Family

The most widely deployed open-source family. License: Meta LLaMA Community License (free for most commercial use; restrictions at 700M+ MAU).

| Model | Params | VRAM needed | Notes |
|-------|--------|------------|-------|
| **LLaMA 3.3 70B** | 70B | ~40 GB (2×A100) | Best quality in family |
| **LLaMA 3.1 8B** | 8B | ~8 GB (1×RTX 4090) | Fast, runs on consumer GPU |
| **LLaMA 3.2 3B / 1B** | 1–3B | ~4 GB | Edge / mobile deployment |
| **LLaMA 3.2 Vision 11B** | 11B | ~12 GB | Multimodal (image + text) |

**Quantised versions** (via llama.cpp / Ollama): A 70B model quantised to 4-bit runs in ~35 GB — fits 2× consumer GPUs or a single A10G.

### Mistral AI Family

French company ✅ — EU-based, strong GDPR story even on API. License: Apache 2.0 (truly free, including for commercial use).

| Model | Params | Notes |
|-------|--------|-------|
| **Mistral Large 2** | ~123B | Rivals GPT-4 on many tasks, strong at French/European languages |
| **Mistral Small 3.1** | 24B | Multimodal, excellent price/performance |
| **Mistral 7B v0.3** | 7B | The go-to small open model; fine-tunes easily |
| **Mixtral 8×7B** | 46.7B active | MoE architecture; fast inference |
| **Codestral** | 22B | Code-specialised, supports 80+ languages |

### Qwen (Alibaba) Family

License: Apache 2.0. Strong multilingual performance.

| Model | Notes |
|-------|-------|
| **Qwen2.5 72B** | Top open-source on many benchmarks (rivals LLaMA 70B) |
| **Qwen2.5-Coder 32B** | Best open-source coding model |
| **Qwen2.5-VL 7B** | Vision-language, runs on consumer hardware |

### Gemma (Google) Family

License: Gemma Terms of Use (free for commercial use). Designed for research + deployment.

| Model | Notes |
|-------|-------|
| **Gemma 3 27B** | Strong reasoning, EU-deployable |
| **Gemma 3 4B** | Runs on a Raspberry Pi 5 (!) |

### DeepSeek Family

License: MIT. Exceptional benchmark performance, controversial due to Chinese origin (data security considerations for sensitive use cases).

| Model | Notes |
|-------|-------|
| **DeepSeek-R1 671B** | Matches o1 on reasoning benchmarks |
| **DeepSeek-V3** | Strong general model |
| **DeepSeek-R1-Distill-Qwen-32B** | Smaller reasoning model, self-hostable |

---

## Self-Hosting Stack

### Quick Start: Ollama (local / single server)

```bash
# Install
curl -fsSL https://ollama.com/install.sh | sh

# Pull and run a model
ollama pull mistral:7b
ollama run mistral:7b

# Serve as OpenAI-compatible API
ollama serve  # → http://localhost:11434/v1
```

### Production: vLLM (high-throughput inference server)

```bash
pip install vllm

python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3.3-70B-Instruct \
  --tensor-parallel-size 2 \
  --dtype bfloat16 \
  --max-model-len 32768
```

vLLM gives you continuous batching, PagedAttention, and an OpenAI-compatible API — so you can swap it in wherever you'd use the OpenAI client.

### Python client (same code, local or cloud model)

```python
from openai import OpenAI  # works with any OpenAI-compatible server

# Switch between providers by changing base_url only
client = OpenAI(
    base_url="http://localhost:11434/v1",  # Ollama local
    # base_url="http://your-eu-server:8000/v1",  # vLLM on EU VM
    api_key="not-needed-for-local"
)

response = client.chat.completions.create(
    model="mistral:7b",
    messages=[{"role": "user", "content": "Explain GDPR Article 17 in plain English"}]
)
print(response.choices[0].message.content)
```

---

## GDPR Compliance Decision Tree

```
Does the data include personal information?
│
├── NO → Use any API freely (OpenAI, Anthropic, Gemini...)
│
└── YES → Is it sensitive data (health, biometric, legal)?
    │
    ├── NO → Can you sign a DPA with the API provider?
    │   ├── YES + EU data residency available → API with DPA ✅
    │   └── NO → Self-host in EU ✅
    │
    └── YES (sensitive) → Self-host in EU ✅ (safest)
                       OR → Mistral API (French company, EU DPA) ✅
```

### What "Self-hosted in EU" means in practice

- Server physically located in an EU member state
- You control the hardware or have a cloud VM in an EU region
- No data leaves that VM — model weights live there, inference happens there
- Logs and outputs stay on-premise

**EU-based cloud providers with GPU VMs:**
- 🇫🇷 **OVHcloud** — H100/A100 bare metal and VMs, French company
- 🇩🇪 **Hetzner** — Affordable GPU servers (A100), data centres in Germany + Finland
- 🇫🇷 **Scaleway** — H100 instances, part of Iliad group (French)
- 🇩🇪 **Deutsche Telekom OTC** — Enterprise-grade, German data sovereignty

---

## Performance vs Practicality Matrix

| Model | Quality | Speed | Cost | Self-host | GDPR-easy |
|-------|---------|-------|------|-----------|-----------|
| Claude Opus 4.6 | ⭐⭐⭐⭐⭐ | Slow | $$$ | ❌ | ⚠️ DPA needed |
| Claude Sonnet 4.6 | ⭐⭐⭐⭐ | Fast | $$ | ❌ | ⚠️ DPA needed |
| GPT-4o | ⭐⭐⭐⭐ | Fast | $$ | ❌ | ⚠️ DPA needed |
| Gemini 2.5 Pro | ⭐⭐⭐⭐ | Fast | $$ | ❌ | ⚠️ DPA needed |
| Mistral Large 2 | ⭐⭐⭐⭐ | Fast | $$ | ✅ | ✅ French company |
| LLaMA 3.3 70B | ⭐⭐⭐⭐ | Medium | Free | ✅ | ✅ On-premise |
| Mistral 7B | ⭐⭐⭐ | Very fast | Free | ✅ | ✅ On-premise |
| Qwen2.5 72B | ⭐⭐⭐⭐ | Medium | Free | ✅ | ✅ On-premise |
| Gemma 3 27B | ⭐⭐⭐ | Medium | Free | ✅ | ✅ On-premise |
| DeepSeek-R1 | ⭐⭐⭐⭐⭐ | Slow | Free | ✅ | ⚠️ Chinese origin |

---

## EU AI Act Considerations (2025–2026)

The EU AI Act (effective August 2024, enforced from 2025) adds requirements beyond GDPR:

- **General Purpose AI (GPAI) models** must publish technical documentation and training data summaries
- **High-risk AI systems** (hiring, credit, medical, law enforcement) face conformity assessments
- **Self-hosting** doesn't exempt you from AI Act if your *application* is high-risk — it's the use case that's regulated, not the model hosting
- Frontier models with >10^25 FLOPs training compute get additional obligations (systemic risk rules)

For most business apps (chatbots, document analysis, coding tools): **not high-risk** under the AI Act. Standard GDPR + data minimisation is sufficient.

---

## Recommended Setup for GDPR-Compliant EU Apps

**Prototype / low-sensitivity data:**
→ Anthropic Claude Sonnet or Mistral API with DPA signed

**Production / personal data:**
→ Mistral Large 2 via Mistral API (La Plateforme) — French company, EU data residency, best-in-class quality

**Sensitive data / healthcare / legal:**
→ LLaMA 3.3 70B or Mistral 7B self-hosted on OVHcloud or Hetzner
→ Fine-tune on your domain data for best results
→ Serve with vLLM behind your own authentication

**Coding assistant:**
→ Qwen2.5-Coder 32B or Codestral (Mistral) — both self-hostable, excellent on code benchmarks

---

## Further Reading

- Artificial Analysis benchmark leaderboard: https://artificialanalysis.ai
- LMSYS Chatbot Arena: https://chat.lmsys.org
- Open LLM Leaderboard (HuggingFace): https://huggingface.co/spaces/HuggingFaceH4/open_llm_leaderboard
- Mistral AI docs: https://docs.mistral.ai
- Ollama model library: https://ollama.com/library
- EU AI Act text: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689
- CNIL (French DPA) AI guidance: https://www.cnil.fr/en/artificial-intelligence
