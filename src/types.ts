import type Fuse from "fuse.js";

// ── Note data ──────────────────────────────────────────────────────────────

/** Static metadata for a single note — used in the sidebar and data layer. */
export interface NoteMetadata {
	readonly id: string; // "note-01"
	readonly slug: string; // "01-ai-fluency-framework"
	readonly emoji: string;
	readonly title: string;
	readonly tags: readonly string[];
}

/** NoteMetadata enriched with plain-text content for Fuse.js indexing. */
export interface NoteSearchEntry extends NoteMetadata {
	readonly content: string;
	/** SHA-256 hash of the speech text at audio-generation time. Used for staleness detection. */
	readonly audioHash?: string;
}

/** Shape of public/notes-manifest.json generated at build time. */
export interface NotesManifest {
	/** SHA-256 content hash — used to bust the service worker cache. */
	readonly version: string;
	readonly notes: readonly NoteSearchEntry[];
}

/** Parsed YAML front matter key/value pairs from a markdown file. */
export type FrontMatter = Record<string, string>;

// ── Categories ───────────────────────────────────────────────────────────

export interface NoteCategory {
	readonly name: string;
	readonly description: string;
	readonly noteIds: readonly string[];
}

// ── App state ──────────────────────────────────────────────────────────────

/** Immutable application state snapshot. Use setState() to produce updates. */
export interface AppState {
	readonly activeNoteId: string | null;
	readonly activeTagFilter: string | null;
	readonly noteHistory: readonly string[];
	readonly historyIndex: number;
	readonly isSearching: boolean;
	readonly isNavigatingHistory: boolean;
	readonly fuse: Fuse<NoteSearchEntry> | null;
	readonly sectionObserver: { disconnect(): void } | null;
	readonly noteContentCache: Map<string, string>; // slug → raw markdown
}

// ── TTS ───────────────────────────────────────────────────────────────────

export type TTSState = "stopped" | "playing" | "paused";

export interface SpeechSegment {
	text: string;
	el: Element;
	charStart: number;
	charEnd: number;
}

/** Shared contract for TTS playback engines (Web Speech API and AudioPlayer). */
export interface IPlaybackEngine {
	load(fullText: string, segments: SpeechSegment[]): void;
	play(): void;
	pause(): void;
	stop(): void;
	seekToFraction(fraction: number): void;
	seekToSegment(idx: number): void;
	skipBack(): void;
	skipForward(): void;
	setRate(rate: number): this;
	onBoundary(fn: (idx: number, seg: SpeechSegment) => void): this;
	onEnd(fn: () => void): this;
	onStateChange(fn: (state: TTSState) => void): this;
	onProgress(fn: (pct: number) => void): this;
	readonly state: TTSState;
}
