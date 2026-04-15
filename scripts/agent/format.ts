/**
 * format.ts — Convert a SummarizeResult into a Markdown note string.
 */

import type { SummarizeResult } from "./summarize.ts";

export interface FormatOptions {
	/** Sequential note ID used in frontmatter (e.g. 38). */
	noteId: number;
}

/** Pad a number to two digits: 7 → "07", 38 → "38". */
function padId(n: number): string {
	return String(n).padStart(2, "0");
}

/**
 * Render a tags array as an inline YAML sequence: ["a","b"] → [a, b]
 * No quoting unless the tag contains special YAML characters.
 */
function renderTagsYaml(tags: string[]): string {
	return `[${tags.join(", ")}]`;
}

/**
 * Render a structured summary as a Markdown note with YAML frontmatter.
 *
 * Output shape:
 * ---
 * id: note-38
 * slug: example-topic
 * title: Example Topic
 * tags: [tag1, tag2]
 * emoji: 🧠
 * ---
 *
 * # Example Topic
 *
 * ## Overview
 * ## Key Concepts
 * ## Practical Examples
 * ## Why It Matters
 * ## My Takeaways
 * ## References
 */
export function formatNote(
	result: SummarizeResult,
	options: FormatOptions,
): string {
	const id = `note-${padId(options.noteId)}`;

	// Sanitise title for use in the frontmatter: strip characters that break YAML
	const safeTitle = result.title.replace(/[:"{}[\]|>&*!,%@`]/g, "").trim();
	const safeTags = result.tags.map((t) => t.toLowerCase().replace(/\s+/g, "-"));

	const frontmatter = [
		"---",
		`id: ${id}`,
		`slug: ${result.slug}`,
		`title: ${safeTitle}`,
		`tags: ${renderTagsYaml(safeTags)}`,
		`emoji: ${result.emoji}`,
		"---",
	].join("\n");

	const sectionParts: string[] = [];
	for (const section of result.sections) {
		sectionParts.push("---", "", section.heading, "", section.content, "");
	}

	const body = [
		`# ${result.title}`,
		"",
		"---",
		"",
		"## Overview",
		"",
		result.overview,
		"",
		...sectionParts,
		"---",
		"",
		"## My Takeaways",
		"",
		result.myTakeaways,
		"",
		"---",
		"",
		"## References",
		"",
		result.references,
	].join("\n");

	return `${frontmatter}\n\n${body}\n`;
}
