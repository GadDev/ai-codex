#!/usr/bin/env tsx

/**
 * build-manifest.ts
 *
 * Reads all .md files from notes/, parses front matter, strips markdown to
 * plain text, and writes public/notes-manifest.json for runtime consumption.
 * Run via: tsx scripts/build-manifest.ts
 */

import { createHash } from "node:crypto";
import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const NOTES_DIR = join(ROOT, "notes");
const PUBLIC_DIR = join(ROOT, "public");
const AUDIO_DIR = join(PUBLIC_DIR, "audio");
const AUDIO_MANIFEST_PATH = join(AUDIO_DIR, "manifest.json");
const OUT_FILE = join(PUBLIC_DIR, "notes-manifest.json");
const SW_FILE = join(PUBLIC_DIR, "sw.js");

// ── Types (local — not imported from src/ to keep this script self-contained) ──

interface NoteSearchEntry {
	id: string;
	slug: string;
	emoji: string;
	title: string;
	tags: string[];
	content: string;
	audioHash?: string;
}

interface NotesManifest {
	version: string;
	notes: NoteSearchEntry[];
}

interface AudioManifestEntry {
	readonly audioHash: string;
}

interface AudioManifest {
	readonly notes: Record<string, AudioManifestEntry>;
}

/** Read public/audio/manifest.json if present; return empty record otherwise. */
function readAudioManifest(): Record<string, AudioManifestEntry> {
	if (!existsSync(AUDIO_MANIFEST_PATH)) return {};
	return (
		JSON.parse(readFileSync(AUDIO_MANIFEST_PATH, "utf-8")) as AudioManifest
	).notes;
}

// ── Fallback emoji map ─────────────────────────────────────────────────────
// Mirrors src/data.ts. Front-matter `emoji:` takes precedence when present.
// Remove individual entries here once each .md file has `emoji:` in its front matter.
const FALLBACK_EMOJI: Record<string, string> = {
	"01": "🧠",
	"02": "⚙️",
	"03": "✍️",
	"04": "🚀",
	"05": "⚡",
	"06": "🔧",
	"07": "🪝",
	"08": "📖",
	"09": "🎭",
	"10": "📸",
	"11": "🎓",
	"12": "🔬",
	"13": "🤖",
	"14": "📋",
	"15": "🗄️",
	"16": "🕹️",
	"17": "🗺️",
	"18": "🛡️",
	"19": "🧲",
	"20": "🎨",
	"21": "🏗️",
	"22": "⚖️",
	"23": "🧬",
	"24": "🔢",
	"25": "📊",
	"26": "🏭",
	"27": "🔴",
	"28": "⚖️",
	"29": "🛠️",
	"30": "🔒",
	"31": "🔭",
	"32": "🚀",
	"33": "🔧",
	"34": "👁️",
	"35": "🧠",
	"36": "🗂️",
	"37": "💰",
};

// ── Front-matter parsing ───────────────────────────────────────────────────

/** Parse a YAML front-matter block; returns key→raw-value pairs. */
function parseFrontMatter(raw: string): Record<string, string> {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return {};

	const result: Record<string, string> = {};
	for (const line of match[1].split("\n")) {
		const idx = line.indexOf(":");
		if (idx > 0) {
			result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
		}
	}
	return result;
}

/**
 * Parse an inline YAML sequence: "[ai-fluency, 4Ds, delegation]" → string[]
 * Falls back to space-splitting for unrecognised formats.
 */
function parseTagsField(raw: string): string[] {
	const trimmed = raw.trim();
	if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
		return trimmed
			.slice(1, -1)
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);
	}
	return trimmed.split(/\s+/).filter(Boolean);
}

// ── Markdown → plain text ──────────────────────────────────────────────────

/**
 * Best-effort conversion of markdown to plain text for Fuse.js content field.
 * Intentionally lossy — search quality matters more than perfect reproduction.
 */
