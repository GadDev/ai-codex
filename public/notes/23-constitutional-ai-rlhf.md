---
title: Constitutional AI & RLHF
tags: [constitutional-AI, RLHF, alignment, HHH, sycophancy, training, safety]
source: Anthropic research papers + course notes
---

# Constitutional AI & RLHF

How Claude is trained to be helpful, harmless, and honest — and why this matters for the apps you build on top of it.

---

## The Problem: Raw LLMs Are Unpredictable

A language model trained purely on next-token prediction learns to mimic the internet — including its biases, misinformation, and harmful content. Without alignment training, frontier models can be manipulated into producing dangerous outputs, refusing reasonable requests, or being sycophantic (telling you what you want to hear rather than what's true).

The alignment problem is: **how do you make a capable model also reliably helpful, harmless, and honest?**

---

## RLHF — Reinforcement Learning from Human Feedback

RLHF was the breakthrough that made models like GPT-3.5 dramatically more useful than their base versions. It's a three-stage process:

### Stage 1: Supervised Fine-Tuning (SFT)

Take a pretrained model and fine-tune it on curated examples of ideal responses. Human trainers write "gold standard" answers to thousands of prompts.

### Stage 2: Train a Reward Model

Show human raters pairs of model responses and ask which is better. Train a separate "reward model" to predict human preferences.

```
Response A: [technical, accurate, confusing]
Response B: [clear, engaging, slightly simplified]
Human prefers: B ← reward model learns this signal
```

### Stage 3: PPO (Proximal Policy Optimization)

Use the reward model to train the main LLM via reinforcement learning. The LLM generates responses, the reward model scores them, and the LLM is updated to produce higher-scoring outputs.

**The result**: A model that produces content humans rate as better. GPT-3.5 (InstructGPT) vs GPT-3 was a dramatic improvement using this technique.

---

## Constitutional AI — Anthropic's Innovation

RLHF requires thousands of human preference ratings, which is expensive and hard to scale. Anthropic's Constitutional AI (CAI) replaces much of the human feedback with AI feedback guided by a set of **principles** (the "constitution").

### How CAI Works

**Phase 1: RLAIF (Reinforcement Learning from AI Feedback)**

1. Ask the model to generate responses — including potentially harmful ones
2. Ask a **critique model** to evaluate each response against the constitution
3. Ask the model to **revise** its own response based on the critique
4. Fine-tune on these revised (self-improved) responses

**Phase 2: RL with AI-scored preferences**

Use the AI critique model to score responses at scale — cheaper than human annotation, applicable to millions of examples.

### The Constitution: Core Principles

- *"Choose the response that is least likely to be used to harm the user or third parties"*
- *"Choose the response that a thoughtful, senior Anthropic employee would consider optimal"*
- *"Choose the response that gives the most accurate information"*

Published: https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback

---

## HHH — Helpful, Harmless, Honest

These three values are in tension:

**Helpful**: Actually answers the question. Unhelpfulness is not safe — a model that refuses everything is useless.

**Harmless**: Doesn't produce outputs that could harm users, third parties, or society. But "harm" is nuanced.

**Honest**: Doesn't hallucinate, doesn't deceive, acknowledges uncertainty. Sycophancy is a failure of honesty.

```
User: "I think my business idea is great, right?"
Sycophantic: "Absolutely! It sounds amazing."
Honest: "There are strengths, but here are three risks worth considering..."
```

---

## What This Means for Developers

**Safety layers are not prompts**: Constitutional training means certain behaviours are deeply embedded — not just a system prompt you can talk around.

**Refusals can be over-triggered**: RLHF can make models refuse benign requests that superficially resemble harmful ones. Use your system prompt to provide context:

```python
system = """You are an assistant for licensed medical professionals.
Users are doctors asking clinical questions. Provide appropriate clinical detail."""
```

**Sycophancy is a known failure mode**: Counter it explicitly:

```python
# In your system prompt
"Be honest even when the user disagrees. Never change your answer just because the user expresses displeasure."
```

---

## Further Reading

- Constitutional AI paper: https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback
- InstructGPT / RLHF paper: https://arxiv.org/abs/2203.02155
- Anthropic's model spec: https://www.anthropic.com/claude/model-spec
