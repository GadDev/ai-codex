/**
 * summarize.ts — Call the Claude API to generate a structured note summary.
 * Phase 1 stub: signature and types defined, implementation in Phase 1 §2.4.
 */

export interface SummarizeInput {
	text: string;
	title: string;
	sourceUrl: string;
}

export interface SummarizeResult {
	title: string;
	slug: string;
	tags: string[];
	emoji: string;
	overview: string;
	keyConcepts: string;
	practicalExamples: string;
	whyItMatters: string;
	myTakeaways: string;
}

/**
 * Call the Claude API to summarize content into a structured note.
 * - Uses CLAUDE_API_KEY from process.env — never hardcoded.
 * - Prompt explicitly instructs the model to treat input as untrusted data
 *   and ignore any instructions embedded in the content.
 * - Throws on API errors or unexpected response shapes.
 */
export async function summarize(
	_input: SummarizeInput,
): Promise<SummarizeResult> {
	// TODO: implement in Phase 1 §2.4
	throw new Error("summarize not yet implemented");
}
