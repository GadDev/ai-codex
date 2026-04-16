---
id: note-38
slug: self-hosting-llms-ollama-vllm-gdpr
title: Self-Hosting Open-Source LLMs Ollama and vLLM for GDPR Compliance
tags: [ollama, vllm, gdpr, self-hosting, open-source, privacy]
emoji: 🔒
---

# Self-Hosting Open-Source LLMs: Ollama and vLLM for GDPR Compliance

---

## Overview

Self-hosting open-source LLMs means running models like Llama, Mistral, or Phi on your own infrastructure instead of calling external APIs. Tools like Ollama (simple local serving) and vLLM (high-performance production serving) let you do this. For European/GDPR contexts, this is often mandatory because you avoid sending sensitive data to third-party US providers, keep full control over data residency, and can guarantee that user inputs never leave your infrastructure.

---

## Key Concepts

- **Self-hosting** — Running an LLM entirely on your own servers/machines rather than calling OpenAI/Anthropic APIs. *Like hosting your own email server instead of using Gmail — full control, full responsibility.*

- **Ollama** — Developer-friendly tool that packages models (Llama 3, Mistral, etc.) into containers you run locally with one command. *Think of it as Docker for LLMs: `ollama run llama3` and you have a ChatGPT-like experience on localhost.*

- **vLLM** — Production-grade inference server optimized for high throughput and low latency. Uses PagedAttention (memory-efficient KV cache management) to serve many concurrent requests. *Ollama is your laptop dev server; vLLM is the Nginx of LLM serving — built for scale.*

- **GDPR compliance** — EU regulation requiring that personal data stays within approved jurisdictions, with explicit consent and right to deletion. Most US-hosted LLM APIs don't guarantee these without complex Data Processing Agreements. *Self-hosting = you never send a user's medical query to a US datacenter.*

- **Model quantization** — Reducing model precision (e.g., from 16-bit to 4-bit weights) to run large models on smaller hardware. GGUF format (used by Ollama) makes 70B parameter models fit in 24GB RAM. *Like compressing a 4K movie to 1080p — quality drops slightly, file size drops massively.*

- **OpenAI-compatible API** — Both Ollama and vLLM expose REST endpoints matching OpenAI's `/v1/chat/completions` format. *Swap your `base_url` and the rest of your code works unchanged — like using a local Redis instead of AWS ElastiCache.*

---

## Practical Examples

- **Ollama quickstart**: Install on macOS/Linux, then `ollama pull llama3.1:8b` downloads the model, `ollama serve` starts the server, and `curl http://localhost:11434/api/generate -d '{"model": "llama3.1:8b", "prompt": "Explain GDPR"}'` gets a response. No API keys, no cloud account.

- **vLLM deployment**: `pip install vllm`, then `vllm serve meta-llama/Llama-3.1-8B-Instruct --dtype auto --api-key your-secret` starts a production server. It auto-batches requests and uses continuous batching to maximize GPU utilization. Hit it with `curl http://localhost:8000/v1/chat/completions` using OpenAI SDK.

- **GDPR use case**: European healthcare startup needs to summarize patient notes. Instead of OpenAI (requires BAA, data leaves EU), they run Llama 3.1 70B via vLLM on AWS eu-central-1 instances. Patient data never crosses borders, audit logs stay internal, and they can delete embeddings on request.

- **Quantized models for laptops**: `ollama run llama3.1:8b-q4_K_M` runs a 4-bit quantized version that uses ~5GB RAM instead of 16GB. Perfect for development without a GPU cluster.

- **Multi-model serving**: Ollama lets you switch models instantly: `ollama run codellama` for code generation, `ollama run mistral` for general chat, all from the same local server. vLLM can serve multiple LoRA adapters from one base model simultaneously.

- **Integration example**: Replace `openai.ChatCompletion.create(model="gpt-4")` with `openai.ChatCompletion.create(model="llama3.1", base_url="http://localhost:11434/v1")` in your Python app. The API contract is identical, so libraries like LangChain work out of the box.

---

## Why It Matters

If you're building AI products for European users or handling regulated data (healthcare, finance, HR), external APIs create legal and compliance nightmares. Self-hosting is often the only way to guarantee GDPR Article 44 (data transfers) and Article 32 (security) compliance without expensive legal frameworks. It also eliminates per-token costs at scale and prevents vendor lock-in — you control the model weights, the infrastructure, and the data pipeline. Without this knowledge, you'll either overpay for compliant cloud LLMs or ship products that violate privacy law.

---

## My Takeaways

- **Start with Ollama for prototyping** — it's the fastest way to test whether a self-hosted model meets your quality bar. Install takes 30 seconds.

- **vLLM for production** — if you're serving >10 requests/second or need <500ms latency, vLLM's batching and KV cache optimization matter. Ollama is synchronous and single-threaded.

- **Quantization is non-negotiable for cost** — running fp16 models is 3-4x more expensive in GPU memory. GGUF Q4 or Q5 models lose <5% quality for most tasks but halve your hardware spend.

- **GDPR isn't just "don't use US clouds"** — you need data processing records, the ability to delete embeddings/logs on request, and proof that prompts aren't used for model training. Self-hosting makes audits trivial.

- **Test model quality rigorously** — Llama 3.1 8B is not GPT-4. Run evals on your domain before committing. Tools like `lm-evaluation-harness` automate this.

- **Monitor token throughput and latency** — vLLM exposes Prometheus metrics. If your p95 latency spikes, you're probably under-provisioned or need tensor parallelism across multiple GPUs.

- **Keep models updated** — new quantized versions (e.g., Llama 3.2, Qwen2.5) often double quality at the same size. Ollama makes this a one-liner: `ollama pull <new-model>`.

---

## References

- [Ollama official documentation](https://ollama.ai/)
- [vLLM GitHub repository](https://github.com/vllm-project/vllm)
- [GDPR Article 44: Transfers of personal data](https://gdpr-info.eu/art-44-gdpr/)
- [PagedAttention paper (vLLM's core technique)](https://arxiv.org/abs/2309.06180)
- [GGUF quantization format specification](https://github.com/ggerganov/ggml/blob/master/docs/gguf.md)
- [Hugging Face model quantization guide](https://huggingface.co/docs/transformers/main/en/quantization)
