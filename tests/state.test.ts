import { beforeEach, describe, expect, it } from "vitest";
import { getFilteredNotes, getState, setState } from "../src/state.ts";
import type { NoteMetadata } from "../src/types.ts";

// Reset state to initial values before every test so tests are independent.
function resetState() {
	setState({
		activeNoteId: null,
		activeTagFilter: null,
		noteHistory: [],
		historyIndex: -1,
		isSearching: false,
		isNavigatingHistory: false,
		fuse: null,
		sectionObserver: null,
		noteContentCache: new Map(),
	});
}

// Sample notes used by selector tests
const SAMPLE_NOTES: readonly NoteMetadata[] = [
	{
		id: "note-01",
		slug: "01-alpha",
		emoji: "🅰️",
		title: "Alpha",
		tags: ["ai", "basics"],
	},
	{ id: "note-02", slug: "02-beta", emoji: "🅱️", title: "Beta", tags: ["ml"] },
	{
		id: "note-03",
		slug: "03-gamma",
		emoji: "🔴",
		title: "Gamma",
		tags: ["ai", "advanced"],
	},
];

beforeEach(resetState);

// ── getState ──────────────────────────────────────────────────────────────

describe("getState", () => {
	it("returns initial defaults", () => {
		const s = getState();
		expect(s.activeNoteId).toBeNull();
		expect(s.activeTagFilter).toBeNull();
		expect(s.noteHistory).toEqual([]);
		expect(s.historyIndex).toBe(-1);
		expect(s.isSearching).toBe(false);
		expect(s.isNavigatingHistory).toBe(false);
		expect(s.fuse).toBeNull();
		expect(s.sectionObserver).toBeNull();
		expect(s.noteContentCache).toBeInstanceOf(Map);
		expect(s.noteContentCache.size).toBe(0);
	});

	it("returns a frozen snapshot (mutations have no effect on internal state)", () => {
		const snap = getState() as Record<string, unknown>;
		expect(() => {
			snap["activeNoteId"] = "hacked";
		}).toThrow();
		// Internal state is unchanged
		expect(getState().activeNoteId).toBeNull();
	});

	it("each call returns a fresh snapshot, not the same reference", () => {
		const a = getState();
		const b = getState();
		expect(a).not.toBe(b);
	});
});

// ── setState ──────────────────────────────────────────────────────────────

describe("setState", () => {
	it("merges a single field without clobbering others", () => {
		setState({ activeNoteId: "note-01" });
		const s = getState();
		expect(s.activeNoteId).toBe("note-01");
		expect(s.activeTagFilter).toBeNull(); // unchanged
		expect(s.historyIndex).toBe(-1); // unchanged
	});

	it("merges multiple fields at once", () => {
		setState({ isSearching: true, activeTagFilter: "ai" });
		const s = getState();
		expect(s.isSearching).toBe(true);
		expect(s.activeTagFilter).toBe("ai");
	});

	it("successive calls accumulate updates", () => {
		setState({ activeNoteId: "note-01" });
		setState({ activeNoteId: "note-02" });
		expect(getState().activeNoteId).toBe("note-02");
	});

	it("can clear a field back to null", () => {
		setState({ activeNoteId: "note-01" });
		setState({ activeNoteId: null });
		expect(getState().activeNoteId).toBeNull();
	});

	it("accepts empty updates without throwing", () => {
		expect(() => setState({})).not.toThrow();
	});
});

// ── getFilteredNotes ──────────────────────────────────────────────────────

describe("getFilteredNotes", () => {
	it("returns all notes when no tag filter is active", () => {
		const result = getFilteredNotes(SAMPLE_NOTES);
		expect(result).toHaveLength(3);
		expect(result).toEqual(SAMPLE_NOTES);
	});

	it("returns only notes matching the active tag filter", () => {
		setState({ activeTagFilter: "ai" });
		const result = getFilteredNotes(SAMPLE_NOTES);
		expect(result).toHaveLength(2);
		expect(result.map((n) => n.id)).toEqual(["note-01", "note-03"]);
	});

	it("returns an empty array when no notes match the tag", () => {
		setState({ activeTagFilter: "nonexistent-tag" });
		expect(getFilteredNotes(SAMPLE_NOTES)).toHaveLength(0);
	});

	it("returns a single note when only one matches", () => {
		setState({ activeTagFilter: "ml" });
		const result = getFilteredNotes(SAMPLE_NOTES);
		expect(result).toHaveLength(1);
		expect(result[0]?.id).toBe("note-02");
	});

	it("returns empty when the notes array is empty", () => {
		setState({ activeTagFilter: "ai" });
		expect(getFilteredNotes([])).toEqual([]);
	});

	it("clears results after filter is set back to null", () => {
		setState({ activeTagFilter: "ml" });
		expect(getFilteredNotes(SAMPLE_NOTES)).toHaveLength(1);

		setState({ activeTagFilter: null });
		expect(getFilteredNotes(SAMPLE_NOTES)).toHaveLength(3);
	});
});

// ── History state ─────────────────────────────────────────────────────────
// Tests the noteHistory / historyIndex state fields used by navigation.

describe("noteHistory state", () => {
	it("starts with an empty history at index -1", () => {
		const { noteHistory, historyIndex } = getState();
		expect(noteHistory).toEqual([]);
		expect(historyIndex).toBe(-1);
	});

	it("can have a note pushed onto history", () => {
		setState({ noteHistory: ["note-01"], historyIndex: 0 });
		const { noteHistory, historyIndex } = getState();
		expect(noteHistory).toEqual(["note-01"]);
		expect(historyIndex).toBe(0);
	});

	it("supports forward navigation state update", () => {
		setState({ noteHistory: ["note-01", "note-02"], historyIndex: 0 });
		setState({ historyIndex: 1, isNavigatingHistory: true });
		const s = getState();
		expect(s.historyIndex).toBe(1);
		expect(s.isNavigatingHistory).toBe(true);
	});

	it("supports back navigation state update", () => {
		setState({ noteHistory: ["note-01", "note-02"], historyIndex: 1 });
		setState({ historyIndex: 0, isNavigatingHistory: true });
		expect(getState().historyIndex).toBe(0);
	});

	it("trimming history on branch (simulate showNote non-navigating)", () => {
		// Simulate: history=[A,B,C], index=1, user clicks new note D
		setState({
			noteHistory: ["note-01", "note-02", "note-03"],
			historyIndex: 1,
		});
		const { noteHistory, historyIndex } = getState();
		const trimmed = noteHistory.slice(0, historyIndex + 1); // ["note-01","note-02"]
		setState({
			noteHistory: [...trimmed, "note-04"],
			historyIndex: trimmed.length,
		});
		const s = getState();
		expect(s.noteHistory).toEqual(["note-01", "note-02", "note-04"]);
		expect(s.historyIndex).toBe(2);
	});
});

// ── noteContentCache ──────────────────────────────────────────────────────

describe("noteContentCache", () => {
	it("starts as an empty Map", () => {
		expect(getState().noteContentCache.size).toBe(0);
	});

	it("can store and retrieve slug → markdown", () => {
		const cache = new Map<string, string>([["01-alpha", "# Alpha\nContent"]]);
		setState({ noteContentCache: cache });
		expect(getState().noteContentCache.get("01-alpha")).toBe(
			"# Alpha\nContent",
		);
	});
});
