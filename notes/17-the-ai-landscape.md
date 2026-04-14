---
title: The AI Landscape
emoji: 🗺️
tags: [landscape, labs, openai, anthropic, google, meta, resources]
date: 2025-01
---

# The AI Landscape

A map of the key players, their models, their philosophy, and how to stay current in a field that moves faster than almost any other.

---

## The Major Labs

### Anthropic

**Focus:** Safe, reliable, interpretable AI
**Key models:** Claude (Haiku, Sonnet, Opus)
**Known for:** Constitutional AI, long context windows, strong reasoning, focus on safety research
**Products:** Claude.ai, Claude API, Claude Code
**Website:** https://anthropic.com

Founded in 2021 by former OpenAI researchers including Dario and Daniela Amodei. Anthropic's defining characteristic is treating AI safety as a core research agenda, not an afterthought. Constitutional AI — where Claude is trained to follow a set of principles — is their flagship contribution to alignment research.

---

### OpenAI

**Focus:** AGI development and commercialisation
**Key models:** GPT-4o, o1, o3, DALL-E 3, Whisper, Sora
**Known for:** ChatGPT (200M+ users), pioneering large-scale LLMs, image and video generation
**Products:** ChatGPT, OpenAI API, Codex
**Website:** https://openai.com

Founded in 2015, OpenAI ignited the current AI era with GPT-3 (2020) and ChatGPT (2022). Their "o-series" reasoning models (o1, o3) introduced chain-of-thought at inference time — a major leap in problem-solving capability.

---

### Google DeepMind

**Focus:** Scientific and general AI research
**Key models:** Gemini 1.5 Pro/Flash, Gemma (open), AlphaFold
**Known for:** Pioneering deep learning research (AlphaGo, AlphaFold), transformer architecture (from the 2017 paper), largest context windows (1M tokens in Gemini 1.5 Pro)
**Products:** Gemini (consumer + API), Google AI Studio, Vertex AI
**Website:** https://deepmind.google

The merger of Google Brain and DeepMind in 2023 created the world's largest AI research organisation. AlphaFold — which predicted the structure of nearly every known protein — is arguably the most impactful scientific AI application to date.

---

### Meta AI

**Focus:** Open-source AI research
**Key models:** Llama 3 (8B, 70B, 405B), Code Llama, SAM (image segmentation)
**Known for:** Releasing powerful open-weight models that anyone can download and run
**Products:** Meta AI assistant, open-source releases via Hugging Face
**Website:** https://ai.meta.com

Meta's open release strategy has been transformative. The Llama series — particularly Llama 3 — has enabled a global ecosystem of fine-tuned models and local inference. If you're running AI on your own hardware, you're almost certainly using a Llama derivative.

---

### Mistral AI

**Focus:** Efficient, open European AI
**Key models:** Mistral 7B, Mixtral 8x7B (mixture of experts), Mistral Large
**Known for:** Punching above their weight — Mistral 7B outperformed much larger models at launch
**Products:** La Plateforme (API), Le Chat (consumer)
**Website:** https://mistral.ai

Founded in Paris in 2023, Mistral has become the leading European AI lab. Their mixture-of-experts architecture (Mixtral) is highly efficient — only a subset of parameters activate per token, giving GPT-4-level performance at a fraction of the compute cost.

---

### Others Worth Knowing

| Lab              | Notable for                                           |
| ---------------- | ----------------------------------------------------- |
| **Cohere**       | Enterprise-focused embeddings and RAG, Command models |
| **xAI (Grok)**   | Elon Musk's lab, Grok model integrated with X/Twitter |
| **Stability AI** | Stable Diffusion (open-source image generation)       |
| **Runway**       | Video generation (Gen-2, Gen-3)                       |
| **ElevenLabs**   | State-of-the-art voice cloning and TTS                |

---

## How to Stay Current

The field moves fast. Here's a practical reading diet:

| Source                                        | What it covers                          | Signal quality   |
| --------------------------------------------- | --------------------------------------- | ---------------- |
| **Anthropic news** — anthropic.com/news       | Claude releases, safety research        | High             |
| **Simon Willison's blog** — simonwillison.net | LLM developments, tools, weekly digests | Very high        |
| **The Batch** — deeplearning.ai/the-batch     | Weekly AI newsletter by Andrew Ng       | High             |
| **Andrej Karpathy on X** — @karpathy          | Deep technical commentary               | High             |
| **Papers With Code** — paperswithcode.com     | Latest research with implementations    | High (technical) |
| **Hugging Face blog** — huggingface.co/blog   | Open model releases, research           | High             |
| **r/MachineLearning**                         | Research discussions, paper reactions   | Medium           |

> 💡 Don't try to read everything. Follow 2–3 curated sources and go deep when something catches your attention.
