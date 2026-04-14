/* ═══════════════════════════════════════════
   utils.ts — Pure utility functions (no side effects)
   ═══════════════════════════════════════════ */

import hljs from "highlight.js";
import { marked } from "marked";
import type { FrontMatter, NoteCategory, NoteMetadata } from "./types.js";

// ── DOM read helpers (query-only, no mutation) ──

/** Read note content from the inert <script type="text/markdown"> tags in the HTML. */
export function getNoteContent(contentId: string): string {
	const el = document.getElementById(contentId);
	return el ? el.textContent!.trim() : "";
}

// ── Markdown / front-matter helpers ──

/** Parse YAML-style front matter from raw markdown; returns a key/value object. */
export function parseFrontMatter(rawMd: string): FrontMatter {
	const match = rawMd.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return {};
	return match[1].split("\n").reduce<FrontMatter>((acc, line) => {
		const idx = line.indexOf(":");
		if (idx > 0) {
			acc[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
		}
		return acc;
	}, {});
}

/** Estimated reading time in minutes (pure). */
export function readingTime(rawMd: string): number {
	const text = rawMd
		.replace(/^---[\s\S]*?---/, "")
		.replace(/[#`*_~>[\]()!|]/g, "");
	const words = text.trim().split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.ceil(words / 200));
}

/** URL-safe slug from a heading string (pure). */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.trim();
}

/**
 * Score the relatedness between two note objects (pure).
 * Higher score = more related.
 */
export function scoreRelatedness(a: NoteMetadata, b: NoteMetadata): number {
	const tagOverlap = a.tags.filter((t) => b.tags.includes(t)).length;
	const aWords = new Set(
		a.title
			.toLowerCase()
			.split(/\W+/)
			.filter((w) => w.length > 3),
	);
	const bWords = new Set(
		b.title
			.toLowerCase()
			.split(/\W+/)
			.filter((w) => w.length > 3),
	);
	const titleOverlap = [...aWords].filter((w) => bWords.has(w)).length;
	return tagOverlap * 2 + titleOverlap;
}

// ── Parser configuration (side effect: configures the marked instance) ──

/** Configure marked options. highlight.js highlighting is applied post-render via hljs.highlightElement(). */
export function configureParsers(): void {
	marked.use({ breaks: true, gfm: true });
}

// ── Note categorization ──

/** Predefined category definitions mapping note IDs to high-level topics. */
const CATEGORIES: readonly NoteCategory[] = [
	{
		name: "Getting Started",
		description: "Foundations of AI and Claude development",
		noteIds: [
			"note-01",
			"note-02",
			"note-03",
			"note-04",
			"note-05",
			"note-06",
			"note-07",
			"note-08",
			"note-09",
			"note-10",
		],
	},
	{
		name: "Core AI & ML",
		description: "Deep learning, models, RAG, agents, and safety",
		noteIds: [
			"note-11",
			"note-12",
			"note-13",
			"note-14",
			"note-15",
			"note-16",
			"note-17",
			"note-18",
			"note-19",
			"note-20",
			"note-21",
			"note-22",
			"note-23",
			"note-24",
			"note-25",
		],
	},
	{
		name: "Production & Scale",
		description: "Building AI systems for production environments",
		noteIds: [
			"note-26",
			"note-27",
			"note-28",
			"note-29",
			"note-30",
			"note-31",
			"note-32",
		],
	},
	{
		name: "Latest Features",
		description: "Cutting-edge capabilities and optimization",
		noteIds: ["note-33", "note-34", "note-35", "note-36", "note-37"],
	},
];

/**
 * Organize notes into their categories (pure).
 * Returns categories with resolved NoteMetadata for each note.
 */
export function categorizeNotes(
	notes: readonly NoteMetadata[],
): Array<NoteCategory & { notes: NoteMetadata[] }> {
	const noteMap = new Map(notes.map((n) => [n.id, n]));
	return CATEGORIES.map((cat) => ({
		...cat,
		notes: cat.noteIds
			.map((id) => noteMap.get(id))
			.filter((n): n is NoteMetadata => n !== undefined),
	}));
}

export { hljs };
