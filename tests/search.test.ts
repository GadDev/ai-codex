import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NoteMetadata, NoteSearchEntry } from "../src/types.ts";

// ── Mock data.ts before importing search.ts ───────────────────────────────
// search.ts reads NOTES and SEARCH_ENTRIES at call-time from data.ts.

const MOCK_NOTES: NoteMetadata[] = [
	{
		id: "note-01",
		slug: "01-ai-fluency",
		emoji: "🧠",
		title: "AI Fluency",
		tags: ["ai", "basics"],
	},
	{
		id: "note-02",
		slug: "02-prompt-eng",
		emoji: "✍️",
		title: "Prompt Engineering",
		tags: ["ai", "prompts"],
	},
	{
		id: "note-03",
		slug: "03-ml-basics",
		emoji: "⚙️",
		title: "ML Basics",
		tags: ["ml", "basics"],
	},
];

const MOCK_SEARCH_ENTRIES: NoteSearchEntry[] = MOCK_NOTES.map((n) => ({
	...n,
	content: `${n.title} content for full-text search`,
}));

vi.mock("../src/data.ts", () => ({
	NOTES: [
		{
			id: "note-01",
			slug: "01-ai-fluency",
			emoji: "🧠",
			title: "AI Fluency",
			tags: ["ai", "basics"],
		},
		{
			id: "note-02",
			slug: "02-prompt-eng",
			emoji: "✍️",
			title: "Prompt Engineering",
			tags: ["ai", "prompts"],
		},
		{
			id: "note-03",
			slug: "03-ml-basics",
			emoji: "⚙️",
			title: "ML Basics",
			tags: ["ml", "basics"],
		},
	],
	SEARCH_ENTRIES: [
		{
			id: "note-01",
			slug: "01-ai-fluency",
			emoji: "🧠",
			title: "AI Fluency",
			tags: ["ai", "basics"],
			content: "AI Fluency content for full-text search",
		},
		{
			id: "note-02",
			slug: "02-prompt-eng",
			emoji: "✍️",
			title: "Prompt Engineering",
			tags: ["ai", "prompts"],
			content: "Prompt Engineering content for full-text search",
		},
		{
			id: "note-03",
			slug: "03-ml-basics",
			emoji: "⚙️",
			title: "ML Basics",
			tags: ["ml", "basics"],
			content: "ML Basics content for full-text search",
		},
	],
}));

import Fuse from "fuse.js";

// Import AFTER the mock is set up
import {
	buildIndexSync,
	FUSE_OPTIONS,
	handleSearch,
	initSearch,
} from "../src/search.ts";
import { getState, setState } from "../src/state.ts";

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

beforeEach(() => {
	resetState();
	// Provide a minimal #nav-list element for handleSearch to write to
	document.body.innerHTML = '<div id="nav-list"></div>';
});

// ── FUSE_OPTIONS ──────────────────────────────────────────────────────────

describe("FUSE_OPTIONS", () => {
	it("has the expected keys configured", () => {
		const keyNames = FUSE_OPTIONS.keys!.map((k) =>
			typeof k === "string" ? k : (k as { name: string }).name,
		);
		expect(keyNames).toContain("title");
		expect(keyNames).toContain("tags");
		expect(keyNames).toContain("content");
	});

	it("has a threshold below 0.5 (reasonably strict matching)", () => {
		expect(FUSE_OPTIONS.threshold).toBeDefined();
		expect(FUSE_OPTIONS.threshold!).toBeLessThan(0.5);
	});

	it("has includeScore: true", () => {
		expect(FUSE_OPTIONS.includeScore).toBe(true);
	});
});

// ── buildIndexSync ────────────────────────────────────────────────────────

describe("buildIndexSync", () => {
	it("sets a non-null fuse instance on state", () => {
		expect(getState().fuse).toBeNull();
		buildIndexSync();
		expect(getState().fuse).not.toBeNull();
	});

	it("the fuse instance can search the mock entries", () => {
		buildIndexSync();
		const { fuse } = getState();
		expect(fuse).not.toBeNull();
		const results = fuse!.search("Prompt");
		expect(results.length).toBeGreaterThan(0);
		expect(results[0]!.item.id).toBe("note-02");
	});

	it("calling buildIndexSync twice replaces the index", () => {
		buildIndexSync();
		const first = getState().fuse;
		buildIndexSync();
		const second = getState().fuse;
		expect(second).not.toBe(first);
	});
});

// ── handleSearch ──────────────────────────────────────────────────────────

describe("handleSearch — empty query", () => {
	it("calls renderNav with all notes when query is empty and no tag filter", () => {
		buildIndexSync();
		const renderNav = vi.fn();
		const renderSearchResults = vi.fn();
		const onNoteClick = vi.fn();

		handleSearch("", { renderNav, renderSearchResults, onNoteClick });

		expect(renderNav).toHaveBeenCalledOnce();
		expect(renderSearchResults).not.toHaveBeenCalled();
		expect(getState().isSearching).toBe(false);

		// Called with full notes array
		const [passedNotes] = renderNav.mock.calls[0]!;
		expect((passedNotes as NoteMetadata[]).length).toBe(3);
	});

	it("calls renderNav with filtered notes when a tag filter is active", () => {
		buildIndexSync();
		setState({ activeTagFilter: "ml" });

		const renderNav = vi.fn();
		handleSearch("", {
			renderNav,
			renderSearchResults: vi.fn(),
			onNoteClick: vi.fn(),
		});

		const [passedNotes] = renderNav.mock.calls[0]!;
		const ids = (passedNotes as NoteMetadata[]).map((n) => n.id);
		// Only note-03 has tag "ml"
		expect(ids).toEqual(["note-03"]);
	});

	it("whitespace-only query is treated as empty", () => {
		buildIndexSync();
		const renderNav = vi.fn();
		handleSearch("   ", {
			renderNav,
			renderSearchResults: vi.fn(),
			onNoteClick: vi.fn(),
		});
		expect(renderNav).toHaveBeenCalledOnce();
		expect(getState().isSearching).toBe(false);
	});
});

