/* ═══════════════════════════════════════════
   data.ts — Note registry, populated from the build-time manifest
   ═══════════════════════════════════════════ */

import type { NoteMetadata, NoteSearchEntry, NotesManifest } from "./types.js";

// ── Audio manifest type ──

interface AudioManifestEntry {
	readonly audioHash: string;
}

interface AudioManifest {
	readonly notes: Record<string, AudioManifestEntry>;
}

// ── Module-level stores (set once by initData, then read-only) ──

/** Metadata array used by the sidebar and navigation. */
export let NOTES: readonly NoteMetadata[] = [];

/**
 * Full note entries including stripped plain-text content.
 * Used exclusively by the Fuse.js search index.
 */
export let SEARCH_ENTRIES: readonly NoteSearchEntry[] = [];

/**
 * Audio manifest: maps note slug → audioHash.
 * Populated by loadAudioManifest(). Used by tts-ui.ts and navigation.ts
 * to determine which playback engine to use.
 */
let audioManifest: Record<string, AudioManifestEntry> = {};

// ── Audio manifest loader ──

/**
 * Fetch and cache the audio manifest.
 * Non-fatal: if it doesn't exist or fails, continues with empty manifest.
 */
export async function loadAudioManifest(): Promise<void> {
	try {
		const res = await fetch("/audio/manifest.json");
		if (res.ok) {
			const data = (await res.json()) as AudioManifest;
			audioManifest = data.notes ?? {};
		}
	} catch (err) {
		// Silently fail — audio is optional
	}
}

/**
 * Check if a note has audio available.
 * Returns true only if the slug exists in the audio manifest.
 */
export function hasAudio(slug: string): boolean {
	return slug in audioManifest;
}

// ── Initialiser ──

/**
 * Fetch `/notes-manifest.json` and populate NOTES + SEARCH_ENTRIES.
 * Must be awaited before any call that reads NOTES or SEARCH_ENTRIES.
 */
export async function initData(): Promise<void> {
	const res = await fetch("/notes-manifest.json");
	if (!res.ok) {
		throw new Error(`Failed to load notes manifest (HTTP ${res.status})`);
	}

	const manifest = (await res.json()) as NotesManifest;

	SEARCH_ENTRIES = Object.freeze([...manifest.notes]);

	NOTES = Object.freeze(
		manifest.notes.map(({ id, slug, emoji, title, tags }) =>
			Object.freeze({ id, slug, emoji, title, tags }),
		),
	);
}
