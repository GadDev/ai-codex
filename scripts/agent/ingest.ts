/**
 * ingest.ts — Orchestrator for the agent ingestion pipeline.
 * Phase 1 stub: CLI wiring and pipeline structure defined, full implementation
 * built incrementally through Phase 1 §2.2–2.8.
 *
 * Usage:
 *   npm run ingest -- --url="https://example.com"
 *   npm run ingest -- --url="https://a.com,https://b.com"
 */

import { fetchUrl } from "./fetch.ts";
import { formatNote } from "./format.ts";
import { sanitizeHtml } from "./sanitize.ts";
import { saveDraft } from "./save.ts";
import { summarize } from "./summarize.ts";
import { validateNote } from "./validate.ts";

/** Maximum URLs accepted per run (rate-limit guard). */
const MAX_URLS = 3;

/**
 * Run the full ingestion pipeline for a single URL.
 * Steps: fetch → sanitize → summarize → format → validate → save
 */
async function ingestUrl(_url: string, _noteId: number): Promise<void> {
	// TODO: implement pipeline in Phase 1 §2.2–2.7
	throw new Error("ingestUrl not yet implemented");
}

/**
 * Entry point — parse CLI arguments and invoke the pipeline.
 */
async function main(): Promise<void> {
	// TODO: implement CLI parsing in Phase 1 §2.2
	console.log("Agent ingestion system — Phase 1 setup complete.");
	console.log(`MAX_URLS per run: ${MAX_URLS}`);
	console.log(
		"Run 'npm run ingest -- --url=<url>' once implementation is complete.",
	);

	// Verify environment is configured
	if (!process.env["CLAUDE_API_KEY"]) {
		console.error(
			"ERROR: CLAUDE_API_KEY is not set. Add it to your .env file.",
		);
		process.exit(1);
	}
}

main().catch((err: unknown) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
