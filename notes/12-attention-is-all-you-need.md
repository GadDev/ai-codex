---
title: "Attention Is All You Need" — Plain Language Explanation
tags: [transformers, attention, paper, deep-learning, architecture, GenAI, history]
source: Vaswani et al. 2017 — personal notes
---

# "Attention Is All You Need" — Plain Language

*Vaswani, A. et al. (2017). Google Brain / Google Research.*

This is the paper that changed everything. Published in 2017, it introduced the **Transformer architecture** — the foundation of GPT, BERT, Claude, Gemini, and every major language model in existence today. Here's what it actually says, in plain language.

---

## The Problem It Solved

Before 2017, the dominant approach to language tasks (translation, summarisation, question answering) was **Recurrent Neural Networks (RNNs)** and their variants (LSTMs, GRUs).

RNNs work like this: they read a sentence **one word at a time**, left to right, keeping a running memory of what they've read so far. Like a person reading with a very limited short-term memory.

This had two critical problems:

**Problem 1 — Sequential, so slow to train.** Because each word depended on processing the previous word first, you couldn't parallelise the training. Modern GPUs are built for massively parallel computation — RNNs wasted most of that.

**Problem 2 — Poor long-range memory.** By the time an RNN reached the 50th word in a sentence, its "memory" of word 1 had been compressed, diluted, and partially lost through the chain of processing steps. Long sentences were genuinely hard.

> Think of it like a game of telephone: by the time a message passes through 50 people, it's been distorted.

---

## The Key Idea: Attention

The paper's central insight is elegant: **instead of reading words one at a time in sequence, let every word look directly at every other word — all at once.**

This is the attention mechanism. For any word in a sentence, the model computes a score for every other word: "how relevant is *this* word to understanding *that* word?" These scores are used to build a weighted summary — each word gets a representation that's informed by the words most relevant to it.

### A concrete example

Take the sentence: *"The animal didn't cross the street because **it** was too tired."*

What does "it" refer to — the animal or the street? A human knows immediately: "it" = the animal, because animals get tired, not streets.

An RNN would struggle with this if the sentence were long, because "animal" appeared far back. An attention mechanism solves it by letting "it" directly attend to both "animal" and "street", compute that "animal" is far more relevant (semantically), and weight its representation accordingly.

---

## How the Transformer Works

The Transformer has two halves:

- **Encoder** — reads the input (e.g. a sentence in French) and builds rich representations of it
- **Decoder** — generates the output (e.g. the English translation) one token at a time, attending to the encoder's representations

For text generation tasks (like GPT, Claude), only the decoder half is used.

### The three key components

**1. Multi-Head Attention**

Instead of computing attention once, the Transformer does it multiple times in parallel, each time focusing on different aspects of the relationships between words. One "head" might focus on grammatical agreement. Another on semantic similarity. Another on coreference (what "it" refers to).

These multiple perspectives are then combined into a single rich representation.

**2. Feed-Forward Layers**

After the attention step, each position's representation is passed through a small neural network independently. This is where the model applies learned "knowledge" — think of it as the layer where factual associations and language patterns are stored.

**3. Positional Encoding**

Since the Transformer reads all words simultaneously (not sequentially), it has no inherent sense of word order. Positional encodings are added to each word's representation to inject information about where in the sentence it sits.

---

## Why It Was Revolutionary

### 1. Parallelisation → Speed
Because all words are processed simultaneously rather than one at a time, Transformers can be trained much faster on GPUs. This meant researchers could train much larger models than was feasible with RNNs.

### 2. Better Long-Range Understanding
Every word can attend to every other word with the same computational cost, regardless of distance. There's no degradation over long sequences. A word at position 1 is just as accessible to a word at position 500 as to its immediate neighbour.

### 3. Scale
Both advantages above — speed and quality — compound as models get bigger. Scaling laws (see: AI Technical Concepts note) kicked in, and researchers discovered that just making Transformers larger consistently improved performance. This triggered the race that produced GPT-3, GPT-4, Claude, and everything that followed.

---

## The Cascade of Impact

```
2017 — "Attention Is All You Need" published
  ↓
2018 — BERT (Google): encoder-only transformer, fine-tunable for any NLP task
  ↓
2018 — GPT-1 (OpenAI): decoder-only transformer for text generation
  ↓
2020 — GPT-3: 175 billion parameters, few-shot learning emerges
  ↓
2022 — ChatGPT: GPT-3.5 + RLHF makes it conversational
  ↓
2023 — GPT-4, Claude 2, Gemini: multimodal, reasoning improvements
  ↓
2024–present — Claude 3/4, GPT-4o, Gemini 1.5: massive context windows,
               tool use, agents — all built on the same Transformer core
```

Every model in that list is a Transformer. The 2017 paper described the engine. Everything since has been about making the engine bigger, training it smarter, and pointing it at new tasks.

---

## The Title, Explained

*"Attention Is All You Need"* is a deliberate provocation. It's saying: you don't need recurrence (RNNs), you don't need convolutions (CNNs), you don't need complex sequential processing machinery. **Attention alone is sufficient** to model the relationships in language — and it does it better.

The authors were right.

---

## Further Reading

- **The actual paper** (surprisingly readable): https://arxiv.org/abs/1706.03762
- **The Illustrated Transformer** — Jay Alammar's visual walkthrough: https://jalammar.github.io/illustrated-transformer/
- **Andrej Karpathy — "Let's build GPT from scratch"** — builds the decoder Transformer in Python live: https://www.youtube.com/watch?v=kCc8FmEb1nY
