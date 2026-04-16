/**
 * ingest.ts — Orchestrator for the agent ingestion pipeline.
 *
 * Usage:
 *   npm run ingest -- --url="https://example.com"
 *   npm run ingest -- --url="https://a.com" --url="https://b.com"
 *   npm run ingest -- --urls="https://a.com,https://b.com" --combine
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import ora from "ora";
import { FetchError, fetchUrl } from "./fetch.ts";
import { formatNote } from "./format.ts";
import { logError, logRun, setDebug } from "./logger.ts";
import { sanitizeHtml } from "./sanitize.ts";
import { SaveError, saveDraft } from "./save.ts";
import {
	NOTE_LENGTHS,
	type NoteLength,
	SUMMARIZE_ROLES,
	SummarizeError,
	type SummarizeInput,
	type SummarizeRole,
	summarize,
} from "./summarize.ts";
import { validateNote } from "./validate.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

/** Maximum URLs accepted per run (rate-limit guard). */
const MAX_URLS = 3;

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

// ── Env loading ────────────────────────────────────────────────────────────

/**
 * Load .env from the project root into process.env.
 * Only sets variables not already present in the environment.
 * Skips silently if the file does not exist.
 */
function loadEnv(): void {
	const envPath = join(ROOT, ".env");
	if (!existsSync(envPath)) return;

	const lines = readFileSync(envPath, "utf-8").split("\n");
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx === -1) continue;
		const key = trimmed.slice(0, eqIdx).trim();
		const value = trimmed.slice(eqIdx + 1).trim();
		if (key && !(key in process.env)) {
			process.env[key] = value;
		}
	}
}

// ── Argument parsing ───────────────────────────────────────────────────────

interface ParsedArgs {
	urls: string[];
	topic: string | null;
	description: string | null;
	role: SummarizeRole;
	length: NoteLength;
	combine: boolean;
	debug: boolean;
}

/**
 * Parse CLI arguments from process.argv.
 * Supports:
 *   --url="https://a.com"               single URL (repeatable)
 *   --url="https://a.com" --url="b.com"  multiple single-URL flags
 *   --urls="https://a.com,https://b.com" comma-separated (use with --combine)
 *   --topic="some topic"           generate from topic (no URL fetch)
 *   --role=security                analysis lens (default: llm)
 *   --length=short|medium|long     note length target (default: medium)
 *   --combine                      merge all URLs into one draft
 */
function parseArgs(argv: string[]): ParsedArgs {
	const urls: string[] = [];
	let topic: string | null = null;
	let description: string | null = null;
	let role: SummarizeRole = "llm";
	let length: NoteLength = "medium";
	let combine = false;
	let debug = false;

	for (const arg of argv.slice(2)) {
		if (arg === "--debug") {
			debug = true;
			continue;
		}

		if (arg === "--combine") {
			combine = true;
			continue;
		}

		const urlMatch = arg.match(/^--url=(.+)$/);
		if (urlMatch) {
			const trimmed = (urlMatch[1] ?? "").trim();
			if (trimmed) urls.push(trimmed);
			continue;
		}

		const urlsMatch = arg.match(/^--urls=(.+)$/);
		if (urlsMatch) {
			const raw = urlsMatch[1] ?? "";
			for (const u of raw.split(",")) {
				const trimmed = u.trim();
				if (trimmed) urls.push(trimmed);
			}
			continue;
		}

		const topicMatch = arg.match(/^--topic=(.+)$/);
		if (topicMatch) {
			topic = topicMatch[1] ?? null;
			continue;
		}

		const descriptionMatch = arg.match(/^--description=(.+)$/);
		if (descriptionMatch) {
			description = descriptionMatch[1] ?? null;
			continue;
		}

		const roleMatch = arg.match(/^--role=(.+)$/);
		if (roleMatch) {
			const raw = roleMatch[1]?.trim() as SummarizeRole;
			if (raw in SUMMARIZE_ROLES) {
				role = raw;
			} else {
				const valid = Object.keys(SUMMARIZE_ROLES).join(", ");
				console.error(
					chalk.red(`ERROR: Unknown role "${raw}". Valid roles: ${valid}`),
				);
				process.exit(1);
			}
			continue;
		}

		const lengthMatch = arg.match(/^--length=(.+)$/);
		if (lengthMatch) {
			const raw = lengthMatch[1]?.trim() as NoteLength;
			if (raw in NOTE_LENGTHS) {
				length = raw;
			} else {
				const valid = Object.keys(NOTE_LENGTHS).join(", ");
				console.error(
					chalk.red(`ERROR: Unknown length "${raw}". Valid values: ${valid}`),
				);
				process.exit(1);
			}
		}
	}

	return { urls, topic, description, role, length, combine, debug };
}

