import { describe, expect, it } from "vitest";
import { formatNote } from "../scripts/agent/format.ts";
import type { SummarizeResult } from "../scripts/agent/summarize.ts";

// ── Fixtures ───────────────────────────────────────────────────────────────

const baseResult: SummarizeResult = {
	title: "Attention Is All You Need",
	slug: "attention-is-all-you-need",
	tags: ["transformers", "deep learning", "NLP"],
	emoji: "🧠",
	overview: "The transformer architecture introduced in 2017.",
	keyConcepts: "Self-attention, multi-head attention, positional encoding.",
	practicalExamples: "BERT, GPT, T5 all build on this architecture.",
	whyItMatters: "Replaced RNNs and became the foundation of modern LLMs.",
	myTakeaways: "Attention allows the model to weigh token relevance globally.",
	references: "- Vaswani et al. (2017). Attention Is All You Need.",
	tokenUsage: { inputTokens: 100, outputTokens: 200 },
};

// ── formatNote ─────────────────────────────────────────────────────────────

describe("formatNote", () => {
	// ── Frontmatter ──────────────────────────────────────────────────────

	it("generates the correct id with zero-padded noteId", () => {
		const output = formatNote(baseResult, { noteId: 7 });
		expect(output).toContain("id: note-07");
	});

	it("does not pad noteId values >= 10", () => {
		const output = formatNote(baseResult, { noteId: 38 });
		expect(output).toContain("id: note-38");
	});

	it("includes the slug in the frontmatter", () => {
		const output = formatNote(baseResult, { noteId: 1 });
		expect(output).toContain("slug: attention-is-all-you-need");
	});

	it("includes the title in the frontmatter", () => {
		const output = formatNote(baseResult, { noteId: 1 });
		expect(output).toContain("title: Attention Is All You Need");
	});

	it("renders tags as an inline YAML sequence", () => {
		const output = formatNote(baseResult, { noteId: 1 });
		expect(output).toContain("tags: [transformers, deep-learning, nlp]");
	});

	it("lowercases tags in the frontmatter", () => {
		const result = { ...baseResult, tags: ["RAG", "LLM", "Vector DB"] };
		const output = formatNote(result, { noteId: 1 });
		expect(output).toContain("tags: [rag, llm, vector-db]");
	});

	it("converts whitespace in tags to hyphens", () => {
		const result = { ...baseResult, tags: ["prompt engineering"] };
		const output = formatNote(result, { noteId: 1 });
		expect(output).toContain("tags: [prompt-engineering]");
	});

	it("includes the emoji in the frontmatter", () => {
		const output = formatNote(baseResult, { noteId: 1 });
		expect(output).toContain("emoji: 🧠");
	});

	it("strips dangerous YAML characters from the title", () => {
		const result = { ...baseResult, title: 'Hello: "World" [Test] {foo}' };
		const output = formatNote(result, { noteId: 1 });
		// Colon, quotes, brackets, braces removed
		expect(output).toContain("title: Hello World Test foo");
	});

	it("wraps frontmatter in --- delimiters", () => {
		const output = formatNote(baseResult, { noteId: 1 });
		expect(output).toMatch(/^---\n/);
		expect(output).toMatch(/\n---\n/);
	});

	// ── Body ─────────────────────────────────────────────────────────────

	it("includes the title as an h1 heading in the body", () => {
		const output = formatNote(baseResult, { noteId: 1 });
		expect(output).toContain("# Attention Is All You Need");
	});

	it("includes all required section headings", () => {
		const output = formatNote(baseResult, { noteId: 1 });
		expect(output).toContain("## Overview");
		expect(output).toContain("## Key Concepts");
		expect(output).toContain("## Practical Examples");
		expect(output).toContain("## Why It Matters");
		expect(output).toContain("## My Takeaways");
		expect(output).toContain("## References");
	});

	it("places each section's content under the correct heading", () => {
		const output = formatNote(baseResult, { noteId: 1 });
		expect(output).toContain(baseResult.overview);
		expect(output).toContain(baseResult.keyConcepts);
		expect(output).toContain(baseResult.practicalExamples);
		expect(output).toContain(baseResult.whyItMatters);
		expect(output).toContain(baseResult.myTakeaways);
		expect(output).toContain(baseResult.references);
	});

	it("ends with a newline", () => {
		const output = formatNote(baseResult, { noteId: 1 });
		expect(output.endsWith("\n")).toBe(true);
	});

	// ── Snapshot ─────────────────────────────────────────────────────────

	it("produces a stable full output for a known input", () => {
		const output = formatNote(baseResult, { noteId: 12 });
		expect(output).toMatchInlineSnapshot(`
"---
id: note-12
slug: attention-is-all-you-need
title: Attention Is All You Need
tags: [transformers, deep-learning, nlp]
emoji: 🧠
---

# Attention Is All You Need

---

## Overview

The transformer architecture introduced in 2017.

---

## Key Concepts

Self-attention, multi-head attention, positional encoding.

---

## Practical Examples

BERT, GPT, T5 all build on this architecture.

---

## Why It Matters

Replaced RNNs and became the foundation of modern LLMs.

---

## My Takeaways

Attention allows the model to weigh token relevance globally.

---

## References

- Vaswani et al. (2017). Attention Is All You Need.
"
`);
	});
});