function stripMarkdown(raw: string): string {
	return (
		raw
			// Remove YAML front matter
			.replace(/^---[\s\S]*?---\r?\n/, "")
			// Remove fenced code blocks entirely (syntax noise hurts search ranking)
			.replace(/```[\s\S]*?```/g, "")
			// Remove inline code but keep the text
			.replace(/`([^`]+)`/g, "$1")
			// Remove images
			.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
			// Remove links but keep link text
			.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
			// Remove heading markers
			.replace(/^#{1,6}\s+/gm, "")
			// Remove bold / italic markers
			.replace(/[*_]{1,3}([^*_\n]+)[*_]{1,3}/g, "$1")
			// Remove blockquote markers
			.replace(/^>\s*/gm, "")
			// Remove horizontal rules
			.replace(/^[-*]{3,}\s*$/gm, "")
			// Remove table separators
			.replace(/\|/g, " ")
			// Collapse whitespace
			.replace(/\s+/g, " ")
			.trim()
	);
}

// ── Filename helpers ───────────────────────────────────────────────────────

/** "01-ai-fluency-framework.md" → "01-ai-fluency-framework" */
function slugFromFilename(filename: string): string {
	return basename(filename, ".md");
}

/** "01-ai-fluency-framework" → "note-01" */
function idFromSlug(slug: string): string {
	const num = slug.match(/^(\d+)/)?.[1] ?? "??";
	return `note-${num}`;
}

/** "01-ai-fluency-framework" → "01" */
function numFromSlug(slug: string): string {
	return slug.match(/^(\d+)/)?.[1] ?? "";
}

// ── Main ───────────────────────────────────────────────────────────────────

function main(): void {
	const filenames: string[] = readdirSync(NOTES_DIR, { withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
		.map((entry) => entry.name)
		.sort(); // lexicographic order matches numeric order due to zero-padded names

	const notes: NoteSearchEntry[] = filenames.map((filename: string) => {
		const raw = readFileSync(join(NOTES_DIR, filename), "utf-8");
		const fm = parseFrontMatter(raw);
		const slug = slugFromFilename(filename);
		const id = idFromSlug(slug);
		const num = numFromSlug(slug);

		const title = fm.title ?? slug;
		const tags = fm.tags ? parseTagsField(fm.tags) : [];
		// Front-matter emoji wins; fall back to the static map for notes that
		// pre-date the emoji field being added to their front matter.
		const emoji = fm.emoji || FALLBACK_EMOJI[num] || "📝";
		const content = stripMarkdown(raw);

		return { id, slug, emoji, title, tags, content };
	});

	// ── Audio hash reference ────────────────────────────────────────────────────────
	// Include audioHash for staleness detection, but don't rely on it for existence.
	// Audio availability is determined by checking public/audio/manifest.json at runtime.
	const audioEntries = readAudioManifest();
	for (const note of notes) {
		const entry = audioEntries[note.slug];
		if (entry?.audioHash) {
			note.audioHash = entry.audioHash;
		}
	}

	// Content hash for service worker cache busting
	const hash = createHash("sha256")
		.update(JSON.stringify(notes))
		.digest("hex")
		.slice(0, 12);

	const manifest: NotesManifest = {
		version: `sha256-${hash}`,
		notes,
	};

	mkdirSync(PUBLIC_DIR, { recursive: true });
	writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2), "utf-8");

	console.log(`✓ Manifest written → ${OUT_FILE}`);
	console.log(`  ${notes.length} notes | version ${manifest.version}`);

	// Copy notes/ directory to public/notes/ so they're deployed with the app
	const PUBLIC_NOTES_DIR = join(PUBLIC_DIR, "notes");
	cpSync(NOTES_DIR, PUBLIC_NOTES_DIR, { recursive: true, force: true });
	console.log(`✓ Notes copied → ${PUBLIC_NOTES_DIR}`);

	// Patch CACHE_VERSION in public/sw.js with the manifest content hash.
	// The short hash (12 hex chars) changes whenever any note changes,
	// causing the SW to evict old caches and re-install.
	const sw = readFileSync(SW_FILE, "utf-8");
	const patchedSw = sw.replace(
		/^const CACHE_VERSION = ".*?";/m,
		`const CACHE_VERSION = "${manifest.version}";`,
	);
	if (patchedSw !== sw) {
		writeFileSync(SW_FILE, patchedSw, "utf-8");
		console.log(`✓ CACHE_VERSION patched → ${manifest.version}`);
	} else {
		console.log(`  CACHE_VERSION already up-to-date`);
	}
}

main();