// ── Validation ─────────────────────────────────────────────────────────────

class ValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ValidationError";
	}
}

function validateUrls(urls: string[]): void {
	if (urls.length === 0) {
		throw new ValidationError(
			'No URLs provided. Use --url="https://example.com" or --urls="a.com,b.com"',
		);
	}

	if (urls.length > MAX_URLS) {
		throw new ValidationError(
			`Too many URLs: ${urls.length} provided, maximum is ${MAX_URLS}`,
		);
	}

	for (const url of urls) {
		let parsed: URL;
		try {
			parsed = new URL(url);
		} catch {
			throw new ValidationError(`Invalid URL: "${url}"`);
		}

		if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
			throw new ValidationError(
				`Unsupported protocol "${parsed.protocol}" in URL: "${url}". Only http: and https: are allowed.`,
			);
		}
	}
}

// ── Note ID helpers ──────────────────────────────────────────────────────

/**
 * Return the next available note ID by scanning /notes/ for existing
 * zero-padded numeric prefixes (e.g. "37-*.md" → next is 38).
 */
function nextNoteId(): number {
	let max = 0;
	let files: string[];
	try {
		files = readdirSync(join(ROOT, "notes")).filter((f) => f.endsWith(".md"));
	} catch {
		return 1;
	}
	for (const f of files) {
		const m = f.match(/^(\d+)/);
		if (m) max = Math.max(max, parseInt(m[1] as string, 10));
	}
	return max + 1;
}

// ── Pipeline ───────────────────────────────────────────────────────────────

/**
 * Run the ingestion pipeline for a single URL.
 * Implements: fetch → sanitize → summarize → format → validate.
 * save (§2.7) is the remaining step.
 */
async function ingestUrl(
	url: string,
	index: number,
	noteId: number,
	role: SummarizeRole,
	length: NoteLength,
	signal: AbortSignal,
): Promise<void> {
	console.log(chalk.bold(`\n[${index + 1}] Processing: ${chalk.cyan(url)}`));

	const spinner = ora({ color: "cyan" });

	spinner.start("Fetching...");
	const fetchResult = await fetchUrl(url);
	spinner.succeed(
		chalk.green("Fetched") +
			chalk.dim(
				` (${fetchResult.html.length} chars, HTTP ${fetchResult.statusCode})`,
			),
	);

	spinner.start("Sanitizing...");
	const sanitized = sanitizeHtml(fetchResult.html, url);
	spinner.succeed(
		chalk.green("Sanitized") +
			chalk.dim(
				` — title: "${sanitized.title}" (${sanitized.text.length} chars)`,
			),
	);

	spinner.start(
		`Summarizing via Claude API (role: ${role}, length: ${length})...`,
	);
	const summary = await summarize({
		text: sanitized.text,
		title: sanitized.title,
		sourceUrl: url,
		role,
		length,
		signal,
	});
	spinner.succeed(
		chalk.green("Summarized") +
			chalk.dim(
				` — "${summary.title}" [${summary.slug}]` +
					` (in: ${summary.tokenUsage.inputTokens}, out: ${summary.tokenUsage.outputTokens} tokens)`,
			),
	);

	spinner.start("Formatting...");
	const markdown = formatNote(summary, { noteId });
	spinner.succeed(
		chalk.green("Formatted") + chalk.dim(` (${markdown.length} chars)`),
	);

	spinner.start("Validating...");
	const validation = await validateNote(markdown);
	if (!validation.valid) {
		spinner.fail(chalk.red("Validation failed"));
		for (const err of validation.errors) {
			console.error(chalk.red(`     ✗ ${err}`));
			logError(`Validation error [${url}]: ${err}`);
		}
		throw new Error(
			`Note validation failed with ${validation.errors.length} error(s)`,
		);
	}
	spinner.succeed(chalk.green("Validated"));

	spinner.start("Saving draft...");
	const saveResult = await saveDraft(summary.slug, markdown);
	spinner.succeed(
		chalk.green("Saved") + chalk.dim(` → ${saveResult.filePath}`),
	);
	logRun(`Saved draft: ${saveResult.filePath} (source: ${url})`);
}

