/* ═══════════════════════════════════════════
   tts-ui.ts — Floating "Read Aloud" player UI
   ═══════════════════════════════════════════ */

import { AudioPlayer } from "./audio-player.js";
import { extractSpeechContent, TTSController } from "./tts.js";
import type {
	IPlaybackEngine,
	NoteSearchEntry,
	SpeechSegment,
	TTSState,
} from "./types.js";

function requireEl<T extends Element>(parent: ParentNode, selector: string): T {
	const el = parent.querySelector<T>(selector);
	if (!el) throw new Error(`Required element not found: ${selector}`);
	return el;
}

class TTSPlayer {
	// ── Field declarations (required by TypeScript strict mode) ──
	private _controller: IPlaybackEngine;
	private _panel!: HTMLDivElement; // definite assignment: set by _buildPanel() in constructor
	private _currentHighlightEl: Element | null;

	constructor() {
		this._controller = new TTSController();
		this._currentHighlightEl = null;
		this._buildPanel();
		this._wireVoices();
		this._wireKeyboard();
		this._wireEngineCallbacks();
	}

	// ── Engine factory ────────────────────────────────────────────────────────

	private _createEngine(note: NoteSearchEntry): IPlaybackEngine {
		if (note.hasAudio) {
			return new AudioPlayer(note.slug);
		}
		return new TTSController();
	}

	private _wireEngineCallbacks(): void {
		this._controller
			.onBoundary((_idx: number, seg: SpeechSegment) => this._onBoundary(seg))
			.onEnd(() => this._onEnd())
			.onStateChange((state: TTSState) => this._updateControls(state))
			.onProgress((pct: number) => this._updateProgress(pct));
	}

	// ── Panel construction ────────────────────────────────────────────────────

	private _buildPanel(): void {
		const panel = document.createElement("div") as HTMLDivElement;
		panel.id = "tts-player";
		panel.setAttribute("role", "region");
		panel.setAttribute("aria-label", "Read aloud controls");

		// All content is static markup — no user data interpolated here
		panel.innerHTML = `
      <div id="tts-stale-warning" style="display:none" role="alert" aria-live="polite">
        Audio may be outdated — refresh audio file for this note to ensure it matches the current text.
      </div>
      <div class="tts-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Reading progress">
        <div class="tts-progress-fill" id="tts-progress-fill"></div>
      </div>
      <div class="tts-controls">
        <div class="tts-transport">
          <button class="tts-btn" id="tts-restart" aria-label="Restart from beginning" title="Restart (⌘↩)">⏮</button>
          <button class="tts-btn" id="tts-back"    aria-label="Previous section"        title="Previous section">⏪</button>
          <button class="tts-btn" id="tts-play"    aria-label="Play"                    title="Play / Pause (Space)">
            <span class="tts-play-icon">▶</span>
          </button>
          <button class="tts-btn" id="tts-forward" aria-label="Next section"            title="Next section">⏩</button>
          <button class="tts-btn" id="tts-stop"    aria-label="Stop"                    title="Stop" disabled>■</button>
        </div>
        <select class="tts-select" id="tts-voice" aria-label="Voice"></select>
        <span class="tts-voice-label" id="tts-voice-label" style="display:none">Voice: OpenAI</span>
        <div class="tts-rate">
          <span class="tts-rate-label" id="tts-rate-label" aria-live="polite">1×</span>
          <input
            type="range"
            class="tts-range"
            id="tts-rate"
            min="0.5"
            max="2"
            step="0.25"
            value="1"
            aria-label="Reading speed (0.5× to 2×)"
          />
        </div>
        <button class="tts-btn tts-close-btn" id="tts-close" aria-label="Close player" title="Close player">✕</button>
      </div>
    `;

		requireEl<HTMLButtonElement>(panel, "#tts-restart").addEventListener(
			"click",
			() => {
				this._controller.seekToSegment(0);
			},
		);
		requireEl<HTMLButtonElement>(panel, "#tts-back").addEventListener(
			"click",
			() => {
				this._controller.skipBack();
			},
		);
		requireEl<HTMLButtonElement>(panel, "#tts-play").addEventListener(
			"click",
			() => {
				this._togglePlay();
			},
		);
		requireEl<HTMLButtonElement>(panel, "#tts-forward").addEventListener(
			"click",
			() => {
				this._controller.skipForward();
			},
		);
		requireEl<HTMLButtonElement>(panel, "#tts-stop").addEventListener(
			"click",
			() => {
				this.stop();
			},
		);
		requireEl<HTMLButtonElement>(panel, "#tts-close").addEventListener(
			"click",
			() => {
				this.detach();
			},
		);

		const rateInput = requireEl<HTMLInputElement>(panel, "#tts-rate");
		const rateLabel = requireEl<HTMLElement>(panel, "#tts-rate-label");

		const savedRate = parseFloat(localStorage.getItem("tts-rate") ?? "1");
		rateInput.value = String(savedRate);
		rateLabel.textContent = savedRate + "×";
		this._controller.setRate(savedRate);

		let _rateDebounceTimer: ReturnType<typeof setTimeout> | null = null;
		rateInput.addEventListener("input", () => {
			const val = parseFloat(rateInput.value);
			rateLabel.textContent = val + "×";
			localStorage.setItem("tts-rate", String(val));
			if (_rateDebounceTimer !== null) clearTimeout(_rateDebounceTimer);
			_rateDebounceTimer = setTimeout(() => {
				this._controller.setRate(val);
			}, 300);
		});

		// Progress bar — click or drag to seek
		const progressBar = requireEl<HTMLElement>(panel, ".tts-progress-bar");
		let _dragging = false;
		let _wasPlayingBeforeDrag = false;

		const seekFromPointer = (e: PointerEvent): number => {
			const rect = progressBar.getBoundingClientRect();
			const fraction = Math.max(
				0,
				Math.min(1, (e.clientX - rect.left) / rect.width),
			);
			// During drag: only update the visual fill, don't restart speech yet
			const pct = Math.round(fraction * 100);
			requireEl<HTMLElement>(panel, "#tts-progress-fill").style.width =
				pct + "%";
			progressBar.setAttribute("aria-valuenow", String(pct));
			return fraction;
		};

		progressBar.addEventListener("pointerdown", (e: PointerEvent) => {
			_dragging = true;
			progressBar.setPointerCapture(e.pointerId);
			_wasPlayingBeforeDrag =
				this._controller.state === "playing" ||
				this._controller.state === "paused";
			// Pause speech during scrub so we don't restart on every pixel
			if (this._controller.state === "playing") {
				this._controller.pause();
			}
			seekFromPointer(e);
		});

		progressBar.addEventListener("pointermove", (e: PointerEvent) => {
			if (!_dragging) return;
			seekFromPointer(e);
		});

		progressBar.addEventListener("pointerup", (e: PointerEvent) => {
			if (!_dragging) return;
			_dragging = false;
			const fraction = seekFromPointer(e);
			// Seek and resume only on release
			if (_wasPlayingBeforeDrag) {
				this._controller.seekToFraction(fraction);
			} else {
				// Update position without starting speech (state is stopped/paused)
				this._controller.seekToFraction(fraction);
			}
		});

		progressBar.addEventListener("pointercancel", () => {
			_dragging = false;
		});

		panel.style.display = "none";
		document.body.appendChild(panel);
		this._panel = panel;
	}

