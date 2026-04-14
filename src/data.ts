/* ═══════════════════════════════════════════
   data.ts — Note registry, populated from the build-time manifest
   ═══════════════════════════════════════════ */

import type { NoteMetadata, NoteSearchEntry, NotesManifest } from "./types.js";

// ── Module-level stores (set once by initData, then read-only) ──

/** Metadata array used by the sidebar and navigation. */
export let NOTES: readonly NoteMetadata[] = [];

/**
 * Full note entries including stripped plain-text content.
 * Used exclusively by the Fuse.js search index.
 */
export let SEARCH_ENTRIES: readonly NoteSearchEntry[] = [];

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