/**
 * Run the ingestion pipeline for a topic (no URL fetch — LLM generates from topic alone).
 */
async function ingestTopic(
	topic: string,
	description: string | null,
	index: number,
	noteId: number,
	role: SummarizeRole,
	length: NoteLength,
	signal: AbortSignal,
): Promise<void> {
	console.log(
		chalk.bold(
			`\n[${index + 1}] Processing topic: ${chalk.cyan(`"${topic}"`)}}`,
		),
	);

	const spinner = ora({ color: "cyan" });

	const input: SummarizeInput = {
		text: description
			? `Additional context provided by the user:\n${description}`
			: `Write a comprehensive technical note about: ${topic}`,
		title: topic,
		sourceUrl: "",
		role,
		length,
		signal,
	};

	spinner.start(
		`Summarizing via Claude API (role: ${role}, length: ${length})...`,
	);
	const summary = await summarize(input);
	spinner.succeed(
		chalk.green("Summarized") +
			chalk.dim(
				` — "${summary.title}" [${summary.slug}]` +
					` (in: ${summary.tokenUsage.inputTokens}, out: ${summary.tokenUsage.outputTokens} tokens)`,
			),
	);

	spinner.start("Formatting...");
	const markdown = formatNote(summary, { noteId });
	spinner.succeed(
		chalk.green("Formatted") + chalk.dim(` (${markdown.length} chars)`),
	);

	spinner.start("Validating...");
	const validation = await validateNote(markdown);
	if (!validation.valid) {
		spinner.fail(chalk.red("Validation failed"));
		for (const err of validation.errors) {
			console.error(chalk.red(`     ✗ ${err}`));
			logError(`Validation error [topic: ${topic}]: ${err}`);
		}
		throw new Error(
			`Note validation failed with ${validation.errors.length} error(s)`,
		);
	}
	spinner.succeed(chalk.green("Validated"));

	spinner.start("Saving draft...");
	const saveResult = await saveDraft(summary.slug, markdown);
	spinner.succeed(
		chalk.green("Saved") + chalk.dim(` → ${saveResult.filePath}`),
	);
	logRun(`Saved draft: ${saveResult.filePath} (topic: ${topic})`);
}

// ── Combined pipeline ─────────────────────────────────────────────────────

/**
 * Fetch and sanitize all URLs, concatenate their text, then run a single
 * summarize → format → validate → save pass to produce one combined draft.
 */
