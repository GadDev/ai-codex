---
title: Embeddings & Vector Search
emoji: 🔢
tags: [embeddings, vector-search, semantic-search, rag, databases]
date: 2025-01
---

# Embeddings & Vector Search

The technology that lets AI find meaning, not just keywords — and the backbone of RAG systems.

---

## What is an Embedding?

An **embedding** is a list of numbers (a vector) that represents the meaning of a piece of text. Similar meaning → similar numbers → points close together in high-dimensional space.

For example, the sentences:

- _"The dog chased the cat"_
- _"A canine pursued a feline"_

...have very different words but nearly identical embeddings, because they mean the same thing.

This is fundamentally different from keyword search, which matches exact words. Embeddings enable **semantic search** — finding content based on meaning.

---

## How Embeddings Are Created

A dedicated embedding model reads text and outputs a fixed-length vector — typically 768 to 3072 numbers. These models are trained to ensure that semantically similar texts produce similar vectors.

Popular embedding models:

- **text-embedding-3-small / large** (OpenAI)
- **Voyage AI** (Anthropic's recommended provider)
- **all-MiniLM-L6-v2** (open-source, runs locally, fast)
- **nomic-embed-text** (open-source, strong performance)

---

## Vector Similarity

To find which stored embeddings are closest to a query embedding, you measure distance. The most common metric:

**Cosine similarity** — measures the angle between two vectors. A score of `1.0` means identical direction (same meaning), `0.0` means unrelated, `-1.0` means opposite meaning.

```python
from numpy import dot
from numpy.linalg import norm

def cosine_similarity(a, b):
    return dot(a, b) / (norm(a) * norm(b))
```

---

## Vector Databases

A vector database stores embeddings and makes similarity search fast — even across millions of vectors.

| Database     | Type                | Best for                            |
| ------------ | ------------------- | ----------------------------------- |
| **Pinecone** | Managed cloud       | Production RAG, no infra management |
| **Weaviate** | Open-source / cloud | Hybrid search (vector + keyword)    |
| **Chroma**   | Open-source, local  | Prototyping and small projects      |
| **Qdrant**   | Open-source / cloud | High performance, Rust-based        |
| **pgvector** | Postgres extension  | If you already use Postgres         |
| **FAISS**    | Library (Meta)      | Research and local search at scale  |

> 💡 For most projects starting out: use **Chroma** locally for prototyping, then **Pinecone** or **pgvector** for production.

---

## Beyond RAG: Other Uses for Embeddings

Embeddings are useful far beyond just powering LLM retrieval:

**Semantic search** — search your own content by meaning, not keywords. Powers modern documentation search, customer support lookup, e-commerce product search.

**Clustering and topic modelling** — group similar documents together automatically, without labelling.

**Recommendation systems** — "similar items" engines. If two products have similar embeddings, users who liked one might like the other.

**Anomaly detection** — find documents or data points that are semantically far from everything else.

**Classification** — train a simple classifier on top of embeddings rather than raw text. Much more efficient than fine-tuning a full LLM.

**Duplicate detection** — find near-identical documents even when wording differs.

---

## Practical Example: Embed and Search

```python
import anthropic
import numpy as np

client = anthropic.Anthropic()

# Embed a collection of documents
documents = [
    "How to reset your password",
    "Billing and subscription questions",
    "Getting started with the API",
]

# (Using Voyage AI via Anthropic — or swap for OpenAI embeddings)
# For demo, we'll show the pattern with a placeholder

def embed(texts):
    # Call your embedding model here
    # Returns list of vectors
    pass

doc_embeddings = embed(documents)

# Embed a query and find the closest document
query = "I forgot my login credentials"
query_embedding = embed([query])[0]

similarities = [
    cosine_similarity(query_embedding, doc_emb)
    for doc_emb in doc_embeddings
]

best_match = documents[np.argmax(similarities)]
print(f"Best match: {best_match}")
# → "How to reset your password"
```

---

## Chunking Strategy

Before embedding documents, you need to split them into chunks. This matters a lot.

| Strategy                         | When to use                                           |
| -------------------------------- | ----------------------------------------------------- |
| **Fixed size** (e.g. 512 tokens) | Simple baseline, good starting point                  |
| **Sentence splitting**           | When each sentence is self-contained                  |
| **Paragraph splitting**          | When paragraphs have coherent topics                  |
| **Semantic chunking**            | Split when topic changes — best quality, more complex |
| **Hierarchical**                 | Store both summary and detail embeddings              |

> ⚠️ Chunks too large → irrelevant content dilutes the signal. Chunks too small → lose context. Start with ~500 tokens with 50-token overlap.
