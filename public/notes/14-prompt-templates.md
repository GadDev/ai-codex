---
title: Prompt Templates Library
tags: [prompts, templates, quick-reference, code-review, writing, analysis, debugging, structured-output]
source: Personal collection
---

# Prompt Templates Library

Ready-to-use prompt templates for the most common tasks. Each follows the Description framework from AI Fluency: **Product** (what you want), **Process** (how Claude should approach it), **Performance** (tone and behaviour).

Copy, adapt, and save your best variations back here.

---

## 💻 Code & Engineering

### Code Review
```
Review the following code for correctness, security vulnerabilities, and performance issues.

For each issue found:
- State the problem clearly
- Explain why it matters
- Suggest a concrete fix

Be concise. Skip praise. Focus on what could go wrong.

Code:
[paste code here]
```

### Debugging Assistant
```
I have a bug I can't figure out. Here's the context:

**Expected behaviour:** [what should happen]
**Actual behaviour:** [what is happening]
**Error message (if any):** [paste error]
**Relevant code:** [paste code]
**What I've already tried:** [your attempts]

Think step by step. Identify the most likely cause first, then work outward to less likely causes.
Suggest a fix only after explaining your diagnosis.
```

### Write Tests
```
Write comprehensive tests for the following code.

Requirements:
- Test framework: [Jest / Pytest / Vitest / other]
- Cover: happy paths, edge cases, error states
- Each test should have a descriptive name that explains what it verifies
- No mocking unless absolutely necessary

Code to test:
[paste code]
```

### Explain This Code
```
Explain what this code does, as if explaining to a developer who is familiar with
[language] but hasn't seen this pattern before.

Structure your explanation:
1. What it does at a high level (1-2 sentences)
2. How it works step by step
3. Any non-obvious design choices or gotchas

Code:
[paste code]
```

### Refactor for Readability
```
Refactor the following code to improve readability and maintainability.
Do NOT change the external behaviour or API.

Focus on:
- Clearer variable and function names
- Removing duplication
- Breaking large functions into smaller ones
- Adding comments only where the intent is genuinely non-obvious

Show the refactored version and briefly explain each significant change.

Code:
[paste code]
```

---

## ✍️ Writing & Communication

### Edit for Clarity
```
Edit the following text for clarity and conciseness. Keep my voice and meaning intact.

Rules:
- Cut unnecessary words ruthlessly
- Break long sentences into shorter ones where it helps
- Replace jargon with plain language where possible
- Keep technical terms that need to stay technical

Show the edited version, then briefly note the main changes you made.

Text:
[paste text]
```

### Professional Email
```
Write a professional email based on the following notes:

**To:** [recipient / role]
**Goal:** [what I want to achieve]
**Key points to include:** [bullet notes]
**Tone:** [direct / warm / formal / concise]
**Length:** [short = 3-5 sentences / medium = 1-2 paragraphs]

Don't start with "I hope this email finds you well."
```

### Executive Summary
```
Write an executive summary of the following document for a [CEO / technical lead / non-technical stakeholder].

The summary should:
- Be no longer than 200 words
- Lead with the most important finding or decision
- Include 3-5 key takeaways
- End with the recommended action or next step

Document:
[paste content]
```

---

## 🔍 Research & Analysis

### Summarise a Document
```
Summarise the following document.

Output format:
- **One-line summary**: The core idea in a single sentence
- **Key points**: 5-7 bullet points, each concrete and specific
- **What's missing or unclear**: Any significant gaps or unanswered questions

Be specific. Avoid vague summaries like "the document discusses X." Tell me what it actually says about X.

Document:
[paste content]
```

### Compare Options
```
Compare the following options and give me a recommendation.

Options: [list them]
Decision criteria: [what matters most to me — e.g. cost, speed, simplicity, scalability]
Context: [brief description of my situation]

Format:
1. A comparison table covering the key criteria
2. A clear recommendation with your reasoning
3. Any important caveats or conditions that would change your recommendation
```

### Devil's Advocate
```
I'm planning to [describe decision or plan].

Play devil's advocate. Give me the strongest possible case against this decision.
Don't soften it. I want to stress-test the idea, not feel validated.

After the critique, tell me what would need to be true for this to be a good decision anyway.
```

---

## 📊 Data & Structured Output

### Extract Structured Data
```
Extract the following information from the text below and return it as JSON.

Schema:
{
  "field_name": "type and description",
  ...
}

Rules:
- If a field is not present in the text, use null
- Do not infer or hallucinate values
- Return only the JSON, no explanation

Text:
[paste content]
```

### Classify and Route
```
Classify the following input into exactly one of these categories:
[Category A | Category B | Category C | Category D]

Definitions:
- Category A: [description]
- Category B: [description]
- Category C: [description]
- Category D: [description]

Return only the category name. No explanation needed.

Input: [paste input]
```

### Generate Test Data
```
Generate [N] realistic test records matching this schema:

Schema:
[paste schema or describe fields]

Requirements:
- Make the data varied and realistic (not "John Doe" × 10)
- Include edge cases: empty optional fields, long strings, special characters
- Return as a JSON array
```

---

## 🧠 Thinking & Strategy

### Think-First Problem Solving
```
I need help with: [describe problem]

Before you answer:
1. Restate the problem in your own words to confirm you understood it
2. Identify any assumptions you're making
3. List 2-3 different approaches you could take
4. Choose the best approach and explain why

Then give your answer.
```

### Pre-mortem
```
I'm about to [launch / build / decide / implement]: [describe plan]

Run a pre-mortem. Imagine it's 6 months from now and this has failed badly.

1. What are the most likely reasons it failed?
2. Which of those risks can I mitigate now, and how?
3. Which risks should I accept and monitor?

Be specific to my situation, not generic.
```

---

## Tips for Adapting These Templates

**Add examples** — Append "Here's an example of the output format I want:" followed by a sample. Few-shot beats instructions for format.

**Specify length** — Templates without length guidance produce inconsistent output. Always add "Keep this under X words" or "Aim for 3-5 sentences."

**Name your audience** — "Explain to a senior backend engineer" vs. "Explain to a product manager" will produce very different results for the same content.

**Save your best variations** — When a tweaked version of a template produces a great result, add it here with a note about when to use it.