async function ingestCombined(
	urls: string[],
	noteId: number,
	role: SummarizeRole,
	length: NoteLength,
	signal: AbortSignal,
): Promise<void> {
	console.log(chalk.bold(`\nCombining ${urls.length} sources into one note:`));
	for (const u of urls) console.log(chalk.dim(`  • ${u}`));

	const spinner = ora({ color: "cyan" });
	const parts: string[] = [];
	let combinedTitle = "";

	for (let i = 0; i < urls.length; i++) {
		const url = urls[i] as string;
		spinner.start(`[${i + 1}/${urls.length}] Fetching ${chalk.cyan(url)}...`);
		const fetchResult = await fetchUrl(url);
		spinner.succeed(
			chalk.green(`[${i + 1}/${urls.length}] Fetched`) +
				chalk.dim(` ${url} (${fetchResult.html.length} chars)`),
		);

		spinner.start(`[${i + 1}/${urls.length}] Sanitizing...`);
		const sanitized = sanitizeHtml(fetchResult.html, url);
		spinner.succeed(
			chalk.green(`[${i + 1}/${urls.length}] Sanitized`) +
				chalk.dim(` — "${sanitized.title}" (${sanitized.text.length} chars)`),
		);

		parts.push(`--- Source ${i + 1}: ${url} ---\n${sanitized.text}`);
		if (i === 0) combinedTitle = sanitized.title;
	}

	const combinedText = parts.join("\n\n");

	spinner.start(
		`Summarizing ${urls.length} sources via Claude API (role: ${role}, length: ${length})...`,
	);
	const summary = await summarize({
		text: combinedText,
		title: combinedTitle,
		sourceUrl: "",
		sourceUrls: urls,
		role,
		length,
		signal,
	});
	spinner.succeed(
		chalk.green("Summarized") +
			chalk.dim(
				` — "${summary.title}" [${summary.slug}]` +
					` (in: ${summary.tokenUsage.inputTokens}, out: ${summary.tokenUsage.outputTokens} tokens)`,
			),
	);

	spinner.start("Formatting...");
	const markdown = formatNote(summary, { noteId });
	spinner.succeed(
		chalk.green("Formatted") + chalk.dim(` (${markdown.length} chars)`),
	);

	spinner.start("Validating...");
	const validation = await validateNote(markdown);
	if (!validation.valid) {
		spinner.fail(chalk.red("Validation failed"));
		for (const err of validation.errors) {
			console.error(chalk.red(`     ✗ ${err}`));
			logError(`Validation error [combined]: ${err}`);
		}
		throw new Error(
			`Note validation failed with ${validation.errors.length} error(s)`,
		);
	}
	spinner.succeed(chalk.green("Validated"));

	spinner.start("Saving draft...");
	const saveResult = await saveDraft(summary.slug, markdown);
	spinner.succeed(
		chalk.green("Saved") + chalk.dim(` → ${saveResult.filePath}`),
	);
	logRun(
		`Saved combined draft: ${saveResult.filePath} (sources: ${urls.join(", ")})`,
	);
}

