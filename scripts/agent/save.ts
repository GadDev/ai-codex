/**
 * save.ts — Persist a validated note to /notes/drafts/.
 * Phase 1 stub: signature and types defined, implementation in Phase 1 §2.7.
 */

export interface SaveResult {
	filePath: string;
}

/**
 * Write a Markdown note to /notes/drafts/{slug}.md.
 * Security invariants (enforced at implementation time):
 * - Resolves the final path and asserts it remains inside the project root.
 * - Never overwrites an existing file.
 * - Rejects slugs containing path traversal sequences (e.g. "../").
 */
export async function saveDraft(
	_slug: string,
	_markdown: string,
): Promise<SaveResult> {
	// TODO: implement in Phase 1 §2.7
	throw new Error("saveDraft not yet implemented");
}
