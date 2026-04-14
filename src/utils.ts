/* ═══════════════════════════════════════════
   utils.ts — Pure utility functions (no side effects)
   ═══════════════════════════════════════════ */

import hljs from "highlight.js";
import { marked } from "marked";
import type { FrontMatter, NoteMetadata } from "./types.js";

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

export { hljs };
