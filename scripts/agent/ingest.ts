/**
 * ingest.ts — Orchestrator for the agent ingestion pipeline.
 *
 * Usage:
 *   npm run ingest -- --url="https://example.com"
 *   npm run ingest -- --url="https://a.com" --url="https://b.com"
 *   npm run ingest -- --url="https://a.com,https://b.com"
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
	debug: boolean;
}

/**
 * Parse CLI arguments from process.argv.
 * Supports:
 *   --url="https://a.com"          single URL
 *   --url="https://a.com,https://b.com"  comma-separated
 *   --url="https://a.com" --url="https://b.com"  repeated flag
 *   --topic="some topic"           generate from topic (no URL fetch)
 *   --role=security                analysis lens (default: llm)
 */
function parseArgs(argv: string[]): ParsedArgs {
	const urls: string[] = [];
	let topic: string | null = null;
	let description: string | null = null;
	let role: SummarizeRole = "llm";
	let debug = false;

	for (const arg of argv.slice(2)) {
		if (arg === "--debug") {
			debug = true;
			continue;
		}

		const urlMatch = arg.match(/^--url=(.+)$/);
		if (urlMatch) {
			const raw = urlMatch[1] ?? "";
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
		}
	}

	return { urls, topic, description, role, debug };
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
			'No URLs provided. Use --url="https://example.com"',
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

	spinner.start(`Summarizing via Claude API (role: ${role})...`);
	const summary = await summarize({
		text: sanitized.text,
		title: sanitized.title,
		sourceUrl: url,
		role,
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
	};

	spinner.start(`Summarizing via Claude API (role: ${role})...`);
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

// ── Entry point ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	loadEnv();

	if (!process.env["CLAUDE_API_KEY"]) {
		console.error(
			chalk.red("ERROR: CLAUDE_API_KEY is not set. Add it to your .env file."),
		);
		process.exit(1);
	}

	const { urls, topic, description, role, debug } = parseArgs(process.argv);
	setDebug(debug);
	console.log(
		chalk.cyan(`Role: ${role}`) + (debug ? chalk.dim(" [debug mode]") : ""),
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

	if (hasUrls && hasTopic) {
		console.warn(
			chalk.yellow(
				"WARNING: Both --url and --topic provided. Processing URLs first, then topic.",
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

	const startingNoteId = nextNoteId();
	let itemIndex = 0;

	for (let i = 0; i < urls.length; i++) {
		try {
			await ingestUrl(
				urls[i] as string,
				itemIndex,
				startingNoteId + itemIndex,
				role,
			);
		} catch (err) {
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
			);
		} catch (err) {
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
