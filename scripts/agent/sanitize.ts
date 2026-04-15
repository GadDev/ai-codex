/**
 * sanitize.ts — Strip unsafe HTML, extract readable plain text.
 * Phase 1 stub: signature and types defined, implementation in Phase 1 §2.3.
 */

export interface SanitizeResult {
	text: string;
	title: string;
}

/**
 * Sanitize raw HTML and extract readable content.
 * - Removes <script>, <style>, inline event handlers, and embedded instructions.
 * - Returns clean plain text and page title.
 * - Treats all input as untrusted.
 */
export function sanitizeHtml(
	_html: string,
	_sourceUrl: string,
): SanitizeResult {
	// TODO: implement in Phase 1 §2.3
	throw new Error("sanitizeHtml not yet implemented");
}
