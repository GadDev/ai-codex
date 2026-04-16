/* ═══════════════════════════════════════════
   tts.ts — Text-to-Speech engine (Web Speech API)
   ═══════════════════════════════════════════ */

import type { IPlaybackEngine, SpeechSegment, TTSState } from "./types.js";

/**
 * Extract speakable text segments from a rendered note content element.
 * Skips code blocks. Returns segments with char offsets into fullText
 * for scroll-spy highlighting.
 */
export function extractSpeechContent(contentEl: Element): {
	fullText: string;
	segments: SpeechSegment[];
} {
	const elements = Array.from(
		contentEl.querySelectorAll("h1, h2, h3, h4, h5, h6, p, li, blockquote"),
	);

	const segments: SpeechSegment[] = [];
	let charOffset = 0;

	for (const el of elements) {
		// Skip anything inside a <pre> code block
		if (el.closest("pre")) continue;

		const text = getElementText(el);
		if (!text) continue;

		segments.push({
			text,
			el,
			charStart: charOffset,
			charEnd: charOffset + text.length - 1,
		});
		charOffset += text.length + 1; // +1 for the space that joins segments
	}

	const fullText = segments.map((s) => s.text).join(" ");
	return { fullText, segments };
}

/**
 * Get plain text from an element, stripping child buttons and nested lists
 * (to avoid duplicating nested list-item text in the parent li's text).
 * Applies cleanups to make the text sound more natural when spoken.
 */
function getElementText(el: Element): string {
	const clone = el.cloneNode(true) as Element;
	// Remove collapse-toggle buttons injected by makeCollapsible
	clone.querySelectorAll("button").forEach((b) => {
		b.remove();
	});
	// For list items, remove nested ul/ol so child text isn't repeated
	if (el.tagName === "LI") {
		clone.querySelectorAll("ul, ol").forEach((list) => {
			list.remove();
		});
	}
	const text = (clone.textContent ?? "").trim().replace(/\s+/g, " ");
	return normalizeForSpeech(text, el.tagName);
}

/**
 * Clean up text so the speech engine sounds more natural.
 * - Expands common abbreviations
 * - Adds a pause after headings by appending ". "
 * - Strips leftover markdown symbols
 * - Handles edge cases like standalone colons and dashes
 * @param text  raw text string
 * @param tagName  uppercase element tag name, e.g. "H2", "P", "LI"
 */
