/**
 * fetch.ts — Retrieve raw HTML from a given URL.
 * Phase 1 stub: signature and types defined, implementation in Phase 1 §2.3.
 */

export interface FetchResult {
	url: string;
	html: string;
	statusCode: number;
}

export class FetchError extends Error {
	constructor(
		public readonly url: string,
		message: string,
	) {
		super(message);
		this.name = "FetchError";
	}
}

/**
 * Fetch the HTML content of a URL.
 * - Only HTTP/HTTPS protocols are accepted.
 * - Enforces a request timeout.
 * - Throws FetchError on failure.
 */
export async function fetchUrl(_url: string): Promise<FetchResult> {
	// TODO: implement in Phase 1 §2.3
	throw new Error("fetchUrl not yet implemented");
}
