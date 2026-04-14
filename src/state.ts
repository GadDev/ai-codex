/* ═══════════════════════════════════════════
   state.ts — Immutable app state
   All shared mutable state lives here and nowhere else.
   ═══════════════════════════════════════════ */

import type { AppState, NoteMetadata } from "./types.js";

const INITIAL_STATE: AppState = Object.freeze({
	activeNoteId: null,
	activeTagFilter: null,
	noteHistory: [] as readonly string[],
	historyIndex: -1,
	isSearching: false,
	isNavigatingHistory: false,
	fuse: null,
	sectionObserver: null,
	noteContentCache: new Map<string, string>(),
});

let _state: AppState = INITIAL_STATE;

// ── Core accessors ──

/** Return a shallow-frozen snapshot of the current state (never exposes internals). */
export const getState = (): Readonly<AppState> => Object.freeze({ ..._state });

/**
 * Merge `updates` into state and freeze the result.
 * Callers never mutate the returned object.
 */
export const setState = (updates: Partial<AppState>): void => {
	_state = Object.freeze({ ..._state, ...updates }) as AppState;
};

// ── Derived selectors (pure) ──

/**
 * Return notes filtered by the active tag, or all notes when no filter is set.
 * @param notes — the full NOTES array from data.ts
 */
export const getFilteredNotes = (
	notes: readonly NoteMetadata[],
): readonly NoteMetadata[] => {
	const { activeTagFilter } = _state;
	if (!activeTagFilter) return notes;
	return notes.filter((n) => n.tags.includes(activeTagFilter));
};
