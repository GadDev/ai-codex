/* ═══════════════════════════════════════════
   search.ts — Fuse.js index creation and search handling
   ═══════════════════════════════════════════ */

import Fuse, { type FuseResult, type IFuseOptions } from "fuse.js";
import { NOTES, SEARCH_ENTRIES } from "./data.js";
import { getFilteredNotes, getState, setState } from "./state.js";
import type { NoteMetadata, NoteSearchEntry } from "./types.js";

export const FUSE_OPTIONS: IFuseOptions<NoteSearchEntry> = {
	keys: [
		{ name: "title", weight: 0.4 },
		{ name: "tags", weight: 0.3 },
		{ name: "content", weight: 0.3 },
	],
	threshold: 0.35,
	ignoreLocation: true,
	includeScore: true,
};

// ── Index builders ──

/** Build search index synchronously (fallback when Worker is unavailable). */
export function buildIndexSync(): void {
	setState({ fuse: new Fuse([...SEARCH_ENTRIES], FUSE_OPTIONS) });
}

/** Kick off index building in a Web Worker; fall back to sync if unavailable. */
export function initSearch(): void {
	if (typeof Worker === "undefined") {
		buildIndexSync();
		return;
	}

	try {
		const worker = new Worker("./search.worker.js");

		worker.postMessage({ notes: [...SEARCH_ENTRIES] });

		worker.addEventListener(
			"message",
			({
				data,
			}: MessageEvent<{
				index: Record<string, unknown>;
				notes: NoteSearchEntry[];
			}>) => {
				const prebuiltIndex = Fuse.parseIndex<NoteSearchEntry>(
					data.index as Parameters<typeof Fuse.parseIndex>[0],
				);
				setState({ fuse: new Fuse(data.notes, FUSE_OPTIONS, prebuiltIndex) });
				worker.terminate();
			},
		);

		worker.addEventListener("error", () => {
			buildIndexSync();
			worker.terminate();
		});
	} catch (_) {
		buildIndexSync();
	}
}

// ── Search handler (side effect: updates DOM via injected render callbacks) ──

interface SearchRenderFns {
	renderNav: (
		notes: readonly NoteMetadata[],
		onNoteClick: (id: string) => void,
	) => void;
	renderSearchResults: (
		results: Array<FuseResult<NoteSearchEntry>>,
		onNoteClick: (id: string) => void,
	) => void;
	onNoteClick: (id: string) => void;
}

/**
 * Handle a search query and delegate rendering to the provided callbacks.
 */
export function handleSearch(
	query: string,
	{ renderNav, renderSearchResults, onNoteClick }: SearchRenderFns,
): void {
	if (!query.trim()) {
		setState({ isSearching: false });
		renderNav(getFilteredNotes(NOTES), onNoteClick);
		return;
	}

	setState({ isSearching: true });

	const { fuse } = getState();
	if (!fuse) {
		// Index still building in the worker — show a holding state
		const navList = document.getElementById("nav-list");
		if (navList) {
			navList.innerHTML =
				'<div class="search-empty">Building search index…</div>';
		}
		return;
	}

	renderSearchResults(fuse.search(query), onNoteClick);
}
