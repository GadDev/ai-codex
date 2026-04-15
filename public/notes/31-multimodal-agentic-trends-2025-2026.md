---
title: Multimodal & Agentic Trends 2025–2026
tags: [multimodal, vision, audio, agents, MCP, computer-use, trends]
source: Course notes + Anthropic research
---

# Multimodal & Agentic Trends 2025–2026

Where LLMs are going: vision, audio, computer control, and open protocols for tool use.

---

## Multimodal: Beyond Text

### Vision — Images & Documents

All frontier models now accept images natively. Common patterns:

```python
import anthropic, base64

client = anthropic.Anthropic()

# Inline base64
with open("diagram.png", "rb") as f:
    img_b64 = base64.standard_b64encode(f.read()).decode("utf-8")

response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": img_b64}},
            {"type": "text", "text": "Explain this architecture diagram."}
        ]
    }]
)
```

**Use cases**: invoice extraction, diagram understanding, screenshot debugging, visual QA, PDF processing.

**Model support**: Claude (claude-opus-4-6 / claude-sonnet-4-6), GPT-4o, Gemini 1.5 Pro.

### Audio

- **Whisper** (OpenAI open-source): offline, GDPR-friendly, runs on CPU/GPU, models from `tiny` to `large-v3`.
- **OpenAI Realtime API**: low-latency bidirectional audio (speech-to-speech), useful for voice assistants.
- **ElevenLabs / Azure TTS**: text-to-speech for natural-sounding responses.

The emerging pattern: STT → LLM → TTS as a voice layer over any existing text application.

---

## Agentic Trends

### Computer Use

Claude can observe and interact with a real desktop — take screenshots, move the mouse, click, type.

```python
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=4096,
    tools=[
        {"type": "computer_20241022", "name": "computer", "display_width_px": 1366, "display_height_px": 768}
    ],
    messages=[{"role": "user", "content": "Open a browser, go to docs.anthropic.com and find the rate limits page."}]
)
```

**Current state (2025)**: Works well for structured tasks (form filling, web research, code execution), fragile on complex GUIs.

### Model Context Protocol (MCP)

An open standard (Anthropic, 2024) for connecting LLMs to external tools: file systems, APIs, databases, desktop apps.

```
Host (Claude Desktop / IDE)
  └── MCP Client
        ├── Filesystem MCP Server  → read/write local files
        ├── GitHub MCP Server      → repos, PRs, issues
        └── PostgreSQL MCP Server  → query your database
```

MCP replaces bespoke tool integrations with a plug-and-play ecosystem. Any compliant client works with any compliant server.

### Long Context & Persistent Memory

- Claude: 200K token context (≈ 150K words / full codebases)
- Gemini 1.5 Pro: 1M tokens
- **Trend**: context windows growing faster than expected — many RAG use cases will be replaced by "just put everything in context"
- **But**: cost scales with context length → still need smart retrieval for large corpora

---

## What's Changing Fast (2025–2026)

| Trend | Status | Impact |
|---|---|---|
| Vision in every frontier model | ✅ Here | Multimodal apps are now default |
| Audio (speech-to-speech) | ✅ Here | Voice layer on any LLM app |
| Computer use / browser agents | 🔄 Maturing | Automate desktop & web tasks |
| MCP ecosystem | 🔄 Growing | Standardised tool integrations |
| Sub-second inference | ✅ Here (Groq, Cerebras) | Real-time streaming UX |
| Open-source parity with GPT-4 | ✅ (Llama 3.1, Qwen, Mistral) | Self-hosting viable for many tasks |
| AI coding assistants (Cursor, Copilot) | ✅ Here | Fundamental dev workflow change |
| Reasoning models (o1, o3, R1) | ✅ Here | Chain-of-thought baked in |
| Inference-time scaling | 🔄 Active research | More compute at inference = smarter |

---

## Practical Takeaways for Builders

1. **Add vision to your apps now** — the API is stable and the use cases are real.
2. **Explore MCP** if you're building Claude Desktop integrations or IDE plugins.
3. **Don't over-index on audio** unless voice is core UX — the pipeline is immature.
4. **Watch open-source models** — Llama 3.3, Qwen 2.5, DeepSeek R1 close the gap every month.
5. **Computer use** is promising but requires careful sandboxing — don't give agents access to production systems yet.

---

## Further Reading

- Claude computer use: https://docs.anthropic.com/en/docs/build-with-claude/computer-use
- MCP specification: https://modelcontextprotocol.io
- Whisper: https://github.com/openai/whisper
- OpenAI Realtime API: https://platform.openai.com/docs/guides/realtime
