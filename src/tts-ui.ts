/* ═══════════════════════════════════════════
   tts-ui.ts — Floating "Read Aloud" player UI
   ═══════════════════════════════════════════ */

import { extractSpeechContent, TTSController } from "./tts.js";
import type { SpeechSegment, TTSState } from "./types.js";

class TTSPlayer {
	// ── Field declarations (required by TypeScript strict mode) ──
	private _controller: TTSController;
	private _panel!: HTMLDivElement; // definite assignment: set by _buildPanel() in constructor
	private _currentHighlightEl: Element | null;

	constructor() {
		this._controller = new TTSController();
		this._currentHighlightEl = null;
		this._buildPanel();
		this._wireVoices();
		this._wireKeyboard();

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

		panel
			.querySelector<HTMLButtonElement>("#tts-restart")!
			.addEventListener("click", () => {
				this._controller.seekToSegment(0);
			});
		panel
			.querySelector<HTMLButtonElement>("#tts-back")!
			.addEventListener("click", () => {
				this._controller.skipBack();
			});
		panel
			.querySelector<HTMLButtonElement>("#tts-play")!
			.addEventListener("click", () => {
				this._togglePlay();
			});
		panel
			.querySelector<HTMLButtonElement>("#tts-forward")!
			.addEventListener("click", () => {
				this._controller.skipForward();
			});
		panel
			.querySelector<HTMLButtonElement>("#tts-stop")!
			.addEventListener("click", () => {
				this.stop();
			});
		panel
			.querySelector<HTMLButtonElement>("#tts-close")!
			.addEventListener("click", () => {
				this.detach();
			});

		const rateInput = panel.querySelector<HTMLInputElement>("#tts-rate")!;
		const rateLabel = panel.querySelector<HTMLElement>("#tts-rate-label")!;

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
		const progressBar = panel.querySelector<HTMLElement>(".tts-progress-bar")!;
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
			panel.querySelector<HTMLElement>("#tts-progress-fill")!.style.width =
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
			const select =
				this._panel.querySelector<HTMLSelectElement>("#tts-voice")!;
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
				this._controller.setVoice(preferred);
			} else if (allowed.length) {
				select.value = allowed[0].name;
				this._controller.setVoice(allowed[0]);
			}
		};

		// Chrome populates voices asynchronously; Firefox synchronously
		populate();
		window.speechSynthesis.addEventListener("voiceschanged", populate);

		this._panel
			.querySelector<HTMLSelectElement>("#tts-voice")!
			.addEventListener("change", (e) => {
				const voices = window.speechSynthesis.getVoices();
				const voice = voices.find(
					(v) => v.name === (e.target as HTMLSelectElement).value,
				);
				if (voice) {
					this._controller.setVoice(voice);
					localStorage.setItem("tts-voice", voice.name);
				}
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
	 * Stops any in-progress speech and shows the panel.
	 */
	attach(contentEl: Element): void {
		this.stop();
		const { fullText, segments } = extractSpeechContent(contentEl);
		this._controller.load(fullText, segments);
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
		const playBtn = this._panel.querySelector<HTMLButtonElement>("#tts-play")!;
		const stopBtn = this._panel.querySelector<HTMLButtonElement>("#tts-stop")!;
		const restartBtn =
			this._panel.querySelector<HTMLButtonElement>("#tts-restart")!;
		const backBtn = this._panel.querySelector<HTMLButtonElement>("#tts-back")!;
		const fwdBtn =
			this._panel.querySelector<HTMLButtonElement>("#tts-forward")!;
		const icon = playBtn.querySelector<HTMLElement>(".tts-play-icon")!;

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
