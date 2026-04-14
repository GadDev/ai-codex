---
title: RAG — Retrieval Augmented Generation
tags: [RAG, embeddings, vector-database, retrieval, chunking, pinecone, chroma, pgvector, LLM-apps]
source: Research + course notes
---

# RAG — Retrieval Augmented Generation

RAG is the most widely used pattern for building LLM applications that need to answer questions about **your own data** — documents, databases, wikis, codebases — rather than relying solely on what the model learned during training.

The Claude Notebook app you're reading this in is a simple example of RAG: your notes are the knowledge source, and Claude answers questions grounded in them.

---

## The Core Problem RAG Solves

LLMs have two fundamental limitations for knowledge-intensive tasks:

1. **Knowledge cutoff** — they don't know about anything that happened after training
2. **Hallucination** — when they don't know something, they often invent a plausible-sounding answer

RAG solves both by giving the model the relevant facts at query time, retrieved from a trusted source you control.

> Instead of asking "What do you know about X?", you're asking "Here are the relevant documents about X — now answer the question."

---

## The RAG Pipeline

```
User query
    ↓
[1] EMBED the query
    (convert to a vector of numbers that captures its meaning)
    ↓
[2] RETRIEVE relevant chunks
    (search the vector store for the most semantically similar chunks)
    ↓
[3] AUGMENT the prompt
    (insert the retrieved chunks into the LLM's context)
    ↓
[4] GENERATE the answer
    (LLM answers the question using the retrieved context as evidence)
    ↓
Answer (grounded in your documents)
```

---

## Step 1 — Chunking

Before you can retrieve documents, you need to split them into chunks. This is more nuanced than it sounds.

### Chunking strategies

| Strategy | How it works | Best for |
|----------|-------------|---------|
| **Fixed size** | Split every N tokens, with overlap | Simple, fast, good default |
| **Sentence** | Split at sentence boundaries | Conversational, Q&A content |
| **Paragraph / section** | Split at markdown headers or blank lines | Structured docs, wikis |
| **Semantic** | Split when the topic changes (using embeddings) | Dense, mixed-topic documents |
| **Recursive** | Try paragraph → sentence → word until under size limit | General purpose, robust |

### Key parameters
- **Chunk size**: 256–512 tokens is a good starting point. Smaller = more precise retrieval. Larger = more context per chunk.
- **Chunk overlap**: 10–20% overlap between adjacent chunks prevents cutting a thought in half.

> The right chunk size depends on your documents and queries. Always evaluate retrieval quality empirically, not theoretically.

---

## Step 2 — Embeddings

An embedding is a list of numbers (a vector) that represents the **meaning** of a piece of text. Texts with similar meanings have similar vectors — so you can find related content by computing vector similarity.

### Popular embedding models

| Model | Provider | Notes |
|-------|----------|-------|
| `text-embedding-3-small` | OpenAI | Fast, cheap, good quality |
| `text-embedding-3-large` | OpenAI | Best OpenAI quality |
| `embed-english-v3.0` | Cohere | Strong for English |
| `nomic-embed-text` | Nomic / HuggingFace | Free, open source, runs locally |
| `all-MiniLM-L6-v2` | Sentence Transformers | Tiny, fast, runs on CPU |

> Use the **same embedding model** for both indexing and querying. Different models live in different vector spaces — mixing them breaks retrieval.

---

## Step 3 — Vector Databases

A vector database stores your embeddings and lets you search them by similarity efficiently.

### Options

| Database | Type | Best for |
|----------|------|---------|
| **Chroma** | Open source, local | Prototyping, small projects |
| **FAISS** | Open source, in-memory | Research, offline use |
| **pgvector** | PostgreSQL extension | Teams already using Postgres |
| **Pinecone** | Managed cloud | Production at scale |
| **Weaviate** | Open source / cloud | Complex filtering + vector search |
| **Qdrant** | Open source / cloud | High performance, great DX |

> **Start with Chroma** locally. Move to pgvector if you're already in Postgres, or Pinecone/Qdrant for production scale.

---

## Step 4 — Retrieval

At query time, you embed the user's question and search for the K most similar chunks.

### Retrieval strategies

**Similarity search (basic)** — Return the top K chunks by cosine similarity to the query vector. Simple and usually good enough.

**MMR — Maximal Marginal Relevance** — Balances relevance and diversity. Avoids returning K chunks that all say the same thing.

**Hybrid search** — Combine vector similarity with keyword (BM25) search. Particularly useful when queries contain specific names, codes, or jargon that embeddings handle poorly.

**Re-ranking** — After retrieving K candidates, use a second model (a cross-encoder) to re-score them for relevance. More expensive but better quality.

---

## Step 5 — Augmentation & Generation

Insert the retrieved chunks into the prompt before the user's question:

```python
system_prompt = """You are a helpful assistant. Answer questions using only
the provided context. If the answer is not in the context, say so clearly.
Do not make up information."""

prompt = f"""Context:
{retrieved_chunks}

Question: {user_question}"""
```

Key principles:
- Tell the model to **stay grounded** in the provided context
- Tell it to **admit ignorance** when the answer isn't there (this prevents hallucination)
- Include the **source** of each chunk so you can cite it in the answer

---

## What Makes RAG Go Wrong

| Problem | Cause | Fix |
|---------|-------|-----|
| Retrieves wrong chunks | Chunk size too large, embeddings misaligned with query style | Smaller chunks, query rewriting, hybrid search |
| Good retrieval, bad answer | LLM ignores context, or context is cut off by token limit | Stronger grounding instruction, reduce chunk size, increase K |
| Slow responses | Embedding + retrieval adds latency | Cache embeddings, use faster embedding model, async retrieval |
| Inconsistent answers | Retrieved chunks contradict each other | De-duplicate, add metadata filtering |
| Hallucination despite RAG | Model supplements context with training knowledge | Explicit "answer only from the context" instruction + temperature 0 |

---

## A Minimal Working Example (Python)

```python
import anthropic
import chromadb
from chromadb.utils import embedding_functions

# Setup
client = anthropic.Anthropic()
chroma = chromadb.Client()
ef = embedding_functions.DefaultEmbeddingFunction()
collection = chroma.create_collection("notes", embedding_function=ef)

# Index your documents
collection.add(
    documents=["...note content..."],
    ids=["note-01"]
)

# At query time
def ask(question: str) -> str:
    results = collection.query(query_texts=[question], n_results=3)
    context = "\n\n".join(results["documents"][0])

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system="Answer using only the provided context. Say 'I don't know' if the answer isn't there.",
        messages=[{"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}]
    )
    return response.content[0].text
```

---

## Further Reading

- **LangChain RAG tutorial**: https://python.langchain.com/docs/tutorials/rag/
- **LlamaIndex** — framework purpose-built for RAG: https://www.llamaindex.ai/
- **DeepLearning.AI — Building and Evaluating Advanced RAG**: https://learn.deeplearning.ai
