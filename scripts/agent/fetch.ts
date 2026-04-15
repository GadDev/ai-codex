/**
 * fetch.ts — Retrieve raw HTML from a given URL.
 */

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 500;

const ALLOWED_PROTOCOLS = new Set(["https:"]);

export interface FetchResult {
	readonly url: string;
	readonly html: string;
	readonly statusCode: number;
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

function assertProtocol(url: string): void {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw new FetchError(url, `Invalid URL: "${url}"`);
	}

	if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
		throw new FetchError(
			url,
			`Unsupported protocol "${parsed.protocol}". Only https: are allowed.`,
		);
	}
}

async function fetchWithTimeout(url: string): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		return await fetch(url, {
			signal: controller.signal,
			headers: { "User-Agent": "ai-codex-ingest/1.0" },
			redirect: "follow",
		});
	} catch (err) {
		if ((err as Error).name === "AbortError") {
			throw new FetchError(
				url,
				`Request timed out after ${FETCH_TIMEOUT_MS}ms`,
			);
		}
		throw err;
	} finally {
		clearTimeout(timeoutId);
	}
}

/**
 * Fetch the HTML content of a URL.
 * - Only https: protocols are accepted.
 * - Enforces a 10-second timeout per attempt.
 * - Retries up to 2 times with linear backoff on transient failures.
 * - Throws FetchError on validation failures, timeouts, or non-2xx responses.
 */
export async function fetchUrl(url: string): Promise<FetchResult> {
	assertProtocol(url);

	let lastError: unknown;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			const response = await fetchWithTimeout(url);

			if (!response.ok) {
				throw new FetchError(
					url,
					`HTTP ${response.status}: ${response.statusText}`,
				);
			}

			const html = await response.text();
			return { url, html, statusCode: response.status };
		} catch (err) {
			// Non-retryable: protocol errors and explicit HTTP failures
			if (err instanceof FetchError) throw err;

			lastError = err;

			if (attempt < MAX_RETRIES) {
				await new Promise<void>((resolve) =>
					setTimeout(resolve, RETRY_BASE_DELAY_MS * (attempt + 1)),
				);
			}
		}
	}

	throw new FetchError(
		url,
		`Failed after ${MAX_RETRIES + 1} attempts: ${String(lastError)}`,
	);
}
