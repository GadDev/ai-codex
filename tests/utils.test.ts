import { beforeEach, describe, expect, it } from "vitest";
import type { NoteMetadata } from "../src/types.ts";
import {
	configureParsers,
	getNoteContent,
	parseFrontMatter,
	readingTime,
	scoreRelatedness,
	slugify,
} from "../src/utils.ts";

// ── parseFrontMatter ──────────────────────────────────────────────────────

describe("parseFrontMatter", () => {
	it("parses a well-formed front-matter block", () => {
		const md = `---\ntitle: Hello World\ndate: 2024-01-01\ntags: [ai, ml]\n---\n# Body`;
		const fm = parseFrontMatter(md);
		expect(fm["title"]).toBe("Hello World");
		expect(fm["date"]).toBe("2024-01-01");
		expect(fm["tags"]).toBe("[ai, ml]");
	});

	it("returns an empty object when there is no front matter", () => {
		expect(parseFrontMatter("# No front matter")).toEqual({});
	});

	it("returns an empty object for an empty string", () => {
		expect(parseFrontMatter("")).toEqual({});
	});

	it("ignores lines without a colon", () => {
		const md = `---\ntitle: Good Line\nbad line no colon\n---`;
		const fm = parseFrontMatter(md);
		expect(fm["title"]).toBe("Good Line");
		expect(Object.keys(fm)).toHaveLength(1);
	});

	it("trims keys and values", () => {
		const md = `---\n  key  :  value  \n---`;
		const fm = parseFrontMatter(md);
		expect(fm["key"]).toBe("value");
	});

	it("handles a value that contains a colon", () => {
		const md = `---\nurl: https://example.com/path\n---`;
		const fm = parseFrontMatter(md);
		expect(fm["url"]).toBe("https://example.com/path");
	});
});

// ── readingTime ───────────────────────────────────────────────────────────

describe("readingTime", () => {
	it("returns 1 for an empty string", () => {
		expect(readingTime("")).toBe(1);
	});

	it("returns 1 for fewer than 200 words", () => {
		const text = Array(50).fill("word").join(" ");
		expect(readingTime(text)).toBe(1);
	});

	it("returns 2 for 400 words", () => {
		const text = Array(400).fill("word").join(" ");
		expect(readingTime(text)).toBe(2);
	});

	it("strips front matter before counting", () => {
		const body = Array(200).fill("word").join(" ");
		const withFm = `---\ntitle: Stripped\n---\n${body}`;
		// Front matter words should not be counted
		expect(readingTime(withFm)).toBe(1);
	});

	it("strips markdown syntax characters", () => {
		// All chars are syntax — results in 0 words → floor to 1
		expect(readingTime("### ** `` ~~ >> [] () !!")).toBe(1);
	});

	it("returns at least 1 for any input", () => {
		expect(readingTime("just one word")).toBe(1);
		expect(readingTime("")).toBe(1);
	});
});

// ── slugify ───────────────────────────────────────────────────────────────

describe("slugify", () => {
	it("lowercases and replaces spaces with hyphens", () => {
		expect(slugify("Hello World")).toBe("hello-world");
	});

	it("removes non-word characters (punctuation)", () => {
		expect(slugify("What is AI?")).toBe("what-is-ai");
	});

	it("collapses multiple hyphens into one", () => {
		// spaces → hyphens first, then /-+/ collapses consecutive hyphens
		expect(slugify("one  -- two")).toBe("one-two");
	});

	it("converts leading/trailing spaces to hyphens (.trim() only removes whitespace)", () => {
		// spaces become hyphens, then .trim() removes outer whitespace but not hyphens
		expect(slugify("  trim me  ")).toBe("-trim-me-");
	});

	it("returns an empty string for an empty input", () => {
		expect(slugify("")).toBe("");
	});

	it("preserves existing hyphens", () => {
		expect(slugify("pre-existing")).toBe("pre-existing");
	});

	it("handles non-ASCII punctuation by stripping it (spaces collapse to single hyphen)", () => {
		// '&' is stripped, the surrounding spaces become a single hyphen
		const result = slugify("AI & ML");
		expect(result).toBe("ai-ml");
	});
});

// ── scoreRelatedness ─────────────────────────────────────────────────────

describe("scoreRelatedness", () => {
	const base: NoteMetadata = {
		id: "note-01",
		slug: "01-base",
		emoji: "📝",
		title: "Machine Learning Basics",
		tags: ["ml", "ai", "deep-learning"],
	};

	it("returns 0 for notes with no tag or title overlap", () => {
		const other: NoteMetadata = {
			id: "note-02",
			slug: "02-other",
			emoji: "📌",
			title: "Cooking Recipes",
			tags: ["food", "cooking"],
		};
		expect(scoreRelatedness(base, other)).toBe(0);
	});

	it("scores tag overlap (weight 2 per tag)", () => {
		const oneTag: NoteMetadata = {
			id: "note-03",
			slug: "03-one",
			emoji: "🔬",
			title: "Something Unrelated",
			tags: ["ml"],
		};
		expect(scoreRelatedness(base, oneTag)).toBe(2);
	});

	it("scores multiple tag overlaps cumulatively", () => {
		const twoTags: NoteMetadata = {
			id: "note-04",
			slug: "04-two",
			emoji: "🤖",
			title: "Something Unrelated",
			tags: ["ml", "ai"],
		};
		expect(scoreRelatedness(base, twoTags)).toBe(4);
	});

	it("scores title word overlap (words > 3 chars)", () => {
		const titleOverlap: NoteMetadata = {
			id: "note-05",
			slug: "05-title",
			emoji: "📚",
			title: "Machine Learning Advanced", // 'machine' + 'learning' overlap
			tags: [],
		};
		// 'machine' and 'learning' are both >3 chars and overlap
		expect(scoreRelatedness(base, titleOverlap)).toBeGreaterThanOrEqual(2);
	});

	it("is commutative", () => {
		const other: NoteMetadata = {
			id: "note-06",
			slug: "06-comm",
			emoji: "🔁",
			title: "AI and Machine",
			tags: ["ai"],
		};
		expect(scoreRelatedness(base, other)).toBe(scoreRelatedness(other, base));
	});

	it("short words (≤3 chars) in titles do not count", () => {
		const shortWords: NoteMetadata = {
			id: "note-07",
			slug: "07-short",
			emoji: "🔤",
			title: "AI ML and the big one", // 'big' = 3 chars, filtered; only 'once' unique
			tags: [],
		};
		// base title has ['machine', 'learning', 'basics']
		// shortWords title has no overlap > 3 chars with base
		expect(scoreRelatedness(base, shortWords)).toBe(0);
	});
});

// ── getNoteContent ────────────────────────────────────────────────────────

describe("getNoteContent", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	it("returns trimmed textContent of matching element", () => {
		const el = document.createElement("script");
		el.id = "content-01";
		el.type = "text/markdown";
		el.textContent = "  # Hello World  ";
		document.body.appendChild(el);
		expect(getNoteContent("content-01")).toBe("# Hello World");
	});

	it("returns empty string when element is not found", () => {
		expect(getNoteContent("content-missing")).toBe("");
	});
});

// ── configureParsers ──────────────────────────────────────────────────────

describe("configureParsers", () => {
	it("runs without throwing", () => {
		expect(() => configureParsers()).not.toThrow();
	});
});
