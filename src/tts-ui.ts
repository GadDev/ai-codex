/* ═══════════════════════════════════════════
   tts-ui.ts — Floating "Read Aloud" player UI

   Structure:
     #tts-pill   — collapsed trigger (always visible when note loaded)
     #tts-player — expanded card (toggled open/closed)
   ═══════════════════════════════════════════ */

import { AudioPlayer } from "./audio-player.js";
import { hasAudio } from "./data.js";
import { extractSpeechText } from "./extract-speech-text.js";
import { extractSpeechContent, TTSController } from "./tts.js";
import type {
	IPlaybackEngine,
	NoteSearchEntry,
	SpeechSegment,
	TTSState,
} from "./types.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function requireEl<T extends Element>(parent: ParentNode, selector: string): T {
	const el = parent.querySelector<T>(selector);
	if (!el) throw new Error(`Required element not found: ${selector}`);
	return el;
}

function formatTime(seconds: number): string {
	if (!isFinite(seconds) || seconds < 0) return "0:00";
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── TTSPlayer ─────────────────────────────────────────────────────────────────

class TTSPlayer {
	private _controller: IPlaybackEngine;
	private _pill!: HTMLButtonElement;
	private _card!: HTMLDivElement;
	private _currentHighlightEl: Element | null = null;
	private _isExpanded = false;
	private _duration = 0; // seconds; 0 when unknown
	private _currentFraction = 0;

	constructor() {
		this._controller = new TTSController();
		this._buildPill();
		this._buildCard();
		this._wireVoices();
		this._wireKeyboard();
		this._wireEngineCallbacks();
	}

	// ── Engine factory ────────────────────────────────────────────────────────

	private _createEngine(note: NoteSearchEntry): IPlaybackEngine {
		return hasAudio(note.slug)
			? new AudioPlayer(note.slug)
			: new TTSController();
	}

	private _wireEngineCallbacks(): void {
		this._controller
			.onBoundary((_idx: number, seg: SpeechSegment) => this._onBoundary(seg))
			.onEnd(() => this._onEnd())
			.onStateChange((state: TTSState) => this._updateControls(state))
			.onProgress((fraction: number) => this._onProgress(fraction));
	}

	// ── Pill ──────────────────────────────────────────────────────────────────

	private _buildPill(): void {
		const pill = document.createElement("button");
		pill.id = "tts-pill";
		pill.className = "tts-pill";
		pill.setAttribute("aria-label", "Open audio player");
		pill.setAttribute("aria-expanded", "false");
		pill.innerHTML = `
			<span class="tts-pill-icon" aria-hidden="true">🎧</span>
			<span class="tts-pill-label">Listen</span>
			<span class="tts-pill-eq" aria-hidden="true">
				<span></span><span></span><span></span>
			</span>
		`;
		pill.style.display = "none";
		pill.addEventListener("click", () => this._toggleExpanded());
		document.body.appendChild(pill);
		this._pill = pill;
	}

	// ── Card ──────────────────────────────────────────────────────────────────

	private _buildCard(): void {
		const card = document.createElement("div");
		card.id = "tts-player";
		card.setAttribute("role", "region");
		card.setAttribute("aria-label", "Read aloud player");

		card.innerHTML = `
			<div class="tts-card-header">
				<span class="tts-note-emoji" id="tts-note-emoji"></span>
				<span class="tts-note-title" id="tts-note-title"></span>
				<button class="tts-icon-btn tts-close-btn" id="tts-close" aria-label="Close player" title="Close (Esc)">✕</button>
			</div>
			<div id="tts-stale-warning" class="tts-stale-warning" style="display:none" role="alert" aria-live="polite">
				⚠ Audio may be outdated — run <code>npm run generate:audio</code> to refresh
			</div>
			<div class="tts-scrubber-wrap">
				<div class="tts-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Reading progress">
					<div class="tts-progress-fill" id="tts-progress-fill"></div>
					<div class="tts-scrub-thumb" id="tts-scrub-thumb"></div>
				</div>
				<div class="tts-time-row">
					<span class="tts-time-elapsed" id="tts-time-elapsed">0:00</span>
					<span class="tts-time-tooltip" id="tts-time-tooltip" aria-live="off"></span>
					<span class="tts-time-remaining" id="tts-time-remaining">−0:00</span>
				</div>
			</div>
			<div class="tts-controls">
				<div class="tts-transport">
					<button class="tts-icon-btn" id="tts-restart" aria-label="Restart" title="Restart">
						<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
					</button>
					<button class="tts-icon-btn" id="tts-back" aria-label="Previous section" title="Previous section">
						<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" transform="scale(-1,1) translate(-24,0)"/></svg>
					</button>
					<button class="tts-icon-btn tts-play-btn" id="tts-play" aria-label="Play" title="Play / Pause (Space)">
						<svg class="tts-play-icon" viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M8 5v14l11-7z"/></svg>
						<svg class="tts-pause-icon" viewBox="0 0 24 24" fill="currentColor" width="22" height="22" style="display:none"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
					</button>
					<button class="tts-icon-btn" id="tts-forward" aria-label="Next section" title="Next section">
						<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M18 6h-2v12h2zm-3.5 6L6 6v12z"/></svg>
					</button>
					<button class="tts-icon-btn" id="tts-stop" aria-label="Stop" title="Stop" disabled>
						<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M6 6h12v12H6z"/></svg>
					</button>
				</div>
				<div class="tts-right-controls">
					<select class="tts-select" id="tts-voice" aria-label="Voice"></select>
					<div class="tts-rate">
						<span class="tts-rate-label" id="tts-rate-label" aria-live="polite">1×</span>
						<input type="range" class="tts-range" id="tts-rate" min="0.5" max="2" step="0.25" value="1" aria-label="Speed"/>
					</div>
				</div>
			</div>
		`;

		// Wire transport buttons
		requireEl<HTMLButtonElement>(card, "#tts-restart").addEventListener(
			"click",
			() => {
				this._controller.seekToSegment(0);
			},
		);
		requireEl<HTMLButtonElement>(card, "#tts-back").addEventListener(
			"click",
			() => {
				this._controller.skipBack();
			},
		);
		requireEl<HTMLButtonElement>(card, "#tts-play").addEventListener(
			"click",
			() => {
				this._togglePlay();
			},
		);
		requireEl<HTMLButtonElement>(card, "#tts-forward").addEventListener(
			"click",
			() => {
				this._controller.skipForward();
			},
		);
		requireEl<HTMLButtonElement>(card, "#tts-stop").addEventListener(
			"click",
			() => {
				this.stop();
			},
		);
		requireEl<HTMLButtonElement>(card, "#tts-close").addEventListener(
			"click",
			() => {
				this._collapse();
			},
		);

		// Rate slider
		const rateInput = requireEl<HTMLInputElement>(card, "#tts-rate");
		const rateLabel = requireEl<HTMLElement>(card, "#tts-rate-label");
		const savedRate = parseFloat(localStorage.getItem("tts-rate") ?? "1");
		rateInput.value = String(savedRate);
		rateLabel.textContent = savedRate + "×";
		this._controller.setRate(savedRate);

		let _rateTimer: ReturnType<typeof setTimeout> | null = null;
		rateInput.addEventListener("input", () => {
			const val = parseFloat(rateInput.value);
			rateLabel.textContent = val + "×";
			localStorage.setItem("tts-rate", String(val));
			if (_rateTimer !== null) clearTimeout(_rateTimer);
			_rateTimer = setTimeout(() => this._controller.setRate(val), 200);
		});

		// Scrubber — drag to seek with live time tooltip
		this._wireScrubber(card);

		card.style.display = "none";
		document.body.appendChild(card);
		this._card = card;
	}

	private _wireScrubber(card: HTMLDivElement): void {
		const bar = requireEl<HTMLElement>(card, ".tts-progress-bar");
		const tooltip = requireEl<HTMLElement>(card, "#tts-time-tooltip");
		let dragging = false;
		let wasPlaying = false;

		const fractionFromPointer = (e: PointerEvent): number => {
			const rect = bar.getBoundingClientRect();
			return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		};

		const updateScrubVisuals = (fraction: number): void => {
			const pct = Math.round(fraction * 100);
			requireEl<HTMLElement>(card, "#tts-progress-fill").style.width =
				pct + "%";
			requireEl<HTMLElement>(card, "#tts-scrub-thumb").style.left = pct + "%";
			bar.setAttribute("aria-valuenow", String(pct));

			if (this._duration > 0) {
				const elapsed = fraction * this._duration;
				const remaining = this._duration - elapsed;
				tooltip.textContent = `−${formatTime(remaining)}`;
				tooltip.style.left = pct + "%";
				requireEl<HTMLElement>(card, "#tts-time-elapsed").textContent =
					formatTime(elapsed);
				requireEl<HTMLElement>(card, "#tts-time-remaining").textContent =
					`−${formatTime(remaining)}`;
			}
		};

		bar.addEventListener("pointerdown", (e: PointerEvent) => {
			dragging = true;
			bar.setPointerCapture(e.pointerId);
			wasPlaying = this._controller.state === "playing";
			if (wasPlaying) this._controller.pause();
			tooltip.classList.add("visible");
			updateScrubVisuals(fractionFromPointer(e));
		});

		bar.addEventListener("pointermove", (e: PointerEvent) => {
			if (!dragging) return;
			updateScrubVisuals(fractionFromPointer(e));
		});

		bar.addEventListener("pointerup", (e: PointerEvent) => {
			if (!dragging) return;
			dragging = false;
			tooltip.classList.remove("visible");
			const fraction = fractionFromPointer(e);
			updateScrubVisuals(fraction);
			this._controller.seekToFraction(fraction);
			if (wasPlaying) this._controller.play();
		});

		bar.addEventListener("pointercancel", () => {
			dragging = false;
			tooltip.classList.remove("visible");
		});
	}

	// ── Pill/card visibility ──────────────────────────────────────────────────

	private _toggleExpanded(): void {
		this._isExpanded ? this._collapse() : this._expand();
	}

	private _expand(): void {
		this._isExpanded = true;
		this._card.style.display = "";
		this._card.classList.remove("tts-card-closing");
		this._card.classList.add("tts-card-open");
		this._pill.setAttribute("aria-expanded", "true");
		this._pill.classList.add("tts-pill-active");
		this._pill.style.display = "none";
	}

	private _collapse(): void {
		this._isExpanded = false;
		this._card.classList.remove("tts-card-open");
		this._card.classList.add("tts-card-closing");
		this._pill.setAttribute("aria-expanded", "false");
		this._pill.classList.remove("tts-pill-active");
		this._pill.style.display = "";
		const onEnd = () => {
			if (!this._isExpanded) this._card.style.display = "none";
			this._card.removeEventListener("animationend", onEnd);
		};
		this._card.addEventListener("animationend", onEnd);
	}

	// ── Voice population ──────────────────────────────────────────────────────

	private _wireVoices(): void {
		const ALLOWED = ["Samantha", "Daniel"];

		const populate = (): void => {
			const select = requireEl<HTMLSelectElement>(this._card, "#tts-voice");
			const voices = window.speechSynthesis.getVoices();
			if (!voices.length) return;

			const prevValue = select.value;
			select.innerHTML = "";

			const allowed = ALLOWED.flatMap((name) => {
				const enhanced = voices.find((v) => v.name === `${name} (Enhanced)`);
				const base = voices.find((v) => v.name === name);
				return enhanced ? [enhanced] : base ? [base] : [];
			});

			allowed.forEach((v) => {
				const opt = document.createElement("option");
				opt.value = v.name;
				const isEnhanced = v.name.includes("Enhanced");
				opt.textContent = `${v.name}${isEnhanced ? " ✦" : ""} (${v.lang})`;
				select.appendChild(opt);
			});

			const savedVoice = localStorage.getItem("tts-voice");
			const preferred = allowed.find(
				(v) => v.name === (savedVoice || prevValue),
			);
			const toSelect = preferred ?? allowed[0];
			if (toSelect) {
				select.value = toSelect.name;
				if (this._controller instanceof TTSController)
					this._controller.setVoice(toSelect);
			}
		};

		populate();
		window.speechSynthesis.addEventListener("voiceschanged", populate);

		requireEl<HTMLSelectElement>(this._card, "#tts-voice").addEventListener(
			"change",
			(e) => {
				if (!(this._controller instanceof TTSController)) return;
				const voice = window.speechSynthesis
					.getVoices()
					.find((v) => v.name === (e.target as HTMLSelectElement).value);
				if (voice) {
					this._controller.setVoice(voice);
					localStorage.setItem("tts-voice", voice.name);
				}
			},
		);
	}

	// ── Voice selector visibility ─────────────────────────────────────────────

	private _setVoiceSelectorVisible(visible: boolean): void {
		const select = this._card.querySelector<HTMLSelectElement>("#tts-voice");
		if (select) select.style.display = visible ? "" : "none";
	}

	// ── Stale audio warning ───────────────────────────────────────────────────

	private _setStaleWarning(visible: boolean): void {
		const el = this._card.querySelector<HTMLElement>("#tts-stale-warning");
		if (el) el.style.display = visible ? "" : "none";
	}

	private _checkStaleAudio(note: NoteSearchEntry): void {
		if (!hasAudio(note.slug) || !note.audioHash) return;
		const expected = note.audioHash;
		fetch(`/notes/${note.slug}.md`)
			.then((res) => {
				if (!res.ok) return;
				return res.text();
			})
			.then((markdown) => {
				if (!markdown) return;
				const speechText = extractSpeechText(markdown);
				return crypto.subtle.digest(
					"SHA-256",
					new TextEncoder().encode(speechText),
				);
			})
			.then((buf) => {
				if (!buf) return;
				const hex = Array.from(new Uint8Array(buf))
					.map((b) => b.toString(16).padStart(2, "0"))
					.join("");
				this._setStaleWarning(hex !== expected);
			})
			.catch(() => {
				/* offline or no crypto.subtle — skip silently */
			});
	}

	// ── Keyboard ──────────────────────────────────────────────────────────────

	private _wireKeyboard(): void {
		document.addEventListener("keydown", (e) => {
			if (this._pill.style.display === "none") return;
			if (
				(e.target as Element | null)?.matches("input, textarea, select, button")
			)
				return;
			if (e.metaKey || e.ctrlKey || e.altKey) return;

			if (e.code === "Space" && this._isExpanded) {
				e.preventDefault();
				this._togglePlay();
			}
			if (e.code === "Escape" && this._isExpanded) {
				this._collapse();
			}
		});
	}

	// ── Public API ────────────────────────────────────────────────────────────

	/** Toggle the card open/closed (called by the topbar listen chip). */
	toggle(): void {
		if (this._pill.style.display === "none" && !this._isExpanded) return; // no note loaded
		this._toggleExpanded();
	}

	/**
	 * Called on every note render. Loads the engine and prepares the player.
	 * The pill becomes visible; the card stays collapsed until the user opens it.
	 */
	attach(contentEl: Element, note: NoteSearchEntry): void {
		this.stop();
		this._duration = 0;
		this._currentFraction = 0;

		this._controller = this._createEngine(note);
		this._wireEngineCallbacks();

		const savedRate = parseFloat(localStorage.getItem("tts-rate") ?? "1");
		this._controller.setRate(savedRate);

		if (this._controller instanceof TTSController) {
			const savedVoice = localStorage.getItem("tts-voice");
			if (savedVoice) {
				const voice = window.speechSynthesis
					.getVoices()
					.find((v) => v.name === savedVoice);
				if (voice) this._controller.setVoice(voice);
			}
		}

		this._setVoiceSelectorVisible(this._controller instanceof TTSController);
		this._setStaleWarning(false);

		// Populate note identity in the card header
		const emojiEl = this._card.querySelector<HTMLElement>("#tts-note-emoji");
		const titleEl = this._card.querySelector<HTMLElement>("#tts-note-title");
		if (emojiEl) emojiEl.textContent = note.emoji;
		if (titleEl) titleEl.textContent = note.title;

		const { fullText, segments } = extractSpeechContent(contentEl);
		this._controller.load(fullText, segments);
		this._checkStaleAudio(note);

		this._updateProgress(0);
		this._updateTimeDisplay(0);

		// Show pill; keep card in its previous expanded/collapsed state
		this._pill.style.display = "";
		this._pill.classList.remove("tts-pill-playing");

		// If card was open for a previous note, update it but don't close it
		if (this._isExpanded) {
			this._card.style.display = "";
		}
	}

	/** Stop playback and hide everything. */
	detach(): void {
		this.stop();
		this._collapse();
		// After animation, hide pill too
		setTimeout(() => {
			this._pill.style.display = "none";
		}, 300);
	}

	/** Stop playback (pill/card stay visible). */
	stop(): void {
		this._controller.stop();
		this._clearHighlight();
		this._updateProgress(0);
		this._updateTimeDisplay(0);
	}

	// ── Private: playback ─────────────────────────────────────────────────────

	private _togglePlay(): void {
		if (this._controller.state === "playing") {
			this._controller.pause();
		} else {
			this._controller.play();
		}
	}

	private _onBoundary(seg: SpeechSegment | undefined): void {
		if (!seg) return;
		this._clearHighlight();
		seg.el.classList.add("tts-highlight");
		this._currentHighlightEl = seg.el;
		seg.el.scrollIntoView({ block: "nearest", behavior: "smooth" });
	}

	private _onEnd(): void {
		this._clearHighlight();
		this._updateProgress(1);
		this._updateTimeDisplay(1);
		this._updateControls("stopped");
		this._pill.classList.remove("tts-pill-playing");
	}

	private _onProgress(fraction: number): void {
		this._currentFraction = fraction;
		this._updateProgress(fraction);
		this._updateTimeDisplay(fraction);

		// Sync AudioPlayer duration lazily (available after buffering starts)
		if (this._controller instanceof AudioPlayer) {
			const d = this._controller.audioDuration;
			if (d > 0 && d !== this._duration) this._duration = d;
		}
	}

	private _updateProgress(fraction: number): void {
		const fill = this._card.querySelector<HTMLElement>("#tts-progress-fill");
		const thumb = this._card.querySelector<HTMLElement>("#tts-scrub-thumb");
		const bar = this._card.querySelector<HTMLElement>(".tts-progress-bar");
		const pct = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
		if (fill) fill.style.width = pct + "%";
		if (thumb) thumb.style.left = pct + "%";
		bar?.setAttribute("aria-valuenow", String(pct));
	}

	private _updateTimeDisplay(fraction: number): void {
		const elapsed = this._duration > 0 ? fraction * this._duration : 0;
		const remaining = this._duration > 0 ? this._duration - elapsed : 0;
		const elapsedEl =
			this._card.querySelector<HTMLElement>("#tts-time-elapsed");
		const remainEl = this._card.querySelector<HTMLElement>(
			"#tts-time-remaining",
		);
		if (elapsedEl) elapsedEl.textContent = formatTime(elapsed);
		if (remainEl)
			remainEl.textContent =
				this._duration > 0 ? `−${formatTime(remaining)}` : "";
	}

	private _clearHighlight(): void {
		if (this._currentHighlightEl) {
			this._currentHighlightEl.classList.remove("tts-highlight");
			this._currentHighlightEl = null;
		}
	}

	private _updateControls(state: TTSState): void {
		const playBtn = requireEl<HTMLButtonElement>(this._card, "#tts-play");
		const stopBtn = requireEl<HTMLButtonElement>(this._card, "#tts-stop");
		const restartBtn = requireEl<HTMLButtonElement>(this._card, "#tts-restart");
		const backBtn = requireEl<HTMLButtonElement>(this._card, "#tts-back");
		const fwdBtn = requireEl<HTMLButtonElement>(this._card, "#tts-forward");

		const playing = state === "playing";
		const active = playing || state === "paused";

		playBtn.querySelector<SVGElement>(".tts-play-icon")!.style.display = playing
			? "none"
			: "";
		playBtn.querySelector<SVGElement>(".tts-pause-icon")!.style.display =
			playing ? "" : "none";
		playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");

		stopBtn.disabled = !active;
		restartBtn.disabled = !active;
		backBtn.disabled = !active;
		fwdBtn.disabled = !active;

		// Pill equaliser animation
		if (playing) {
			this._pill.classList.add("tts-pill-playing");
		} else {
			this._pill.classList.remove("tts-pill-playing");
		}
	}
}

// Singleton — one player instance shared across the whole app
export const ttsPlayer = new TTSPlayer();
