---
title: Prompt Engineering
tags: [prompting, prompt-engineering, chain-of-thought, few-shot, persona, output-formatting]
source: AI Fluency Key Terminology Cheat Sheet (Anthropic)
---

# Prompt Engineering

## What is a Prompt?
The input given to an AI model — including instructions and any documents shared. Everything you type (and the system configuration behind the scenes) is part of the prompt.

## What is Prompt Engineering?
The practice of designing **effective prompts** for AI systems to produce desired outputs. It combines clear communication with AI-specific techniques.

---

## Core Techniques

### Chain-of-Thought Prompting
Encouraging an AI to work through a problem **step by step**, breaking down complex tasks into smaller steps that help the AI follow your thinking and deliver better results.

```
Instead of: "What's the best pricing strategy for my SaaS?"

Try: "Let's think through this step by step. First, what are the key factors that affect SaaS pricing? Then, given those factors, what models exist? Finally, which would suit a B2B tool with 10-100 seat teams?"
```

### Few-Shot Learning (N-Shot Prompting)
Teaching AI by showing **examples** of the desired input-output pattern. The "N" refers to the number of examples provided. Helps the model understand what you want without lengthy explanations.

```
Example (2-shot):
Input: "The cat sat on the mat" → Output: Informal, simple
Input: "The feline reclined upon the woven surface" → Output: Formal, elaborate

Now classify: "Hey, can you check this out?"
```

### Role / Persona Definition
Specifying a particular character, expertise level, or communication style for the AI to adopt.

- General role: `"Speak as a UX design expert"`
- Specific persona: `"Explain this like Richard Feynman would"`
- Audience-based: `"Explain this to a non-technical CEO"`

### Output Constraints / Output Formatting
Clearly specifying the desired **format, length, structure**, or other characteristics of the AI's response.

```
"Respond in a table with columns: Concept | Definition | Example"
"Summarise in exactly 3 bullet points, max 15 words each"
"Return only the code, no explanation"
```

### Think-First Approach
Explicitly asking the AI to work through its reasoning **before** providing a final answer. Leads to more thorough and well-considered responses.

```
"Before answering, think through the tradeoffs of each option. 
Then give me your recommendation."
```

---

## Tips from Practice

**Be specific about what you don't want** — negative constraints are often as useful as positive ones.

**Give context about your audience** — "explain to a junior dev" vs. "explain to a CTO" will produce very different outputs.

**Iterate** — Good prompting is a dialogue, not a single instruction. Refine based on what you get back (this is the Discernment → Description loop from the 4Ds).

**Use the Description framework** (from AI Fluency):
- *Product*: What output do you want?
- *Process*: How should Claude approach the task?
- *Performance*: What tone/style/behaviour do you want?
