import { beforeEach, describe, expect, it } from "vitest";
import { extractSpeechContent } from "../src/tts.ts";

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Build a container element with the given inner HTML string.
 * Returns a real HTMLElement in the jsdom environment.
 */
function makeContent(html: string): HTMLElement {
	const div = document.createElement("div");
	div.innerHTML = html;
	return div;
}

beforeEach(() => {
	document.body.innerHTML = "";
});

// ── extractSpeechContent ──────────────────────────────────────────────────

describe("extractSpeechContent", () => {
	it("returns empty fullText and zero segments for an empty element", () => {
		const { fullText, segments } = extractSpeechContent(makeContent(""));
		expect(fullText).toBe("");
		expect(segments).toHaveLength(0);
	});

	it("extracts a single paragraph", () => {
		const { fullText, segments } = extractSpeechContent(
			makeContent("<p>Hello world</p>"),
		);
		expect(segments).toHaveLength(1);
		expect(fullText).toBe("Hello world");
	});

	it("extracts multiple elements in document order", () => {
		const { segments } = extractSpeechContent(
			makeContent("<h2>Title</h2><p>Body text.</p>"),
		);
		expect(segments).toHaveLength(2);
		// Heading gets ". " suffix from normalizeForSpeech
		expect(segments[0]!.text).toMatch(/^Title/);
		expect(segments[1]!.text).toBe("Body text.");
	});

	it("joins all segment texts into fullText with single spaces", () => {
		const { fullText, segments } = extractSpeechContent(
			makeContent("<p>First.</p><p>Second.</p><p>Third.</p>"),
		);
		expect(fullText).toBe(segments.map((s) => s.text).join(" "));
	});

	it("skips elements inside <pre> code blocks", () => {
		const html = `
      <p>Before code.</p>
      <pre><code><p>Inside code — should be skipped</p></code></pre>
      <p>After code.</p>
    `;
		const { segments } = extractSpeechContent(makeContent(html));
		const texts = segments.map((s) => s.text);
		expect(texts.some((t) => t.includes("Inside code"))).toBe(false);
		expect(texts).toContain("Before code.");
		expect(texts).toContain("After code.");
	});

	it("skips elements with no text content", () => {
		const { segments } = extractSpeechContent(
			makeContent("<p></p><p>   </p><p>Real text.</p>"),
		);
		const nonEmpty = segments.filter((s) => s.text.length > 0);
		expect(nonEmpty).toHaveLength(1);
		expect(nonEmpty[0]!.text).toBe("Real text.");
	});
});

// ── Segment char offsets (sentence splitting) ─────────────────────────────

describe("segment charStart / charEnd offsets", () => {
	it("first segment starts at 0", () => {
		const { segments } = extractSpeechContent(
			makeContent("<p>Hello.</p><p>World.</p>"),
		);
		expect(segments[0]!.charStart).toBe(0);
	});

	it("charEnd equals charStart + text.length - 1", () => {
		const { segments } = extractSpeechContent(
			makeContent("<p>Hello.</p><p>World.</p>"),
		);
		for (const seg of segments) {
			expect(seg.charEnd).toBe(seg.charStart + seg.text.length - 1);
		}
	});

	it("consecutive segments are separated by exactly one character (+1 space)", () => {
		const { segments } = extractSpeechContent(
			makeContent("<p>Aaa.</p><p>Bbb.</p><p>Ccc.</p>"),
		);
		expect(segments).toHaveLength(3);
		// Second segment starts immediately after first segment's charEnd + 1 space
		expect(segments[1]!.charStart).toBe(segments[0]!.charEnd + 2);
		expect(segments[2]!.charStart).toBe(segments[1]!.charEnd + 2);
	});

	it("fullText covers the entire char range [0, last charEnd]", () => {
		const { fullText, segments } = extractSpeechContent(
			makeContent("<p>Alpha.</p><p>Beta.</p>"),
		);
		const lastSeg = segments[segments.length - 1]!;
		expect(fullText.length).toBe(lastSeg.charEnd + 1);
	});

	it("each segment's el references the originating DOM element", () => {
		const container = makeContent("<p>First</p><p>Second</p>");
		const { segments } = extractSpeechContent(container);
		expect(segments[0]!.el.tagName).toBe("P");
		expect(segments[0]!.el.textContent).toBe("First");
		expect(segments[1]!.el.textContent).toBe("Second");
	});
});

// ── normalizeForSpeech (tested via extractSpeechContent) ─────────────────

