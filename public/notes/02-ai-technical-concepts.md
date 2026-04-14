---
title: AI Technical Concepts
tags: [llm, neural-networks, training, context-window, hallucination, RAG, temperature, transformer]
source: AI Fluency Key Terminology Cheat Sheet (Anthropic)
---

# AI Technical Concepts

## What AI Is

### Generative AI
AI systems that can **create new content** (text, images, code, etc.) rather than just analyzing existing data.

### Large Language Models (LLMs)
Generative AI systems trained on vast amounts of text data to understand and generate human language. Claude is an LLM.

### Neural Networks
Computing systems inspired by (but distinct from) biological brains. Composed of interconnected nodes organized in layers that learn patterns from data through training.

### Transformer Architecture
The breakthrough AI design from 2017 that enables LLMs to process sequences of text **in parallel** while paying attention to relationships between words across long passages. Foundation of modern LLMs.

---

## How AI Models Are Built

### Parameters
The mathematical values within an AI model that determine how it processes information and relates different pieces of language to each other. Modern LLMs contain **billions** of parameters.

### Pre-training
The initial training phase where AI models learn patterns from vast amounts of text data, developing a foundational understanding of language and knowledge.

### Fine-tuning
Additional training *after* pre-training where models learn to:
- Follow instructions
- Provide helpful responses
- Avoid generating harmful content

### Scaling Laws
As AI models grow larger and train on more data with more computing power, their performance improves in consistent, predictable patterns. Most interestingly, **entirely new capabilities can emerge at certain scale thresholds** that weren't explicitly programmed.

---

## Key Concepts to Know When Using AI

### Context Window
The amount of information an AI can consider at one time — including conversation history and any documents shared. Has a maximum limit that varies by model.

> ⚠️ When your conversation gets very long, earlier content may fall outside the context window and Claude won't "remember" it.

### Hallucination
A type of error when AI **confidently states something that sounds plausible, but is actually incorrect**. Always verify important facts from AI responses.

### Knowledge Cutoff Date
The point after which an AI model has no built-in knowledge of the world, based on when it was trained. Claude's reliable knowledge cutoff is end of May 2025.

### Temperature
A setting that controls how **random** an AI's responses are:
- **Higher temperature** → more varied, creative outputs (like boiling water bubbling)
- **Lower temperature** → more predictable, focused responses (like ice crystals)

### Reasoning / Thinking Models
Types of AI models specifically designed to think **step-by-step** through complex problems, showing improved capabilities for tasks requiring logical reasoning. In Claude Code this is accessible via "think", "think more", "ultrathink", etc.

---

## Advanced Techniques

### Retrieval Augmented Generation (RAG)
A technique that connects AI models to **external knowledge sources** to improve accuracy and reduce hallucinations. Instead of relying only on training data, the model retrieves relevant documents and grounds its answers in them.

> 💡 This is exactly what the Claude Notebook app will use — your notes become the external knowledge source.

### Bias
Systematic patterns in AI outputs that unfairly favor or disadvantage certain groups or perspectives, often reflecting patterns in training data. Part of Discernment is noticing and correcting for this.
