---
title: Claude Vision & Multimodal
tags: [vision, multimodal, images, PDF, document-analysis, OCR]
source: Anthropic docs
---

# Claude Vision & Multimodal 👁️

Send images, PDFs, and documents to Claude — extract information, analyse layouts, compare visuals.

---

## Sending an Image (Base64)

```python
import anthropic, base64

client = anthropic.Anthropic()

with open("invoice.png", "rb") as f:
    image_data = base64.standard_b64encode(f.read()).decode("utf-8")

response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",  # image/jpeg, image/gif, image/webp
                    "data": image_data
                }
            },
            {"type": "text", "text": "Extract all line items and totals from this invoice as JSON."}
        ]
    }]
)
print(response.content[0].text)
```

---

## Sending an Image (URL)

```python
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=512,
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "image",
                "source": {"type": "url", "url": "https://example.com/diagram.png"}
            },
            {"type": "text", "text": "Describe this architecture diagram."}
        ]
    }]
)
```

---

## Sending a PDF

```python
with open("report.pdf", "rb") as f:
    pdf_data = base64.standard_b64encode(f.read()).decode("utf-8")

response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=2048,
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "document",
                "source": {"type": "base64", "media_type": "application/pdf", "data": pdf_data}
            },
            {"type": "text", "text": "Summarise the key findings and recommendations."}
        ]
    }]
)
```

PDFs are processed page-by-page — Claude reads all text and visual content.

---

## Multiple Images in One Request

```python
messages=[{
    "role": "user",
    "content": [
        {"type": "text", "text": "Compare these two UI screenshots and list the differences:"},
        {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": img1}},
        {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": img2}},
    ]
}]
```

---

## Vision Prompting Patterns

| Task | Prompt pattern |
|---|---|
| Document extraction | "Extract all {field} from this document as JSON" |
| Visual QA | "Answer using only what you can see: {question}" |
| Chart analysis | "Describe the trend. What is the value at {point}?" |
| UI review | "List all usability issues you can spot" |
| Comparison | "What are the differences between image 1 and image 2?" |
| OCR | "Transcribe all visible text, preserving the original layout" |

---

## Limits & Practical Notes

- **Max image size**: 5 MB per image (resize before sending)
- **Max images per request**: 20
- **Supported formats**: JPEG, PNG, GIF, WebP, PDF
- **Cost**: images count as tokens — a 1024×1024 PNG ≈ 1,600 tokens
- **No training on images**: Claude does not retain or learn from images you send

---

## Common Use Cases

- Invoice & receipt parsing — line items, totals, dates
- Screenshot debugging — "what's wrong with this UI?"
- Document QA — ask questions over scanned PDFs
- Diagram understanding — architecture, flowcharts, ER diagrams
- Accessibility alt-text generation
- Visual regression testing — compare before/after screenshots

---

## Further Reading

- Vision guide: https://docs.anthropic.com/en/docs/build-with-claude/vision
- PDF support: https://docs.anthropic.com/en/docs/build-with-claude/pdf-support
