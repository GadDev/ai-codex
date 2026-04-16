---
title: Embeddings & Vector Databases
tags: [embeddings, vectors, cosine-similarity, chroma, pinecone, pgvector, semantic-search]
source: Course notes + Anthropic docs
---

# Embeddings & Vector Databases

How text becomes searchable numbers — the foundation of RAG, semantic search, and recommendation systems.

---

## What Is an Embedding?

An embedding is a list of floating-point numbers (a **vector**) that represents the meaning of a piece of text in high-dimensional space. Similar meaning → vectors close together. Different meaning → vectors far apart.

```python
"The cat sat on the mat"   → [0.12, -0.83, 0.47, ..., 0.21]
"A feline rested on a rug" → [0.14, -0.81, 0.49, ..., 0.19]  # Very similar!
"The stock market crashed"  → [-0.72, 0.33, -0.61, ..., 0.85] # Very different
```

This enables **semantic search** — find content by meaning, not just keywords.

---

## How Embeddings Are Created

Embedding models are neural networks trained to map text into vector space such that semantic similarity corresponds to geometric closeness. Smaller and faster than LLMs — they encode meaning, don't generate text.

| Model | Dimensions | Provider | Notes |
|-------|-----------|----------|-------|
| `voyage-3` | 1024 | Voyage AI | Recommended for Claude apps |
| `text-embedding-3-large` | 3072 | OpenAI | Strong general performance |
| `mxbai-embed-large` | 1024 | MixedBread | Top open-source, self-hostable |
| `nomic-embed-text` | 768 | Nomic | Fast, open-source |

```python
import voyageai
vo = voyageai.Client()

# Use "document" for indexing, "query" for search
doc_embeddings = vo.embed(["First doc", "Second doc"], model="voyage-3", input_type="document").embeddings
query_embedding = vo.embed(["My question"], model="voyage-3", input_type="query").embeddings[0]
```

---

## Cosine Similarity

The standard metric for embedding distance — how much two vectors point in the same direction.

```
cosine_similarity(A, B) = (A · B) / (|A| × |B|)

1.0  → identical
0.7+ → very similar
0.5  → somewhat related
0.0  → unrelated
```

```python
import numpy as np

def cosine_similarity(a, b):
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
```

---

## Vector Databases

Store embeddings alongside text and enable fast **approximate nearest-neighbour (ANN) search**. With 1M+ documents, brute-force numpy scanning is too slow; vector DBs use HNSW or IVF indexes for millisecond search.

| Database | Type | Self-host | Best for |
|----------|------|-----------|---------|
| **Chroma** | Open-source | ✅ | Local dev, prototyping |
| **Pinecone** | Managed SaaS | ❌ | Production, no infra |
| **pgvector** | PostgreSQL ext | ✅ | Already using Postgres |
| **Weaviate** | Open-source | ✅ | Complex filtering + search |
| **Qdrant** | Open-source | ✅ | High-performance, Rust-based |

### Chroma — zero setup

```python
import chromadb
client = chromadb.Client()
collection = client.create_collection("docs")

collection.add(
    documents=["Our return policy is 30 days"],
    embeddings=[embedding_vector],
    ids=["doc-1"],
    metadatas=[{"source": "faq.pdf"}]
)

results = collection.query(query_embeddings=[query_vec], n_results=3)
```

### pgvector — inside PostgreSQL

```sql
CREATE EXTENSION vector;
CREATE TABLE docs (id SERIAL PRIMARY KEY, content TEXT, embedding VECTOR(1024));

-- Search
SELECT content, 1 - (embedding <=> '[query vector]') AS similarity
FROM docs ORDER BY embedding <=> '[query vector]' LIMIT 5;
```

### Pinecone — managed production

```python
from pinecone import Pinecone
pc = Pinecone(api_key="KEY")
index = pc.Index("my-docs")

index.upsert(vectors=[{"id": "doc-1", "values": vec, "metadata": {"text": "..."}}])
results = index.query(vector=query_vec, top_k=5, include_metadata=True)
```

---

## Keywords vs. Embeddings

| Use case | Keywords | Embeddings |
|----------|----------|------------|
| Exact phrase | ✅ Better | May miss |
| Synonym / paraphrase | Misses | ✅ Excellent |
| Cross-language | No | ✅ Multilingual models |
| Short query, long doc | ✅ Good | Needs tuning |

**Hybrid search** (best of both) combines BM25 keyword scores with embedding similarity — supported natively by Weaviate and Pinecone.

---

## Further Reading

- Voyage AI: https://docs.voyageai.com
- Chroma: https://docs.trychroma.com
- pgvector: https://github.com/pgvector/pgvector
- MTEB leaderboard (compare embedding models): https://huggingface.co/spaces/mteb/leaderboard