	// ── Voice population ──────────────────────────────────────────────────────

	private _wireVoices(): void {
		const ALLOWED = ["Samantha", "Daniel"];

		const populate = (): void => {
			const select = requireEl<HTMLSelectElement>(this._panel, "#tts-voice");
			const voices = window.speechSynthesis.getVoices();
			if (!voices.length) return;

			const prevValue = select.value;
			select.innerHTML = "";

			// Only show Samantha and Daniel; prefer Enhanced variants if available
			const allowed = ALLOWED.flatMap((name) => {
				const enhanced = voices.find((v) => v.name === `${name} (Enhanced)`);
				const base = voices.find((v) => v.name === name);
				return enhanced ? [enhanced] : base ? [base] : [];
			});

			allowed.forEach((v) => {
				const opt = document.createElement("option");
				opt.value = v.name;
				// voice name and lang are browser-provided metadata, not user input
				const isEnhanced = v.name.includes("Enhanced");
				opt.textContent = `${v.name}${isEnhanced ? " ✦" : ""} (${v.lang})`;
				select.appendChild(opt);
			});

			// Restore from localStorage, then previous in-session selection, then default
			const savedVoice = localStorage.getItem("tts-voice");
			const preferredName = savedVoice || prevValue;
			const preferred = allowed.find((v) => v.name === preferredName);
			if (preferred) {
				select.value = preferred.name;
				if (this._controller instanceof TTSController)
					this._controller.setVoice(preferred);
			} else if (allowed.length) {
				const first = allowed[0];
				if (first) {
					select.value = first.name;
					if (this._controller instanceof TTSController)
						this._controller.setVoice(first);
				}
			}
		};

		// Chrome populates voices asynchronously; Firefox synchronously
		populate();
		window.speechSynthesis.addEventListener("voiceschanged", populate);

		requireEl<HTMLSelectElement>(this._panel, "#tts-voice").addEventListener(
			"change",
			(e) => {
				if (!(this._controller instanceof TTSController)) return;
				const voices = window.speechSynthesis.getVoices();
				const voice = voices.find(
					(v) => v.name === (e.target as HTMLSelectElement).value,
				);
				if (voice) {
					this._controller.setVoice(voice);
					localStorage.setItem("tts-voice", voice.name);
				}
			},
		);
	}

	// ── Voice selector + label visibility ───────────────────────────────────────

	private _setVoiceSelectorVisible(visible: boolean): void {
		const select = this._panel.querySelector<HTMLSelectElement>("#tts-voice");
		const label = this._panel.querySelector<HTMLElement>("#tts-voice-label");
		if (select) select.style.display = visible ? "" : "none";
		if (label) label.style.display = visible ? "none" : "";
	}

	// ── Stale audio warning ───────────────────────────────────────────────────

	private _setStaleWarning(visible: boolean): void {
		const el = this._panel.querySelector<HTMLElement>("#tts-stale-warning");
		if (el) el.style.display = visible ? "" : "none";
	}

