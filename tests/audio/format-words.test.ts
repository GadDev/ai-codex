import { describe, expect, it } from "vitest";
import type { WhisperVerboseJson } from "../../scripts/audio/format-words.ts";
import { formatWords } from "../../scripts/audio/format-words.ts";

function makeResponse(
	words: Array<{ word: string; start: number; end: number }>,
): WhisperVerboseJson {
	return { words };
}

describe("formatWords", () => {
	it("returns correct shape for valid input", () => {
		const result = formatWords(
			makeResponse([{ word: "hello", start: 0.0, end: 0.5 }]),
		);
		expect(result).toEqual([{ word: "hello", start: 0.0, end: 0.5 }]);
	});

	it("handles a response with no words array", () => {
		expect(formatWords({})).toEqual([]);
	});

	it("handles an empty words array", () => {
		expect(formatWords(makeResponse([]))).toEqual([]);
	});

	it("filters out empty string tokens", () => {
		const result = formatWords(
			makeResponse([
				{ word: "", start: 0.0, end: 0.1 },
				{ word: "hello", start: 0.2, end: 0.5 },
			]),
		);
		expect(result).toHaveLength(1);
		expect(result[0]!.word).toBe("hello");
	});

	it("filters out whitespace-only tokens", () => {
		const result = formatWords(
			makeResponse([{ word: "   ", start: 0.0, end: 0.1 }]),
		);
		expect(result).toHaveLength(0);
	});

	it("filters out punctuation-only tokens", () => {
		const punctuationTokens = [".", ",", "!", "?", ":", ";", "—", "..."];
		for (const token of punctuationTokens) {
			const result = formatWords(
				makeResponse([{ word: token, start: 0.0, end: 0.1 }]),
			);
			expect(result, `expected "${token}" to be filtered`).toHaveLength(0);
		}
	});

	it("throws for an entry where start >= end (equal)", () => {
		expect(() =>
			formatWords(makeResponse([{ word: "bad", start: 1.0, end: 1.0 }])),
		).toThrow("start (1) >= end (1)");
	});

	it("throws for an entry where start > end", () => {
		expect(() =>
			formatWords(makeResponse([{ word: "bad", start: 2.5, end: 1.0 }])),
		).toThrow("start (2.5) >= end (1)");
	});

	it("only throws on the malformed entry, after valid entries were already processed", () => {
		expect(() =>
			formatWords(
				makeResponse([
					{ word: "good", start: 0.0, end: 0.5 },
					{ word: "bad", start: 1.0, end: 0.8 },
				]),
			),
		).toThrow('word "bad"');
	});

	it("trims whitespace from word tokens", () => {
		const result = formatWords(
			makeResponse([{ word: "  hello  ", start: 0.0, end: 0.5 }]),
		);
		expect(result[0]!.word).toBe("hello");
	});

	it("preserves multiple valid words in order", () => {
		const words = [
			{ word: "one", start: 0.0, end: 0.4 },
			{ word: "two", start: 0.5, end: 0.9 },
			{ word: "three", start: 1.0, end: 1.5 },
		];
		const result = formatWords(makeResponse(words));
		expect(result).toHaveLength(3);
		expect(result.map((w) => w.word)).toEqual(["one", "two", "three"]);
	});

	it("produces readonly-compatible output shape", () => {
		const result = formatWords(
			makeResponse([{ word: "test", start: 0.0, end: 0.3 }]),
		);
		expect(typeof result[0]!.word).toBe("string");
		expect(typeof result[0]!.start).toBe("number");
		expect(typeof result[0]!.end).toBe("number");
	});
});