function normalizeForSpeech(text: string, tagName: string): string {
	// Expand abbreviations before anything else
	text = text
		.replace(/\be\.g\./gi, "for example")
		.replace(/\bi\.e\./gi, "that is")
		.replace(/\betc\./gi, "and so on")
		.replace(/\bvs\.?/gi, "versus")
		.replace(/\bAPI\b/g, "A P I")
		.replace(/\bLLM\b/g, "L L M")
		.replace(/\bRAG\b/g, "R A G")
		.replace(/\bUI\b/g, "U I")
		.replace(/\bUX\b/g, "U X")
		.replace(/\bURL\b/g, "U R L");

	// Strip leftover markdown: **, *, `, #, >
	text = text.replace(/[*`#>_~]/g, "");

	// Replace em-dashes and double hyphens with a comma-pause
	text = text.replace(/\s*[-\u2014]{2,}\s*/g, ", ");

	// Replace " — " (em-dash) with a comma
	text = text.replace(/\s*\u2014\s*/g, ", ");

	// Headings: append " — " so TTS pauses naturally after reading the title
	if (/^H[1-6]$/.test(tagName)) {
		if (!text.endsWith(".") && !text.endsWith("!") && !text.endsWith("?")) {
			text = text + ". ";
		}
	}

	// Collapse any multi-space created by replacements
	return text.replace(/ {2,}/g, " ").trim();
}

/**
 * Binary search: find the segment whose char range contains charIndex.
 * Falls back to the nearest segment to the left.
 */
function findSegmentIndex(
	segments: SpeechSegment[],
	charIndex: number,
): number {
	let lo = 0;
	let hi = segments.length - 1;
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		const seg = segments[mid]!;
		if (charIndex < seg.charStart) {
			hi = mid - 1;
		} else if (charIndex > seg.charEnd) {
			lo = mid + 1;
		} else {
			return mid;
		}
	}
	// charIndex fell between two segments (e.g. on the space separator)
	return Math.max(0, lo - 1);
}

// ── TTSController ────────────────────────────────────────────────────────────

export class TTSController implements IPlaybackEngine {
	// ── Field declarations (required by TypeScript strict mode) ──
	private _synth: SpeechSynthesis;
	private _utterance: SpeechSynthesisUtterance | null;
	private _segments: SpeechSegment[];
	private _fullText: string;
	private _rate: number;
	private _voice: SpeechSynthesisVoice | null;
	private _onBoundary: ((idx: number, seg: SpeechSegment) => void) | null;
	private _onEnd: (() => void) | null;
	private _onStateChange: ((state: TTSState) => void) | null;
	private _onProgress: ((fraction: number) => void) | null;
	private _keepAliveTimer: ReturnType<typeof setInterval> | null;
	private _currentSegmentIdx: number;
	state: TTSState;

	constructor() {
		this._synth = window.speechSynthesis;
		this._utterance = null;
		this._segments = [];
		this._fullText = "";
		this._rate = 1;
		this._voice = null;
		this._onBoundary = null;
		this._onEnd = null;
		this._onStateChange = null;
		this._onProgress = null;
		this._keepAliveTimer = null;
		this._currentSegmentIdx = 0;
		this.state = "stopped";
	}

	get isSupported(): boolean {
		return typeof window !== "undefined" && "speechSynthesis" in window;
	}

	setRate(rate: number): this {
		this._rate = rate;
		// Apply immediately if currently active — restart from current position
		if (this.state === "playing" || this.state === "paused") {
			this._clearKeepAlive();
			this._synth.cancel();
			this._speakFrom(this._currentSegmentIdx);
		}
		return this;
	}

	setVoice(voice: SpeechSynthesisVoice): this {
		this._voice = voice;
		return this;
	}

	/** Load new content. Stops any in-progress speech. */
	load(fullText: string, segments: SpeechSegment[]): void {
		this.stop();
		this._fullText = fullText;
		this._segments = segments;
		this._currentSegmentIdx = 0;
	}

	play() {
		if (!this.isSupported) return;
		if (this.state === "playing") return;
		if (!this._fullText) return;

		// Both paused and stopped resume from the remembered segment position.
		// We use cancel-based pause (see pause()), so synth.resume() is not used.
		this._speakFrom(this._currentSegmentIdx);
	}

	pause() {
		if (!this.isSupported || this.state !== "playing") return;
		this._clearKeepAlive();
		// Chrome's synth.pause() is unreliable on many systems — it often freezes
		// the engine silently. Cancel instead and remember _currentSegmentIdx so
		// play() can restart from the same position.
		this._synth.cancel();
		this._utterance = null;
		this._setState("paused");
	}

	stop() {
		if (!this.isSupported) return;
		this._clearKeepAlive();
		this._synth.cancel();
		this._utterance = null;
		this._currentSegmentIdx = 0;
		this._setState("stopped");
	}

	/**
	 * Jump to a specific segment index.
	 * If currently playing or paused, immediately restarts from that segment.
	 * If stopped, updates the position for the next play().
	 */
	seekToSegment(idx: number): void {
		if (!this.isSupported || !this._segments.length) return;
		const target = Math.max(0, Math.min(idx, this._segments.length - 1));
		const wasActive = this.state === "playing" || this.state === "paused";
		this._currentSegmentIdx = target;
		if (wasActive) {
			this._clearKeepAlive();
			// _speakFrom handles cancel() internally — do not double-cancel here
			this._speakFrom(target);
		}
		if (this._onProgress && this._fullText.length > 0) {
			const seg = this._segments[target];
			this._onProgress(seg ? seg.charStart / this._fullText.length : 0);
		}
	}

	/**
	 * Seek to a fractional position (0–1) in the full text.
	 */
	seekToFraction(fraction: number): void {
		const charPos = Math.floor(
			Math.max(0, Math.min(1, fraction)) * this._fullText.length,
		);
		const idx = findSegmentIndex(this._segments, charPos);
		this.seekToSegment(idx);
	}

	/**
	 * Skip backward to the previous h2 section boundary,
	 * or restart from the beginning if already in the first section.
	 */
	skipBack(): void {
		const h2Idxs = this._segments
			.map((s: SpeechSegment, i: number) => (s.el.tagName === "H2" ? i : -1))
			.filter((i: number) => i >= 0);

		if (!h2Idxs.length) {
			this.seekToSegment(Math.max(0, this._currentSegmentIdx - 5));
			return;
		}

		const prev = [...h2Idxs]
			.reverse()
			.find((i) => i < this._currentSegmentIdx - 1);
		this.seekToSegment(prev !== undefined ? prev : 0);
	}

	/**
	 * Skip forward to the next h2 section boundary.
	 * Does nothing if already in the last section.
	 */
	skipForward(): void {
		const h2Idxs = this._segments
			.map((s: SpeechSegment, i: number) => (s.el.tagName === "H2" ? i : -1))
			.filter((i: number) => i >= 0);

		if (!h2Idxs.length) {
			this.seekToSegment(
				Math.min(this._segments.length - 1, this._currentSegmentIdx + 5),
			);
			return;
		}

		const next = h2Idxs.find((i) => i > this._currentSegmentIdx);
		if (next !== undefined) this.seekToSegment(next);
	}

	// ── Internal ──────────────────────────────────────────────────────────────

	/**
	 * Create a new utterance from segment[segmentIdx].charStart and speak it.
	 */
	private _speakFrom(segmentIdx: number): void {
		if (!this._fullText || !this._segments.length) return;

		const startChar = this._segments[segmentIdx]?.charStart ?? 0;
		const text = this._fullText.slice(startChar);
		if (!text) return;

		const utt = new SpeechSynthesisUtterance(text);
		utt.rate = this._rate;
		if (this._voice) {
			utt.voice = this._voice;
			utt.lang = this._voice.lang;
		}

		utt.addEventListener("boundary", (e) => {
			if (e.name !== "word" && e.name !== "sentence") return;
			const absoluteChar = startChar + e.charIndex;
			const idx = findSegmentIndex(this._segments, absoluteChar);
			this._currentSegmentIdx = idx;
			if (this._onBoundary) this._onBoundary(idx, this._segments[idx]);
			if (this._onProgress && this._fullText.length > 0) {
				this._onProgress(absoluteChar / this._fullText.length);
			}
		});

		utt.addEventListener("end", () => {
			this._clearKeepAlive();
			this._currentSegmentIdx = 0;
			this._setState("stopped");
			if (this._onEnd) this._onEnd();
		});

		utt.addEventListener("error", (e) => {
			// 'interrupted' means cancel() was called intentionally (seek, skip, rate change).
			// Ignore it — the new utterance has already taken over.
			if (e.error === "interrupted") return;
			// 'not-allowed' = speak() outside user gesture. 'synthesis-failed' = engine error.
			console.warn("[TTS] error:", e.error);
			this._clearKeepAlive();
			this._setState("stopped");
			if (this._onEnd) this._onEnd();
		});

		this._utterance = utt;
		this._setState("playing");
		this._startKeepAlive();
		// Chrome workaround: cancel + resume resets the engine state synchronously,
		// preventing the silent-drop bug where speaking=true but start never fires.
		this._synth.cancel();
		this._synth.resume();
		this._synth.speak(utt);
	}

	/**
	 * Keep-alive: Safari/iOS pauses speechSynthesis silently after ~15 s.
	 * Periodically nudge it to stay active.
	 * NOTE: Do NOT run this on Chrome — the pause/resume can re-trigger the
	 * silent-drop bug where speaking=true but audio stops.
	 */
	private _startKeepAlive(): void {
		this._clearKeepAlive();
		if (!this._isSafari()) return;
		this._keepAliveTimer = setInterval(() => {
			if (this._synth.speaking && !this._synth.paused) {
				this._synth.pause();
				this._synth.resume();
			}
		}, 10_000);
	}

	private _clearKeepAlive(): void {
		if (this._keepAliveTimer !== null) {
			clearInterval(this._keepAliveTimer);
			this._keepAliveTimer = null;
		}
	}

	/** True when running in Safari (Apple vendor string). */
	private _isSafari(): boolean {
		return /^Apple/.test(navigator.vendor);
	}

	private _setState(newState: TTSState): void {
		this.state = newState;
		if (this._onStateChange) this._onStateChange(newState);
	}

	onBoundary(fn: (idx: number, seg: SpeechSegment) => void): this {
		this._onBoundary = fn;
		return this;
	}

	onEnd(fn: () => void): this {
		this._onEnd = fn;
		return this;
	}

	onStateChange(fn: (state: TTSState) => void): this {
		this._onStateChange = fn;
		return this;
	}

	onProgress(fn: (fraction: number) => void): this {
		this._onProgress = fn;
		return this;
	}
}