	private _checkStaleAudio(note: NoteSearchEntry, fullText: string): void {
		if (!note.hasAudio || !note.audioHash) return;
		const expected = note.audioHash;
		const encoded = new TextEncoder().encode(fullText);
		crypto.subtle
			.digest("SHA-256", encoded)
			.then((buf) => {
				const hex = Array.from(new Uint8Array(buf))
					.map((b) => b.toString(16).padStart(2, "0"))
					.join("");
				this._setStaleWarning(hex !== expected);
			})
			.catch(() => {
				// crypto.subtle unavailable (non-secure context) — skip warning silently
			});
	}

	// ── Keyboard shortcut ─────────────────────────────────────────────────────

	private _wireKeyboard(): void {
		document.addEventListener("keydown", (e) => {
			// Only when player is visible and focus is not on a form element
			if (this._panel.style.display === "none") return;
			if (
				(e.target as Element | null)?.matches("input, textarea, select, button")
			)
				return;
			if (e.metaKey || e.ctrlKey || e.altKey) return;

			if (e.code === "Space") {
				e.preventDefault();
				this._togglePlay();
			}
		});
	}

	// ── Public API ────────────────────────────────────────────────────────────

	/**
	 * Attach the player to a newly rendered note content element.
	 * Selects AudioPlayer when pre-generated audio is available,
	 * otherwise falls back to the Web Speech API (TTSController).
	 */
	attach(contentEl: Element, note: NoteSearchEntry): void {
		this.stop();
		this._controller = this._createEngine(note);
		this._wireEngineCallbacks();

		// Restore saved playback rate on the new engine
		const savedRate = parseFloat(localStorage.getItem("tts-rate") ?? "1");
		this._controller.setRate(savedRate);

		// Apply saved voice when using Web Speech API
		if (this._controller instanceof TTSController) {
			const savedVoice = localStorage.getItem("tts-voice");
			if (savedVoice) {
				const voice = window.speechSynthesis
					.getVoices()
					.find((v) => v.name === savedVoice);
				if (voice) this._controller.setVoice(voice);
			}
		}

		// Show voice selector only for Web Speech API; show static label for AudioPlayer
		this._setVoiceSelectorVisible(this._controller instanceof TTSController);

		// Reset stale warning — recomputed below
		this._setStaleWarning(false);

		const { fullText, segments } = extractSpeechContent(contentEl);
		this._controller.load(fullText, segments);

		// Check for stale audio after text is extracted (non-blocking)
		this._checkStaleAudio(note, fullText);

		this._updateProgress(0);
		this._panel.style.display = "";
	}

	/** Stop playback and hide the panel. */
	detach(): void {
		this.stop();
		this._panel.style.display = "none";
	}

	/** Stop playback (panel stays visible). */
	stop(): void {
		this._controller.stop();
		this._clearHighlight();
		this._updateProgress(0);
	}

	// ── Private ───────────────────────────────────────────────────────────────

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
		// Gently scroll highlighted paragraph into view if it's off-screen
		seg.el.scrollIntoView({ block: "nearest", behavior: "smooth" });
	}

	private _onEnd(): void {
		this._clearHighlight();
		this._updateProgress(1);
		this._updateControls("stopped");
	}

	private _updateProgress(fraction: number): void {
		const fill = this._panel.querySelector<HTMLElement>("#tts-progress-fill");
		const bar = this._panel.querySelector<HTMLElement>(".tts-progress-bar");
		if (!fill) return;
		const pct = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
		fill.style.width = pct + "%";
		bar?.setAttribute("aria-valuenow", String(pct));
	}

	private _clearHighlight(): void {
		if (this._currentHighlightEl) {
			this._currentHighlightEl.classList.remove("tts-highlight");
			this._currentHighlightEl = null;
		}
	}

	private _updateControls(state: TTSState): void {
		const playBtn = requireEl<HTMLButtonElement>(this._panel, "#tts-play");
		const stopBtn = requireEl<HTMLButtonElement>(this._panel, "#tts-stop");
		const restartBtn = requireEl<HTMLButtonElement>(
			this._panel,
			"#tts-restart",
		);
		const backBtn = requireEl<HTMLButtonElement>(this._panel, "#tts-back");
		const fwdBtn = requireEl<HTMLButtonElement>(this._panel, "#tts-forward");
		const icon = requireEl<HTMLElement>(playBtn, ".tts-play-icon");

		const active = state === "playing" || state === "paused";

		if (state === "playing") {
			icon.textContent = "⏸";
			playBtn.setAttribute("aria-label", "Pause");
			playBtn.setAttribute("title", "Pause (Space)");
		} else {
			icon.textContent = "▶";
			playBtn.setAttribute("aria-label", "Play");
			playBtn.setAttribute("title", "Play / Pause (Space)");
		}

		stopBtn.disabled = !active;
		restartBtn.disabled = !active;
		backBtn.disabled = !active;
		fwdBtn.disabled = !active;
	}
}

// Singleton — one player instance shared across the whole app
export const ttsPlayer = new TTSPlayer();
