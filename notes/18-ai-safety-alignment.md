---
title: AI Safety & Alignment
emoji: 🛡️
tags: [safety, alignment, rlhf, constitutional-ai, anthropic, interpretability]
date: 2025-01
---

# AI Safety & Alignment

Why the people building AI are also worried about it — and what's being done.

---

## What is Alignment?

An **aligned AI** is one whose goals and behaviours match what humans actually want — not just what they were literally instructed to do.

This sounds simple but is surprisingly hard. A naive AI optimising for "maximise user engagement" might learn to make content more addictive rather than more valuable. An AI told to "keep the paperclip factory running" in a thought experiment might convert all matter into paperclips. These are toy examples, but they illustrate a real problem: **optimising for a proxy goal can diverge badly from the intended goal**.

Alignment research asks: how do we specify what we want precisely enough that powerful AI systems actually do it?

---

## Why it Matters Now

Current AI systems are already capable enough to cause harm if misused or misconfigured — through misinformation, automated scams, biased decisions, or simply doing the wrong thing confidently. As models become more capable and autonomous (agentic), the stakes increase.

The core concern isn't science fiction. It's that we are building systems we don't fully understand, deploying them at scale, and learning about their failure modes after the fact.

---

## Key Concepts

### RLHF — Reinforcement Learning from Human Feedback

The dominant technique for aligning LLMs. The process:

1. **Pre-train** the base model on text (it can generate text but has no values)
2. **Fine-tune** with supervised learning on human-written examples of good responses
3. **Train a reward model** — humans rank different model outputs from best to worst
4. **Use RL** to optimise the LLM to produce outputs the reward model scores highly

RLHF is what turns a raw language model into an assistant that refuses harmful requests, admits uncertainty, and tries to be helpful. ChatGPT, Claude, and Gemini all use variants of this.

**Limitation:** The reward model itself can be gamed. If Claude learns to "look good" according to the reward model rather than actually being good, you get "sycophancy" — telling users what they want to hear.

---

### Constitutional AI (Anthropic's approach)

Anthropic's innovation on top of RLHF. Instead of relying purely on human feedback, Claude is trained with a written **constitution** — a set of principles like:

- Choose responses that are least likely to cause harm
- Avoid giving responses a thoughtful Anthropic employee would find embarrassing
- Prefer honest responses even when they're uncomfortable

Claude critiques its own outputs against these principles (using AI feedback, not just human feedback), then revises. This makes the alignment process more transparent and scalable.

---

### Key Risk Categories

| Risk                       | Description                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------- |
| **Misuse**                 | People deliberately using AI for harm (fraud, disinformation, bioweapons research) |
| **Misalignment**           | AI pursuing goals that diverge from human intentions                               |
| **Bias & fairness**        | AI systems that systematically disadvantage groups                                 |
| **Concentration of power** | AI capabilities controlled by too few organisations                                |
| **Autonomy risk**          | Agentic AI taking irreversible actions without adequate oversight                  |

---

### Anthropic's "Responsible Scaling Policy"

Anthropic has committed to pausing or restricting development of more powerful models if they detect certain dangerous capability thresholds — even if competitors don't. This is a voluntary commitment but represents an attempt to create accountability structures before regulators do.

---

## Key Thinkers & Resources

| Person / Resource                                                   | Why they matter                                                  |
| ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Dario Amodei** (Anthropic CEO) — "Machines of Loving Grace" essay | Optimistic long-term vision for beneficial AI                    |
| **Paul Christiano** (ARC Evals)                                     | Key RLHF inventor, now focused on AI evaluation                  |
| **Stuart Russell** — _Human Compatible_ (book)                      | Accessible case for why alignment is hard and how to approach it |
| **80,000 Hours** — 80000hours.org                                   | Career advice for AI safety; excellent podcast                   |
| **The Alignment Forum** — alignmentforum.org                        | Technical research community                                     |
| **Anthropic's safety research** — anthropic.com/research            | Interpretability, sleeper agents, model welfare                  |

---

## The Interpretability Frontier

One of Anthropic's most interesting research areas: **mechanistic interpretability** — opening up the black box to understand _how_ models produce their outputs, not just _what_ they produce.

If we can understand which circuits inside a model are responsible for which behaviours, we can:

- Detect deceptive reasoning before it surfaces in outputs
- Verify that safety training actually changed the right internal processes
- Build more trustworthy AI from the ground up

This is hard, unsolved, and genuinely important.
