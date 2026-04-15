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
	sections: [
		{
			heading: "## Self-Attention — The Core Idea",
			content: "Self-attention, multi-head attention, positional encoding.",
		},
		{
			heading: "## Why It Replaced RNNs",
			content: "BERT, GPT, T5 all build on this architecture.",
		},
	],
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

	it("includes overview, custom section headings, takeaways, and references", () => {
		const output = formatNote(baseResult, { noteId: 1 });
		expect(output).toContain("## Overview");
		expect(output).toContain("## Self-Attention — The Core Idea");
		expect(output).toContain("## Why It Replaced RNNs");
		expect(output).toContain("## My Takeaways");
		expect(output).toContain("## References");
	});

	it("places each section's content under the correct heading", () => {
		const output = formatNote(baseResult, { noteId: 1 });
		expect(output).toContain(baseResult.overview);
		for (const section of baseResult.sections) {
			expect(output).toContain(section.heading);
			expect(output).toContain(section.content);
		}
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

## Self-Attention — The Core Idea

Self-attention, multi-head attention, positional encoding.

---

## Why It Replaced RNNs

BERT, GPT, T5 all build on this architecture.

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
