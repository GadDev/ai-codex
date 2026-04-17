#!/usr/bin/env tsx

/**
 * generate-audio.ts
 *
 * Orchestrator: reads public/notes-manifest.json, generates .mp3 + .words.json
 * for each note via OpenAI TTS + Whisper, and writes public/audio/manifest.json.
 *
 * Run via:  OPENAI_API_KEY=sk-... npm run generate:audio
 * Options:
 *   --notes=01,02    Only process notes whose slugs start with these prefixes
 *   --force          Overwrite existing .mp3 / .words.json files
 *   --voice=ash      TTS voice (default: ash)
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import ora from "ora";
import { extractSpeechText } from "./audio/extract-text.ts";
import { transcribeWords } from "./audio/transcribe-whisper.ts";
import { generateMp3 } from "./audio/tts-openai.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Auto-load .env from the project root if it exists
const dotEnvPath = resolve(ROOT, ".env");
if (existsSync(dotEnvPath)) {
	process.loadEnvFile(dotEnvPath);
}
const NOTES_DIR = join(ROOT, "notes");
const PUBLIC_DIR = join(ROOT, "public");
const AUDIO_DIR = join(PUBLIC_DIR, "audio");
const NOTES_MANIFEST_PATH = join(PUBLIC_DIR, "notes-manifest.json");
const AUDIO_MANIFEST_PATH = join(AUDIO_DIR, "manifest.json");

const MAX_NOTES_PER_RUN = 39;

/** $0.030 per 1 000 characters (tts-1-hd) */
const TTS_COST_PER_1K_CHARS = 0.03;
/** $0.006 per minute of audio */
const WHISPER_COST_PER_MINUTE = 0.006;
/** Approximate characters per minute at the slow narration pace */
const CHARS_PER_MINUTE = 3000;

// ── Types ─────────────────────────────────────────────────────────────────────

interface CliFlags {
	readonly noteFilter: readonly string[] | null;
	readonly force: boolean;
	readonly voice: string;
}

interface NoteEntry {
	readonly id: string;
	readonly slug: string;
	readonly title: string;
}

interface NotesManifest {
	readonly notes: NoteEntry[];
}

interface AudioManifestEntry {
	readonly audioHash: string;
}

interface AudioManifest {
	notes: Record<string, AudioManifestEntry>;
}

// ── CLI parsing ───────────────────────────────────────────────────────────────