describe("normalizeForSpeech — abbreviation expansion", () => {
	it("expands e.g. to 'for example'", () => {
		const { segments } = extractSpeechContent(
			makeContent("<p>Use e.g. this approach.</p>"),
		);
		expect(segments[0]!.text).toContain("for example");
		expect(segments[0]!.text).not.toContain("e.g.");
	});

	it("expands i.e. to 'that is'", () => {
		const { segments } = extractSpeechContent(
			makeContent("<p>The result, i.e. the answer, is 42.</p>"),
		);
		expect(segments[0]!.text).toContain("that is");
	});

	it("expands etc. to 'and so on'", () => {
		const { segments } = extractSpeechContent(
			makeContent("<p>Items like foo, bar, etc. go here.</p>"),
		);
		expect(segments[0]!.text).toContain("and so on");
	});

	it("expands API to 'A P I'", () => {
		const { segments } = extractSpeechContent(
			makeContent("<p>Call the API endpoint.</p>"),
		);
		expect(segments[0]!.text).toContain("A P I");
	});

	it("expands LLM to 'L L M'", () => {
		const { segments } = extractSpeechContent(
			makeContent("<p>An LLM model.</p>"),
		);
		expect(segments[0]!.text).toContain("L L M");
	});

	it("expands RAG to 'R A G'", () => {
		const { segments } = extractSpeechContent(
			makeContent("<p>Use RAG pipelines.</p>"),
		);
		expect(segments[0]!.text).toContain("R A G");
	});

	it("strips leftover markdown symbols (**, *, `, #)", () => {
		const { segments } = extractSpeechContent(
			makeContent("<p>**bold** and `code` and # heading</p>"),
		);
		expect(segments[0]!.text).not.toContain("**");
		expect(segments[0]!.text).not.toContain("`");
		expect(segments[0]!.text).not.toContain("#");
	});
});

describe("normalizeForSpeech — heading suffix", () => {
	it("appends '. ' to an h2 heading that doesn't end with punctuation", () => {
		const { segments } = extractSpeechContent(
			makeContent("<h2>Introduction</h2>"),
		);
		expect(segments[0]!.text).toBe("Introduction.");
	});

	it("does not double-punctuate a heading already ending with '.'", () => {
		const { segments } = extractSpeechContent(
			makeContent("<h2>Introduction.</h2>"),
		);
		expect(segments[0]!.text).not.toMatch(/\.\./);
	});

	it("adds suffix to h3 as well", () => {
		const { segments } = extractSpeechContent(
			makeContent("<h3>Sub-Section</h3>"),
		);
		expect(segments[0]!.text).toMatch(/\.$/);
	});

	it("does NOT add suffix to a paragraph", () => {
		const { segments } = extractSpeechContent(
			makeContent("<p>Plain paragraph text</p>"),
		);
		// Paragraphs get no forced suffix
		expect(segments[0]!.text).toBe("Plain paragraph text");
	});
});

describe("normalizeForSpeech — em-dash handling", () => {
	it("replaces em-dash with a comma", () => {
		const { segments } = extractSpeechContent(
			makeContent("<p>Before \u2014 after</p>"),
		);
		expect(segments[0]!.text).toContain(",");
		expect(segments[0]!.text).not.toContain("\u2014");
	});

	it("replaces double-hyphen with a comma", () => {
		const { segments } = extractSpeechContent(
			makeContent("<p>Before -- after</p>"),
		);
		expect(segments[0]!.text).toContain(",");
		expect(segments[0]!.text).not.toContain("--");
	});
});

// ── List item handling ────────────────────────────────────────────────────

describe("list items", () => {
	it("extracts direct text from a list item", () => {
		const { segments } = extractSpeechContent(
			makeContent("<ul><li>Item one</li><li>Item two</li></ul>"),
		);
		const texts = segments.map((s) => s.text);
		expect(texts).toContain("Item one");
		expect(texts).toContain("Item two");
	});

	it("does not duplicate text from nested sub-lists", () => {
		const html = `<ul>
      <li>Parent item
        <ul><li>Nested child</li></ul>
      </li>
    </ul>`;
		const { segments } = extractSpeechContent(makeContent(html));
		// "Nested child" should appear at most once (as its own li segment)
		const occurrences = segments.filter((s) =>
			s.text.includes("Nested child"),
		).length;
		expect(occurrences).toBeLessThanOrEqual(1);
	});
});

// ── Collapse-toggle buttons are stripped ─────────────────────────────────

describe("collapse-toggle button removal", () => {
	it("does not include button text in the segment", () => {
		const html = `<h2>Section Title<button class="collapse-toggle">▾</button></h2>`;
		const { segments } = extractSpeechContent(makeContent(html));
		expect(segments[0]!.text).not.toContain("▾");
		expect(segments[0]!.text).toMatch(/^Section Title/);
	});
});
