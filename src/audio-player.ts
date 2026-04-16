/* ═══════════════════════════════════════════
   audio-player.ts — IPlaybackEngine backed by HTMLAudioElement + .words.json
   ═══════════════════════════════════════════ */

import type { IPlaybackEngine, SpeechSegment, TTSState } from "./types.js";

interface WordTimestamp {
	readonly word: string;
	readonly start: number;
	readonly end: number;
}

/**
 * Binary search: find the last word whose start time is ≤ currentTime.
 * Returns 0 if currentTime is before the first word.
 */
function findWordIndex(
	words: readonly WordTimestamp[],
	currentTime: number,
): number {
	if (!words.length) return 0;
	let lo = 0;
	let hi = words.length - 1;
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		const w = words[mid];
		if (w && w.start <= currentTime) {
			lo = mid + 1;
		} else {
			hi = mid - 1;
		}
	}
	return Math.max(0, lo - 1);
}

/**
 * Map a word index to the segment whose char range contains the word's
 * approximate character position.
 *
 * Strategy: map word position linearly across the full text length, then
 * fall back to the nearest segment. Accurate enough for highlighting because
 * segments are large (paragraph/heading level).
 */
function wordIndexToSegment(
	wordIdx: number,
	words: readonly WordTimestamp[],
	segments: readonly SpeechSegment[],
	fullText: string,
): number {
	if (!segments.length || !words.length) return 0;

	const word = words[wordIdx];
	if (!word) return 0;

	const lastWord = words[words.length - 1];
	const duration = lastWord && lastWord.end > 0 ? lastWord.end : 1;
	const fraction = word.start / duration;
	const charPos = Math.floor(fraction * fullText.length);

	// Binary search on char ranges
	let lo = 0;
	let hi = segments.length - 1;
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		const seg = segments[mid];
		if (!seg) break;
		if (charPos < seg.charStart) {
			hi = mid - 1;
		} else if (charPos > seg.charEnd) {
			lo = mid + 1;
		} else {
			return mid;
		}
	}
	return Math.max(0, lo - 1);
}

// ── AudioPlayer ───────────────────────────────────────────────────────────────

export class AudioPlayer implements IPlaybackEngine {
	private readonly _audio: HTMLAudioElement;
	private readonly _slug: string;

	private _segments: SpeechSegment[] = [];
	private _fullText = "";
	private _words: readonly WordTimestamp[] = [];

	private _lastWordIdx = -1;
	private _rafId: number | null = null;

	private _onBoundaryFn: ((idx: number, seg: SpeechSegment) => void) | null =
		null;
	private _onEndFn: (() => void) | null = null;
	private _onStateChangeFn: ((state: TTSState) => void) | null = null;
	private _onProgressFn: ((pct: number) => void) | null = null;

	state: TTSState = "stopped";

	constructor(slug: string) {
		this._slug = slug;
		this._audio = new Audio();
		this._audio.preload = "auto";

		this._audio.addEventListener("ended", () => {
			this._stopRaf();
			this._setState("stopped");
			if (this._onEndFn) this._onEndFn();
		});

		this._audio.addEventListener("error", () => {
			this._stopRaf();
			const err = this._audio.error;
			console.error(
				`[AudioPlayer] audio error for ${this._slug}:`,
				err?.message ?? err,
			);
			this._setState("stopped");
			if (this._onEndFn) this._onEndFn();
		});

		this._audio.addEventListener("timeupdate", () => {
			if (!this._onProgressFn || !this._audio.duration) return;
			this._onProgressFn(this._audio.currentTime / this._audio.duration);
		});
	}

	// ── IPlaybackEngine ───────────────────────────────────────────────────────