function parseFlags(argv: readonly string[]): CliFlags {
	const args = argv.slice(2);
	let noteFilter: string[] | null = null;
	let force = false;
	let voice = "ash";

	for (const arg of args) {
		if (arg === "--force") {
			force = true;
		} else if (arg.startsWith("--notes=")) {
			noteFilter = arg
				.slice("--notes=".length)
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
		} else if (arg.startsWith("--voice=")) {
			voice = arg.slice("--voice=".length).trim();
		}
	}

	return { noteFilter, force, voice };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeSpeechHash(text: string): string {
	return createHash("sha256").update(text).digest("hex");
}

function readAudioManifest(): AudioManifest {
	if (!existsSync(AUDIO_MANIFEST_PATH)) {
		return { notes: {} };
	}
	return JSON.parse(
		readFileSync(AUDIO_MANIFEST_PATH, "utf-8"),
	) as AudioManifest;
}

function writeAudioManifest(manifest: AudioManifest): void {
	mkdirSync(AUDIO_DIR, { recursive: true });
	writeFileSync(
		AUDIO_MANIFEST_PATH,
		JSON.stringify(manifest, null, "\t"),
		"utf-8",
	);
}

function estimateCost(charCount: number): { tts: number; whisper: number } {
	const tts = (charCount / 1000) * TTS_COST_PER_1K_CHARS;
	const whisper = (charCount / CHARS_PER_MINUTE) * WHISPER_COST_PER_MINUTE;
	return { tts, whisper };
}

function formatUsd(amount: number): string {
	return `$${amount.toFixed(2)}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	const flags = parseFlags(process.argv);

	if (!existsSync(NOTES_MANIFEST_PATH)) {
		console.error(
			"Error: public/notes-manifest.json not found.\n" +
				"Run `npm run build:manifest` first, or use `npm run generate:audio` which runs it automatically.",
		);
		process.exit(1);
	}

	const notesManifest = JSON.parse(
		readFileSync(NOTES_MANIFEST_PATH, "utf-8"),
	) as NotesManifest;

	let notes = notesManifest.notes;

	if (flags.noteFilter !== null) {
		const filter = flags.noteFilter;
		notes = notes.filter((n) =>
			filter.some((prefix) => n.slug.startsWith(prefix)),
		);
		if (notes.length === 0) {
			console.error(
				`No notes matched the filter: ${flags.noteFilter.join(", ")}`,
			);
			process.exit(1);
		}
	}

	if (notes.length > MAX_NOTES_PER_RUN) {
		notes = notes.slice(0, MAX_NOTES_PER_RUN);
		console.warn(
			chalk.yellow(`Warning: capped at ${MAX_NOTES_PER_RUN} notes per run.\n`),
		);
	}

	mkdirSync(AUDIO_DIR, { recursive: true });

	const audioManifest = readAudioManifest();
	const runTotal = notes.length;
	let generated = 0;
	let skipped = 0;
	let failed = 0;
	let totalTtsCost = 0;
	let totalWhisperCost = 0;

	for (let i = 0; i < notes.length; i++) {
		const note = notes[i];
		const label = `[${i + 1}/${runTotal}] ${note.slug}`;

		const mdPath = join(NOTES_DIR, `${note.slug}.md`);
		if (!existsSync(mdPath)) {
			console.error(
				chalk.red(`${label} → ERROR: markdown file not found at ${mdPath}`),
			);
			failed++;
			continue;
		}

		const markdown = readFileSync(mdPath, "utf-8");
		const speechText = extractSpeechText(markdown);
		const hash = computeSpeechHash(speechText);

		const mp3Path = join(AUDIO_DIR, `${note.slug}.mp3`);
		const wordsPath = join(AUDIO_DIR, `${note.slug}.words.json`);

		const existingEntry = audioManifest.notes[note.slug];
		const isUpToDate =
			!flags.force &&
			existsSync(mp3Path) &&
			existsSync(wordsPath) &&
			existingEntry?.audioHash === hash;

		if (isUpToDate) {
			console.log(`${label} → ${chalk.dim("SKIP (unchanged)")}`);
			skipped++;
			continue;
		}

		const spinner = ora({
			text: chalk.bold(`${label} → generating...`),
			color: "cyan",
		}).start();

		try {
			// The orchestrator controls skip logic — always allow overwrite here
			await generateMp3(speechText, mp3Path, {
				voice: flags.voice,
				force: true,
			});
			spinner.text = chalk.bold(`${label} → transcribing...`);

			const words = await transcribeWords(mp3Path);
			writeFileSync(wordsPath, JSON.stringify(words, null, "\t"), "utf-8");

			audioManifest.notes[note.slug] = { audioHash: hash };
			writeAudioManifest(audioManifest);

			spinner.succeed(
				`${label} → ${chalk.green("done")}` +
					chalk.dim(` (${words.length} words)`),
			);

			const cost = estimateCost(speechText.length);
			totalTtsCost += cost.tts;
			totalWhisperCost += cost.whisper;
			generated++;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			spinner.fail(`${label} → ${chalk.red("FAILED")}: ${message}`);
			failed++;
		}
	}

	console.log(
		"\n" +
			chalk.dim(
				"─────────────────────────────────────────────────────────────",
			),
	);
	console.log(
		`Generated: ${chalk.green(generated)}  Skipped: ${chalk.dim(skipped)}  Failed: ${failed > 0 ? chalk.red(failed) : chalk.dim(failed)}`,
	);
	if (generated > 0) {
		const totalCost = totalTtsCost + totalWhisperCost;
		console.log(
			chalk.dim(
				`Estimated cost: ~${formatUsd(totalTtsCost)} TTS + ~${formatUsd(totalWhisperCost)} Whisper = ~${formatUsd(totalCost)}`,
			),
		);
		console.log(
			chalk.yellow(
				"\nRun `npm run build:manifest` to update hasAudio / audioHash fields in notes-manifest.json.",
			),
		);
	}
	console.log(
		chalk.dim("─────────────────────────────────────────────────────────────") +
			"\n",
	);

	if (failed > 0) {
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Fatal:", err instanceof Error ? err.message : err);
	process.exit(1);
});