// ── Entry point ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	loadEnv();

	if (!process.env.CLAUDE_API_KEY) {
		console.error(
			chalk.red("ERROR: CLAUDE_API_KEY is not set. Add it to your .env file."),
		);
		process.exit(1);
	}

	const { urls, topic, description, role, length, combine, debug } = parseArgs(
		process.argv,
	);
	setDebug(debug);
	console.log(
		chalk.cyan(`Role: ${role}`) +
			chalk.cyan(` | Length: ${length}`) +
			(combine ? chalk.cyan(" | combine") : "") +
			(debug ? chalk.dim(" [debug mode]") : ""),
	);

	const hasUrls = urls.length > 0;
	const hasTopic = topic !== null;

	if (!hasUrls && !hasTopic) {
		console.error(
			chalk.red(
				'ERROR: No input provided. Use --url="https://example.com" or --topic="some topic"',
			),
		);
		process.exit(1);
	}

	if (combine && !hasUrls) {
		console.error(
			chalk.red("ERROR: --combine requires at least one --url or --urls."),
		);
		process.exit(1);
	}

	if (combine && urls.length < 2) {
		console.error(
			chalk.red(
				"ERROR: --combine requires at least 2 URLs. " +
					'Pass them as repeated flags (--url=a --url=b) or comma-separated (--urls="a,b").',
			),
		);
		process.exit(1);
	}

	if (hasUrls && hasTopic) {
		console.warn(
			chalk.yellow(
				"WARNING: Both --url/--urls and --topic provided. Processing URLs first, then topic.",
			),
		);
	}

	if (hasUrls) {
		try {
			validateUrls(urls);
		} catch (err) {
			if (err instanceof ValidationError) {
				console.error(chalk.red(`ERROR: ${err.message}`));
				process.exit(1);
			}
			throw err;
		}
	}

	const totalItems = urls.length + (hasTopic ? 1 : 0);
	console.log(chalk.bold(`\nStarting ingestion for ${totalItems} item(s)...`));
	logRun(`Ingestion started — ${totalItems} item(s), role: ${role}`);

	const abortController = new AbortController();
	process.once("SIGINT", () => {
		console.log(
			chalk.yellow("\n\nCancelling… waiting for in-flight request to abort."),
		);
		abortController.abort();
	});

	const startingNoteId = nextNoteId();
	let itemIndex = 0;

	// ── Combined mode: all URLs → one draft ────────────────────────────────
	if (combine) {
		try {
			await ingestCombined(
				urls,
				startingNoteId,
				role,
				length,
				abortController.signal,
			);
		} catch (err) {
			if (abortController.signal.aborted) {
				console.log(chalk.yellow("Ingestion cancelled."));
				process.exit(130);
			}
			if (err instanceof FetchError) {
				const msg = `Fetch failed (combined): ${err.message}`;
				console.error(chalk.red(`  ✗ ${msg}`));
				logError(msg);
			} else if (err instanceof SummarizeError) {
				const msg = `Summarize failed (combined): ${err.message}`;
				console.error(chalk.red(`  ✗ ${msg}`));
				logError(msg);
				process.exit(1);
			} else if (err instanceof SaveError) {
				const msg = `Save failed (combined): ${(err as Error).message}`;
				console.error(chalk.red(`  ✗ ${msg}`));
				logError(msg);
			} else {
				const msg = `Unexpected error (combined): ${String(err)}`;
				console.error(chalk.red(`  ✗ ${msg}`));
				logError(msg);
			}
		}
		logRun("Ingestion completed");
		console.log(chalk.green.bold("\n✓ Done."));
		return;
	}

	// ── Per-URL mode ───────────────────────────────────────────────────────
	for (let i = 0; i < urls.length; i++) {
		try {
			await ingestUrl(
				urls[i] as string,
				itemIndex,
				startingNoteId + itemIndex,
				role,
				length,
				abortController.signal,
			);
		} catch (err) {
			if (abortController.signal.aborted) {
				console.log(chalk.yellow("Ingestion cancelled."));
				process.exit(130);
			}
			if (err instanceof FetchError) {
				const msg = `Fetch failed for ${urls[i]}: ${err.message}`;
				console.error(chalk.red(`  ✗ ${msg}`));
				logError(msg);
			} else if (err instanceof SummarizeError) {
				const msg = `Summarize failed for ${urls[i]}: ${err.message}`;
				console.error(chalk.red(`  ✗ ${msg}`));
				logError(msg);
				process.exit(1);
			} else if (err instanceof SaveError) {
				const msg = `Save failed for ${urls[i]}: ${(err as Error).message}`;
				console.error(chalk.red(`  ✗ ${msg}`));
				logError(msg);
			} else {
				const msg = `Unexpected error for ${urls[i]}: ${String(err)}`;
				console.error(chalk.red(`  ✗ ${msg}`));
				logError(msg);
			}
		}
		itemIndex++;
	}

	if (hasTopic) {
		try {
			await ingestTopic(
				topic as string,
				description,
				itemIndex,
				startingNoteId + itemIndex,
				role,
				length,
				abortController.signal,
			);
		} catch (err) {
			if (abortController.signal.aborted) {
				console.log(chalk.yellow("Ingestion cancelled."));
				process.exit(130);
			}
			if (err instanceof SummarizeError) {
				const msg = `Summarize failed for topic "${topic}": ${err.message}`;
				console.error(chalk.red(`  ✗ ${msg}`));
				logError(msg);
				process.exit(1);
			} else if (err instanceof SaveError) {
				const msg = `Save failed for topic "${topic}": ${(err as Error).message}`;
				console.error(chalk.red(`  ✗ ${msg}`));
				logError(msg);
			} else {
				const msg = `Unexpected error for topic "${topic}": ${String(err)}`;
				console.error(chalk.red(`  ✗ ${msg}`));
				logError(msg);
			}
		}
	}

	logRun("Ingestion completed");
	console.log(chalk.green.bold("\n✓ Done."));
}

main().catch((err: unknown) => {
	console.error(chalk.red.bold("Fatal error:"), err);
	process.exit(1);
});
