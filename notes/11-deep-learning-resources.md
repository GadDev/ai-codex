---
title: Deep Learning — Learning Resources
tags: [deep-learning, LLMs, transformers, NLP, courses, huggingface, fast.ai, deeplearning.ai]
source: Curated resource list
---

# Deep Learning — Learning Resources

A curated set of courses and paths for going from AI user to someone who genuinely understands what's happening under the hood — from transformers and attention to building and fine-tuning your own models.

---

## 🤗 HuggingFace LLM Course
**URL:** https://huggingface.co/learn/llm-course/chapter1/1  
**Level:** Beginner → Intermediate  
**Free:** Yes

The most practical introduction to working with large language models using the HuggingFace ecosystem — the dominant open-source toolkit for LLMs.

### What you'll learn
- What transformers are and why they work
- How to use pre-trained models for text classification, generation, summarisation, and translation
- Fine-tuning models on your own data with the `Trainer` API
- Building datasets and working with the `datasets` library
- Deploying models to the HuggingFace Hub

### Why it matters
HuggingFace is the GitHub of machine learning models. Understanding this ecosystem means you can download, run, adapt, and share state-of-the-art models without training from scratch. Chapter 1 starts gently — no ML background required.

### Suggested path
Start at Chapter 1 and follow it linearly. Each chapter builds on the last. Set up a free Google Colab account to run the notebooks without any local GPU.

---

## fast.ai — Practical Deep Learning for Coders
**URL:** https://course.fast.ai/  
**Level:** Beginner → Advanced  
**Free:** Yes

Jeremy Howard's legendary course, famous for its **top-down, practical-first approach**. You build things that work on Day 1, and understand the theory as you need it — the opposite of most academic curricula.

### What you'll learn
- Image classification, NLP, tabular data, and recommendation systems
- PyTorch fundamentals taught through hands-on projects
- How modern architectures (ResNets, transformers, diffusion models) actually work
- Deploying models to production
- The fastai library — a high-level API built on top of PyTorch

### Why it matters
Fast.ai has produced some of the most impressive results in deep learning competitions by demystifying techniques that felt reserved for researchers. Jeremy Howard's teaching style is uniquely good at building genuine intuition.

### Suggested path
Part 1 (Lessons 1–8) is accessible to anyone who can code in Python. Don't skip the notebooks — the learning is in running and modifying the code. Part 2 goes deep into implementing things from scratch, including training diffusion models.

---

## DeepLearning.AI — How Transformer LLMs Work
**URL:** https://learn.deeplearning.ai/courses/how-transformer-llms-work  
**Level:** Intermediate  
**Free:** Yes

A focused short course by Andrew Ng's DeepLearning.AI, co-taught with Jay Alammar (creator of the famous "Illustrated Transformer" series). Covers the internal mechanics of transformer models with excellent visual explanations.

### What you'll learn
- The full transformer architecture from input to output
- How tokenisation and embeddings work
- The attention mechanism explained visually and mathematically
- How models generate text token by token (autoregressive decoding)
- The difference between encoder-only (BERT), decoder-only (GPT), and encoder-decoder (T5) architectures

### Why it matters
This course bridges the gap between "I use LLMs" and "I understand what LLMs are doing". After this, you'll read papers and blog posts about AI with much higher comprehension. Jay Alammar's visual style is particularly well-suited to understanding attention.

### Suggested path
Watch sequentially — each lesson builds on the previous. Budget 4–6 hours. The visual diagrams are key: pause and study them before moving on.

---

## DeepLearning.AI — NLP Specialization
**URL:** https://learn.deeplearning.ai/specializations/natural-language-processing  
**Level:** Intermediate → Advanced  
**Free:** Audit free on Coursera (certificate costs money)

A comprehensive 4-course specialization covering the full arc of NLP — from classic techniques all the way through transformers and attention. Built by deeplearning.ai in collaboration with Younes Bensouda Mourri and Łukasz Kaiser (a co-author of the original "Attention Is All You Need" paper).

### The 4 courses
1. **NLP with Classification and Vector Spaces** — Sentiment analysis, word vectors, PCA, machine translation
2. **NLP with Probabilistic Models** — Autocorrect, autocomplete, N-grams, Word2Vec
3. **NLP with Sequence Models** — RNNs, LSTMs, GRUs, named entity recognition
4. **NLP with Attention Models** — Transformers, BERT, T5, question answering, summarisation

### Why it matters
This is the most complete curriculum for understanding how we got from "bag of words" to GPT. Course 4 in particular gives you a rigorous grounding in attention mechanisms — the architecture that underpins every modern LLM including Claude.

### Suggested path
If you're in a hurry, jump straight to Course 4. If you want the full picture of how NLP evolved, start at Course 1 — the journey makes the transformer feel inevitable rather than magical.

---

## Suggested Learning Sequence

| If you want to… | Start with |
|----------------|-----------|
| Use models in code quickly | HuggingFace LLM Course |
| Understand transformers deeply, visually | How Transformer LLMs Work |
| Build and train models from scratch | fast.ai Part 1 → Part 2 |
| Get a complete academic NLP foundation | NLP Specialization |
| Go deep on the mathematics of attention | NLP Specialization Course 4 + "Attention Is All You Need" paper |

---

## Complementary Resources

- **The Illustrated Transformer** — Jay Alammar's blog post (the best visual explanation of attention): https://jalammar.github.io/illustrated-transformer/
- **Andrej Karpathy — Neural Networks: Zero to Hero** — YouTube series where he builds a GPT from scratch in Python. Exceptional.
- **Papers With Code** — https://paperswithcode.com — every ML paper with its implementation. Useful once you're comfortable reading research.