describe("handleSearch — non-empty query", () => {
	it("sets isSearching: true and calls renderSearchResults", () => {
		buildIndexSync();
		const renderSearchResults = vi.fn();

		handleSearch("AI Fluency", {
			renderNav: vi.fn(),
			renderSearchResults,
			onNoteClick: vi.fn(),
		});

		expect(getState().isSearching).toBe(true);
		expect(renderSearchResults).toHaveBeenCalledOnce();
	});

	it("passes search results to renderSearchResults", () => {
		buildIndexSync();
		const renderSearchResults = vi.fn();

		handleSearch("ML", {
			renderNav: vi.fn(),
			renderSearchResults,
			onNoteClick: vi.fn(),
		});

		const [results] = renderSearchResults.mock.calls[0]!;
		expect(Array.isArray(results)).toBe(true);
		expect((results as unknown[]).length).toBeGreaterThan(0);
	});

	it("shows a holding message when fuse is not yet ready", () => {
		// Do NOT call buildIndexSync — fuse stays null
		const navList = document.getElementById("nav-list")!;

		handleSearch("anything", {
			renderNav: vi.fn(),
			renderSearchResults: vi.fn(),
			onNoteClick: vi.fn(),
		});

		expect(navList.innerHTML).toContain("Building search index");
	});
});

// ── Tag filtering integration ─────────────────────────────────────────────

describe("tag filtering integration", () => {
	it("renders only 'ai'-tagged notes when tag filter is 'ai' and query is empty", () => {
		buildIndexSync();
		setState({ activeTagFilter: "ai" });
		const renderNav = vi.fn();

		handleSearch("", {
			renderNav,
			renderSearchResults: vi.fn(),
			onNoteClick: vi.fn(),
		});

		const [filtered] = renderNav.mock.calls[0]!;
		const ids = (filtered as NoteMetadata[]).map((n) => n.id);
		// note-01 and note-02 have "ai" tag; note-03 does not
		expect(ids).toContain("note-01");
		expect(ids).toContain("note-02");
		expect(ids).not.toContain("note-03");
	});

	it("renders no notes when tag matches nothing", () => {
		buildIndexSync();
		setState({ activeTagFilter: "nonexistent" });
		const renderNav = vi.fn();

		handleSearch("", {
			renderNav,
			renderSearchResults: vi.fn(),
			onNoteClick: vi.fn(),
		});

		const [filtered] = renderNav.mock.calls[0]!;
		expect((filtered as NoteMetadata[]).length).toBe(0);
	});
});

// ── initSearch ────────────────────────────────────────────────────────────

describe("initSearch — Worker unavailable (jsdom default)", () => {
	it("falls back to sync indexing when Worker is undefined", () => {
		// jsdom does not expose Worker, so typeof Worker === "undefined"
		expect(getState().fuse).toBeNull();
		initSearch();
		expect(getState().fuse).not.toBeNull();
	});
});

describe("initSearch — Worker constructor throws", () => {
	it("catches the error and falls back to buildIndexSync", () => {
		vi.stubGlobal(
			"Worker",
			class {
				constructor() {
					throw new Error("Worker unavailable");
				}
			},
		);

		expect(getState().fuse).toBeNull();
		initSearch();
		expect(getState().fuse).not.toBeNull();

		vi.unstubAllGlobals();
	});
});

describe("initSearch — Worker emits error event", () => {
	it("falls back to buildIndexSync on Worker error event", async () => {
		let errorHandler: (() => void) | null = null;

		vi.stubGlobal(
			"Worker",
			class {
				postMessage() {}
				terminate() {}
				addEventListener(event: string, handler: () => void) {
					if (event === "error") errorHandler = handler;
				}
			},
		);

		initSearch();
		// Trigger the error handler (simulates Worker runtime error)
		expect(errorHandler).not.toBeNull();
		errorHandler!();

		expect(getState().fuse).not.toBeNull();
		vi.unstubAllGlobals();
	});
});

describe("initSearch — Worker sends message with prebuilt index", () => {
	it("uses the prebuilt Fuse index from the Worker message", async () => {
		const entries: NoteSearchEntry[] = [
			{
				id: "note-01",
				slug: "01-ai-fluency",
				emoji: "🧠",
				title: "AI Fluency",
				tags: ["ai"],
				content: "ai content",
			},
		];

		// Build a real Fuse index to pass through the simulated Worker message
		const fuseForIndex = new Fuse(entries, FUSE_OPTIONS);
		const serialisedIndex = fuseForIndex.getIndex().toJSON();

		let messageHandler: ((e: { data: unknown }) => void) | null = null;

		vi.stubGlobal(
			"Worker",
			class {
				postMessage() {}
				terminate() {}
				addEventListener(
					event: string,
					handler: (e: { data: unknown }) => void,
				) {
					if (event === "message") messageHandler = handler;
				}
			},
		);

		initSearch();
		expect(messageHandler).not.toBeNull();

		// Simulate the message from the Worker
		messageHandler!({ data: { index: serialisedIndex, notes: entries } });

		expect(getState().fuse).not.toBeNull();
		const results = getState().fuse!.search("AI Fluency");
		expect(results.length).toBeGreaterThan(0);

		vi.unstubAllGlobals();
	});
});
