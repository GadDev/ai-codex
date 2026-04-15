/**
 * format.ts — Convert a SummarizeResult into a Markdown note string.
 * Phase 1 stub: signature and types defined, implementation in Phase 1 §2.5.
 */

import type { SummarizeResult } from "./summarize.ts";

export interface FormatOptions {
	/** Sequential note ID used in frontmatter (e.g. 38). */
	noteId: number;
}

/**
 * Render a structured summary as a Markdown note with YAML frontmatter.
 *
 * Output shape:
 * ---
 * id: note-XX
 * slug: example-topic
 * title: Example Topic
 * tags: ["tag1", "tag2"]
 * emoji: 🧠
 * ---
 *
 * ## Overview
 * ## Key Concepts
 * ## Practical Examples
 * ## Why It Matters
 * ## My Takeaways
 */
export function formatNote(
	_result: SummarizeResult,
	_options: FormatOptions,
): string {
	// TODO: implement in Phase 1 §2.5
	throw new Error("formatNote not yet implemented");
}
