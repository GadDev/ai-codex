---
title: Multimodal AI
emoji: 🎨
tags: [multimodal, vision, image-generation, audio, video, diffusion]
date: 2025-01
---

# Multimodal AI

AI that works across multiple types of data — text, images, audio, and video — not just language alone.

---

## What is Multimodal AI?

A **multimodal** AI model can process and/or generate more than one type of data. The major modalities:

| Modality       | Input         | Output                 |
| -------------- | ------------- | ---------------------- |
| Text           | ✅            | ✅                     |
| Images         | ✅            | ✅ (generation models) |
| Audio / Speech | ✅            | ✅ (TTS, music)        |
| Video          | ✅ (emerging) | ✅ (emerging)          |
| Code           | ✅            | ✅                     |

Modern frontier models like Claude 3/4, GPT-4o, and Gemini 1.5 can accept images, documents, and text as input and respond in text. Image generation is handled by separate specialised models.

---

## Vision-Language Models (VLMs)

Models that can understand both images and text together.

### What Claude can do with images:

- Describe what's in a screenshot or photo
- Read and interpret charts, diagrams, and tables
- Extract text from images (OCR-like)
- Analyse UI screenshots and suggest improvements
- Understand handwritten notes or whiteboard photos
- Answer questions about visual content

### How to send an image to Claude (API):

```python
import anthropic, base64

client = anthropic.Anthropic()

with open("screenshot.png", "rb") as f:
    image_data = base64.standard_b64encode(f.read()).decode("utf-8")

message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": image_data,
                    },
                },
                {
                    "type": "text",
                    "text": "What layout issues do you see in this UI screenshot?"
                }
            ],
        }
    ],
)
print(message.content[0].text)
```

---

## Image Generation

Separate from VLMs — these models _create_ images from text descriptions.

### Diffusion Models

The dominant paradigm for image generation. The model learns to gradually denoise random noise into a coherent image, guided by a text prompt.

Key concept: **latent diffusion** — the process happens in a compressed latent space rather than pixel space, making it far more efficient.

### Key Image Generation Models

| Model                | Made by           | Access        | Known for                                 |
| -------------------- | ----------------- | ------------- | ----------------------------------------- |
| **DALL-E 3**         | OpenAI            | API + ChatGPT | Prompt adherence, integrated in ChatGPT   |
| **Stable Diffusion** | Stability AI      | Open-source   | Run locally, highly customisable          |
| **Midjourney**       | Midjourney        | Discord / web | Artistic quality, aesthetics              |
| **Flux**             | Black Forest Labs | Open-source   | High photorealism, strong successor to SD |
| **Imagen 3**         | Google            | Vertex AI     | Photorealism, long-form text in images    |

> 💡 For developers: DALL-E 3 via the OpenAI API is the simplest integration. For custom or local use: Stable Diffusion or Flux via ComfyUI or Automatic1111.

---

## Audio AI

### Speech Recognition (ASR)

Converting audio to text.

- **Whisper** (OpenAI, open-source) — state-of-the-art, runs locally, supports 100+ languages
- **AssemblyAI**, **Deepgram** — cloud APIs with speaker diarisation, real-time streaming

### Text-to-Speech (TTS)

Converting text to spoken audio.

- **ElevenLabs** — best voice quality and cloning
- **OpenAI TTS** — simple API, multiple voices
- **Coqui TTS** — open-source alternative

### Music Generation

- **Suno** — generate full songs with vocals from a text prompt
- **Udio** — similar, strong on style diversity
- **MusicGen** (Meta, open-source) — instrumental music generation

---

## Video AI

The newest and most rapidly developing modality.

| Model            | Made by  | What it does                                  |
| ---------------- | -------- | --------------------------------------------- |
| **Sora**         | OpenAI   | Text-to-video, up to 1 minute, photorealistic |
| **Runway Gen-3** | Runway   | High-quality video generation and editing     |
| **Kling**        | Kuaishou | Strong text-to-video and image-to-video       |
| **Veo 2**        | Google   | High-fidelity video with strong physics       |

> Current state (2025): video generation is impressive for short clips (5–20 seconds) but still struggles with long temporal consistency, physics, and complex motion.

---

## Practical Workflow: Claude + Images for UI Work

The most immediately useful multimodal pattern for developers:

```
1. Screenshot your UI (macOS: Ctrl+Cmd+Shift+4, Windows: Win+Shift+S)
2. Paste into Claude Code (Ctrl+V)
3. "What's wrong with this layout? Fix @src/components/Header.tsx"
4. Claude reads the image + the source file → produces a fix
5. Refresh browser → verify → iterate
```

This loop — screenshot, paste, fix, verify — is faster than describing visual bugs in words and eliminates most ambiguity.
