---
title: Building Your First RAG App
tags: [RAG, embeddings, chroma, pinecone, chunking, retrieval, LLM-apps, python]
source: Course notes + Anthropic docs
---

# Building Your First RAG App

RAG (Retrieval Augmented Generation) lets you give Claude access to your own documents at query time — without fine-tuning, without retraining, without paying to inject 200k tokens into every prompt. This note walks through building a minimal but production-worthy RAG system from scratch.

---

## The Core Loop

Every RAG system does the same four things:

```
User question
  → Embed question into a vector
  → Search vector DB for similar chunks
  → Inject top-k chunks into the prompt
  → Claude generates a grounded answer
```

The magic is in the details of each step.

---

## Step 1 — Chunking Your Documents

Before you can embed anything, you need to split your documents into chunks that fit usefully in a prompt.

**Rule of thumb: 500 tokens per chunk, 50-token overlap.**

Why overlap? So that sentences that straddle a chunk boundary aren't lost.

```python
from anthropic import Anthropic

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks
```

**Chunking strategies by content type:**

| Document type | Strategy |
|---------------|----------|
| Prose / articles | Fixed-size with overlap |
| Code files | Split by function/class boundaries |
| PDFs with headers | Split by section (markdown headings) |
| Q&A pairs | Keep each Q+A as one chunk |
| Tabular data | Row-per-chunk or embed descriptions |

---

## Step 2 — Creating Embeddings

Embeddings convert text into vectors that capture semantic meaning. Similar meaning = vectors close together in high-dimensional space.

**Recommended: Voyage AI** (Anthropic's embedding partner — excellent for English text, optimised for retrieval)

```python
import voyageai

vo = voyageai.Client()  # uses VOYAGE_API_KEY from environment

def embed_chunks(chunks: list[str]) -> list[list[float]]:
    result = vo.embed(chunks, model="voyage-3", input_type="document")
    return result.embeddings

def embed_query(query: str) -> list[float]:
    result = vo.embed([query], model="voyage-3", input_type="query")
    return result.embeddings[0]
```

> Note: Use `input_type="document"` when indexing, `input_type="query"` when searching. This asymmetry improves retrieval quality.

---

## Step 3 — Storing in a Vector Database

### Local: Chroma (zero setup, great for prototyping)

```python
import chromadb

client = chromadb.Client()
collection = client.create_collection("my-docs")

def index_documents(chunks: list[str], embeddings: list[list[float]]):
    collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=[f"chunk-{i}" for i in range(len(chunks))]
    )

def retrieve(query_embedding: list[float], top_k: int = 5) -> list[str]:
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k
    )
    return results["documents"][0]
```

### Production: Pinecone (managed, scalable, persistent)

```python
from pinecone import Pinecone

pc = Pinecone(api_key="YOUR_PINECONE_KEY")
index = pc.Index("my-docs")

def index_documents_pinecone(chunks, embeddings):
    vectors = [
        {"id": f"chunk-{i}", "values": emb, "metadata": {"text": chunk}}
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings))
    ]
    index.upsert(vectors=vectors)

def retrieve_pinecone(query_embedding, top_k=5):
    results = index.query(vector=query_embedding, top_k=top_k, include_metadata=True)
    return [match.metadata["text"] for match in results.matches]
```

---

## Step 4 — The Query Loop

This is where it all comes together. For each user question:

```python
import anthropic

client = anthropic.Anthropic()

def ask(question: str) -> str:
    # 1. Embed the question
    query_embedding = embed_query(question)

    # 2. Retrieve relevant chunks
    context_chunks = retrieve(query_embedding, top_k=5)
    context = "\n\n---\n\n".join(context_chunks)

    # 3. Build the prompt
    system_prompt = """You are a helpful assistant. Answer questions using ONLY the provided context.
If the context doesn't contain enough information to answer, say so clearly.
Do not make up information."""

    user_message = f"""Context:
{context}

Question: {question}"""

    # 4. Generate with Claude
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}]
    )

    return response.content[0].text
```

---

## Putting It All Together

```python
# Full pipeline: index once, query many times

# --- Indexing (run once) ---
import pathlib

docs_folder = pathlib.Path("./my-documents")
all_chunks = []

for doc_path in docs_folder.glob("*.txt"):
    text = doc_path.read_text()
    chunks = chunk_text(text)
    all_chunks.extend(chunks)

embeddings = embed_chunks(all_chunks)
index_documents(all_chunks, embeddings)
print(f"Indexed {len(all_chunks)} chunks")

# --- Querying (run many times) ---
while True:
    question = input("\nAsk a question (or 'quit'): ")
    if question.lower() == "quit":
        break
    answer = ask(question)
    print(f"\nAnswer: {answer}")
```

---

## Evaluating Your RAG System

RAG quality is a product of three things:

**Retrieval quality** — Are the right chunks being returned?
- Metric: Recall@k (are the relevant chunks in the top k results?)
- Debug: Print retrieved chunks before generating. If they're off-topic, the chunking or embedding strategy needs work.

**Answer quality** — Is Claude giving accurate, grounded answers?
- Manual spot check: Ask 10 questions you know the answer to
- Automated: Use Claude as a judge (`claude-opus-4-6`) to rate whether answers are supported by the context

**Groundedness** — Is Claude sticking to the retrieved content?
- Add a verification step: ask Claude to cite the specific chunk that supports each claim

---

## Common Failure Modes

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Wrong chunks retrieved | Chunks too large or too small | Tune chunk size; try semantic splitting |
| Answer ignores context | Prompt not firm enough | Strengthen "use ONLY the context" instruction |
| Good context, bad answer | Model too weak | Switch from Haiku to Sonnet |
| Slow retrieval | Vector DB not indexed properly | Add an HNSW index in Pinecone/Chroma |
| Hallucinated citations | No citation enforcement | Ask Claude to quote exact text |

---

## Moving to Production

When you're ready to go beyond a local prototype:

1. **Pinecone** (managed vector DB) → replace Chroma, get persistence + scale
2. **Voyage AI** `voyage-3-large` → better embeddings for complex documents
3. **Metadata filtering** → add document source, date, category to chunks so you can filter before searching
4. **Reranking** → after retrieving top-20, use a cross-encoder to rerank to top-5 before passing to Claude
5. **Streaming** → use `client.messages.stream()` for real-time response display

---

## Further Reading

- Anthropic RAG cookbook: https://docs.anthropic.com/en/docs/build-with-claude/retrieve-context
- Voyage AI docs: https://docs.voyageai.com
- Chroma docs: https://docs.trychroma.com
- Pinecone quickstart: https://docs.pinecone.io/guides/getting-started/quickstart
