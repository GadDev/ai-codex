import { describe, expect, it } from "vitest";
import { extractSpeechText } from "../../scripts/audio/extract-text.ts";

describe("extractSpeechText", () => {
	it("strips YAML front matter block", () => {
		const input = `---
title: My Note
tags: [ai, llm]
---

# Heading

Body text.`;
		const result = extractSpeechText(input);
		expect(result).not.toContain("title:");
		expect(result).not.toContain("tags:");
		expect(result).toContain("Body text.");
	});

	it("strips fenced code blocks entirely", () => {
		const input = `
Some text.

\`\`\`typescript
const x = require("module");
\`\`\`

More text.`;
		const result = extractSpeechText(input);
		expect(result).not.toContain("const x");
		expect(result).not.toContain("require");
		expect(result).toContain("Some text.");
		expect(result).toContain("More text.");
	});

	it("strips inline code spans", () => {
		const result = extractSpeechText("Call `extractSpeechText()` to convert.");
		expect(result).not.toContain("`");
		expect(result).toContain("Call to convert.");
	});

	it("adds a period-pause after headings", () => {
		const result = extractSpeechText("## The 4Ds");
		expect(result).toMatch(/The 4Ds\./);
	});

	it("does not double-punctuate headings that already end with a period", () => {
		const result = extractSpeechText("## Already done.");
		expect(result).not.toMatch(/\.\.$/);
	});

	it("strips bold and italic markers", () => {
		const result = extractSpeechText(
			"This is **bold** and *italic* and _underscore_.",
		);
		expect(result).not.toContain("**");
		expect(result).not.toContain("*");
		expect(result).not.toContain("_");
		expect(result).toContain("This is bold and italic and underscore.");
	});

	it("strips blockquote markers", () => {
		const result = extractSpeechText("> This is a quote.");
		expect(result).not.toContain(">");
		expect(result).toContain("This is a quote.");
	});

	it("strips strikethrough markers", () => {
		const result = extractSpeechText("~~removed~~ kept.");
		expect(result).not.toContain("~");
		expect(result).toContain("removed kept.");
	});

	it("expands LLM to L L M", () => {
		const result = extractSpeechText("An LLM is a language model.");
		expect(result).toContain("L L M");
		expect(result).not.toMatch(/\bLLM\b/);
	});

	it("expands RAG to R A G", () => {
		const result = extractSpeechText("RAG retrieves documents.");
		expect(result).toContain("R A G");
	});

	it("expands API to A P I", () => {
		const result = extractSpeechText("Call the API endpoint.");
		expect(result).toContain("A P I");
	});

	it("expands RLHF to R L H F", () => {
		const result = extractSpeechText("RLHF is used for alignment.");
		expect(result).toContain("R L H F");
	});

	it("expands e.g. to for example", () => {
		const result = extractSpeechText("Use tools, e.g. a hammer.");
		expect(result).toContain("for example");
	});

	it("keeps markdown link text, drops URL", () => {
		const result = extractSpeechText(
			"See [the docs](https://example.com) for more.",
		);
		expect(result).toContain("the docs");
		expect(result).not.toContain("https://");
	});

	it("collapses multiple blank lines into one", () => {
		const result = extractSpeechText("Para one.\n\n\n\nPara two.");
		expect(result).not.toMatch(/\n{3,}/);
	});

	it("collapses multiple spaces into one", () => {
		const result = extractSpeechText("word1   word2");
		expect(result).toMatch(/word1 word2/);
	});

	it("handles a real note fragment end-to-end", () => {
		const input = `---
title: AI Fluency Framework
tags: [ai-fluency]
---

## The 4Ds. Core Competencies.

### 1. Delegation

Deciding what work should be done by humans, what by AI, and how to distribute tasks.

\`\`\`bash
npm run build
\`\`\`

Use the \`extractSpeechText\` function to process an **LLM** note with RAG support.
`;
		const result = extractSpeechText(input);
		// Front matter gone
		expect(result).not.toContain("title:");
		// Code block gone
		expect(result).not.toContain("npm run build");
		// Inline code gone
		expect(result).not.toContain("`");
		// Abbreviations expanded
		expect(result).toContain("L L M");
		expect(result).toContain("R A G");
		// Heading pause present
		expect(result).toMatch(/Delegation\./);
	});
});