	/**
	 * Load the audio source and eagerly fetch .words.json.
	 * Both operations run in parallel — audio buffering starts immediately.
	 */
	load(fullText: string, segments: SpeechSegment[]): void {
		this.stop();
		this._fullText = fullText;
		this._segments = segments;
		this._words = [];
		this._lastWordIdx = -1;

		this._audio.src = `/audio/${this._slug}.mp3`;
		this._audio.load();

		// Fetch word timestamps eagerly — do not await, failure is non-fatal
		fetch(`/audio/${this._slug}.words.json`)
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<WordTimestamp[]>;
			})
			.then((words) => {
				this._words = words;
			})
			.catch((err) => {
				// Non-fatal: fall back to segment-level highlighting
				console.warn(
					`[AudioPlayer] could not load words.json for ${this._slug} — ` +
						`falling back to segment-level highlighting. (${err})`,
				);
			});
	}

	play(): void {
		if (this.state === "playing") return;
		this._audio
			.play()
			.then(() => {
				this._setState("playing");
				this._startRaf();
			})
			.catch((err) => {
				console.error("[AudioPlayer] play() failed:", err);
				this._setState("stopped");
				if (this._onEndFn) this._onEndFn();
			});
	}

	pause(): void {
		if (this.state !== "playing") return;
		this._audio.pause();
		this._stopRaf();
		this._setState("paused");
	}

	stop(): void {
		this._audio.pause();
		this._audio.currentTime = 0;
		this._stopRaf();
		this._lastWordIdx = -1;
		this._setState("stopped");
	}

	seekToFraction(fraction: number): void {
		if (!this._audio.duration) return;
		this._audio.currentTime =
			Math.max(0, Math.min(1, fraction)) * this._audio.duration;
	}

	seekToSegment(idx: number): void {
		if (!this._segments.length || !this._fullText.length) return;
		const seg =
			this._segments[Math.max(0, Math.min(idx, this._segments.length - 1))];
		if (!seg) return;
		this.seekToFraction(seg.charStart / this._fullText.length);
	}

	/**
	 * Skip backward to the previous H2 section boundary, or restart from
	 * the beginning if already in the first section.
	 */
	skipBack(): void {
		const current = this._currentSegmentIdx();
		const h2Idxs = this._h2Indexes();

		if (!h2Idxs.length) {
			this.seekToSegment(Math.max(0, current - 5));
			return;
		}

		const prev = [...h2Idxs].reverse().find((i) => i < current - 1);
		this.seekToSegment(prev !== undefined ? prev : 0);
	}

	/**
	 * Skip forward to the next H2 section boundary.
	 * Does nothing if already in the last section.
	 */
	skipForward(): void {
		const current = this._currentSegmentIdx();
		const h2Idxs = this._h2Indexes();

		if (!h2Idxs.length) {
			this.seekToSegment(Math.min(this._segments.length - 1, current + 5));
			return;
		}

		const next = h2Idxs.find((i) => i > current);
		if (next !== undefined) this.seekToSegment(next);
	}

	/** Instant effect — no restart needed. */
	setRate(rate: number): this {
		this._audio.playbackRate = rate;
		return this;
	}

	onBoundary(fn: (idx: number, seg: SpeechSegment) => void): this {
		this._onBoundaryFn = fn;
		return this;
	}

	onEnd(fn: () => void): this {
		this._onEndFn = fn;
		return this;
	}

	onStateChange(fn: (state: TTSState) => void): this {
		this._onStateChangeFn = fn;
		return this;
	}

	onProgress(fn: (pct: number) => void): this {
		this._onProgressFn = fn;
		return this;
	}

	// ── rAF highlight loop ────────────────────────────────────────────────────

	private _startRaf(): void {
		this._stopRaf();
		const tick = () => {
			if (this._audio.paused || this._audio.ended) return;

			const idx = findWordIndex(this._words, this._audio.currentTime);
			if (idx !== this._lastWordIdx) {
				this._lastWordIdx = idx;
				// Only fire if we have word data — otherwise segment highlights
				// are driven by timeupdate → onProgress in tts-ui.ts
				if (this._words.length && this._onBoundaryFn) {
					const segIdx = wordIndexToSegment(
						idx,
						this._words,
						this._segments,
						this._fullText,
					);
					const seg = this._segments[segIdx];
					if (seg) this._onBoundaryFn(segIdx, seg);
				}
			}

			this._rafId = requestAnimationFrame(tick);
		};
		this._rafId = requestAnimationFrame(tick);
	}

	private _stopRaf(): void {
		if (this._rafId !== null) {
			cancelAnimationFrame(this._rafId);
			this._rafId = null;
		}
	}

	// ── Internal helpers ──────────────────────────────────────────────────────

	private _setState(newState: TTSState): void {
		this.state = newState;
		if (this._onStateChangeFn) this._onStateChangeFn(newState);
	}

	/** Derive the current segment index from audio position and word data. */
	private _currentSegmentIdx(): number {
		if (!this._segments.length) return 0;
		if (this._words.length) {
			const wordIdx = findWordIndex(this._words, this._audio.currentTime);
			return wordIndexToSegment(
				wordIdx,
				this._words,
				this._segments,
				this._fullText,
			);
		}
		// No word data — approximate from time fraction
		const fraction = this._audio.duration
			? this._audio.currentTime / this._audio.duration
			: 0;
		const charPos = Math.floor(fraction * this._fullText.length);
		let lo = 0;
		let hi = this._segments.length - 1;
		while (lo <= hi) {
			const mid = (lo + hi) >> 1;
			const seg = this._segments[mid];
			if (!seg) break;
			if (charPos < seg.charStart) hi = mid - 1;
			else if (charPos > seg.charEnd) lo = mid + 1;
			else return mid;
		}
		return Math.max(0, lo - 1);
	}

	private _h2Indexes(): number[] {
		return this._segments
			.map((s, i) => (s.el.tagName === "H2" ? i : -1))
			.filter((i) => i >= 0);
	}
}
