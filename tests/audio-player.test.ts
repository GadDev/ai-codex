import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioPlayer } from "../src/audio-player.ts";
import type { SpeechSegment } from "../src/types.ts";

// ── HTMLAudioElement mock ─────────────────────────────────────────────────────

interface AudioEventMap {
	ended: Event;
	error: Event;
	timeupdate: Event;
}

type AudioListener = (e: Event) => void;

function makeAudioMock() {
	const listeners: Partial<Record<keyof AudioEventMap, AudioListener[]>> = {};

	const audio = {
		src: "",
		preload: "",
		currentTime: 0,
		duration: 100,
		playbackRate: 1,
		paused: true,
		ended: false,

		play: vi.fn().mockResolvedValue(undefined),
		pause: vi.fn().mockImplementation(() => {
			audio.paused = true;
		}),
		load: vi.fn(),

		addEventListener: vi.fn((event: keyof AudioEventMap, fn: AudioListener) => {
			if (!listeners[event]) listeners[event] = [];
			listeners[event]!.push(fn);
		}),

		/** Fire a synthetic event on the mock. */
		_emit(event: keyof AudioEventMap) {
			for (const fn of listeners[event] ?? []) fn(new Event(event));
		},
	};

	return audio;
}

// ── Minimal segments for tests ────────────────────────────────────────────────

function makeSeg(
	text: string,
	charStart: number,
	tagName = "P",
): SpeechSegment {
	const el = document.createElement(tagName);
	el.textContent = text;
	return { text, el, charStart, charEnd: charStart + text.length - 1 };
}

const FULL_TEXT = "Hello world. Second segment.";
const SEGMENTS: SpeechSegment[] = [
	makeSeg("Hello world.", 0),
	makeSeg("Second segment.", 13),
];

// ── Patch Audio constructor ───────────────────────────────────────────────────

let audioMock: ReturnType<typeof makeAudioMock>;

vi.stubGlobal(
	"Audio",
	vi.fn().mockImplementation(() => {
		audioMock = makeAudioMock();
		return audioMock;
	}),
);

// Suppress fetch for words.json — AudioPlayer loads it eagerly but tests don't need it
vi.stubGlobal(
	"fetch",
	vi.fn().mockRejectedValue(new Error("no fetch in tests")),
);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AudioPlayer", () => {
	let player: AudioPlayer;

	beforeEach(() => {
		player = new AudioPlayer("01-ai-fluency-framework");
		player.load(FULL_TEXT, SEGMENTS);
	});

	it("starts in stopped state", () => {
		expect(player.state).toBe("stopped");
	});

	describe("onStateChange", () => {
		it("fires 'playing' when play() resolves", async () => {
			const states: string[] = [];
			player.onStateChange((s) => states.push(s));

			await player.play();

			expect(states).toContain("playing");
		});

		it("fires 'paused' when pause() is called while playing", async () => {
			const states: string[] = [];
			player.onStateChange((s) => states.push(s));

			await player.play();
			player.pause();

			expect(states).toContain("paused");
		});

		it("fires 'stopped' when stop() is called", async () => {
			const states: string[] = [];
			player.onStateChange((s) => states.push(s));

			await player.play();
			player.stop();

			expect(states).toContain("stopped");
		});

		it("fires 'stopped' when audio 'ended' event fires", async () => {
			const states: string[] = [];
			player.onStateChange((s) => states.push(s));

			await player.play();
			audioMock._emit("ended");

			expect(states[states.length - 1]).toBe("stopped");
		});

		it("fires 'stopped' on audio error event", async () => {
			const states: string[] = [];
			player.onStateChange((s) => states.push(s));
			// expose audio.error to avoid console spam
			Object.defineProperty(audioMock, "error", {
				value: { message: "mock error" },
			});

			await player.play();
			audioMock._emit("error");

			expect(states[states.length - 1]).toBe("stopped");
		});
	});

	describe("onEnd", () => {
		it("fires when audio 'ended' event fires", async () => {
			const onEnd = vi.fn();
			player.onEnd(onEnd);

			await player.play();
			audioMock._emit("ended");

			expect(onEnd).toHaveBeenCalledOnce();
		});

		it("fires on audio error", async () => {
			const onEnd = vi.fn();
			player.onEnd(onEnd);
			Object.defineProperty(audioMock, "error", {
				value: { message: "mock error" },
			});

			await player.play();
			audioMock._emit("error");

			expect(onEnd).toHaveBeenCalledOnce();
		});
	});

	describe("onProgress", () => {
		it("fires with current time fraction on timeupdate", async () => {
			const progress: number[] = [];
			player.onProgress((p) => progress.push(p));

			await player.play();
			audioMock.currentTime = 50; // duration is 100
			audioMock._emit("timeupdate");

			expect(progress).toContain(0.5);
		});

		it("does not fire if duration is 0", async () => {
			const progress = vi.fn();
			player.onProgress(progress);
			audioMock.duration = 0;

			await player.play();
			audioMock._emit("timeupdate");

			expect(progress).not.toHaveBeenCalled();
		});
	});

	describe("seekToFraction", () => {
		it("sets currentTime proportionally to duration", () => {
			player.seekToFraction(0.5);
			expect(audioMock.currentTime).toBe(50); // 0.5 * 100
		});

		it("clamps to 0", () => {
			player.seekToFraction(-1);
			expect(audioMock.currentTime).toBe(0);
		});

		it("clamps to duration", () => {
			player.seekToFraction(2);
			expect(audioMock.currentTime).toBe(100);
		});

		it("does nothing if duration is 0", () => {
			audioMock.duration = 0;
			audioMock.currentTime = 30;
			player.seekToFraction(0.5);
			expect(audioMock.currentTime).toBe(30); // unchanged
		});
	});

	describe("seekToSegment", () => {
		it("seeks to the fractional position of the segment's charStart", () => {
			// SEGMENTS[1].charStart = 13, FULL_TEXT.length = 28
			// expected fraction ≈ 13/28 ≈ 0.464 → currentTime ≈ 46.4
			player.seekToSegment(1);
			expect(audioMock.currentTime).toBeCloseTo((13 / 28) * 100, 1);
		});

		it("clamps to first segment for index 0", () => {
			player.seekToSegment(0);
			expect(audioMock.currentTime).toBe(0);
		});
	});

	describe("setRate", () => {
		it("sets playbackRate immediately without restarting", () => {
			player.setRate(1.5);
			expect(audioMock.playbackRate).toBe(1.5);
		});

		it("returns this for chaining", () => {
			expect(player.setRate(2)).toBe(player);
		});
	});

	describe("stop", () => {
		it("resets currentTime to 0 and pauses", async () => {
			await player.play();
			audioMock.currentTime = 50;
			player.stop();

			expect(audioMock.pause).toHaveBeenCalled();
			expect(audioMock.currentTime).toBe(0);
			expect(player.state).toBe("stopped");
		});
	});

	describe("pause", () => {
		it("does nothing when already stopped", () => {
			player.pause(); // state is stopped
			expect(player.state).toBe("stopped");
		});

		it("pauses audio and transitions to paused", async () => {
			await player.play();
			player.pause();
			expect(audioMock.pause).toHaveBeenCalled();
			expect(player.state).toBe("paused");
		});
	});

	describe("builder methods", () => {
		it("onBoundary returns this", () => {
			expect(player.onBoundary(() => {})).toBe(player);
		});
		it("onEnd returns this", () => {
			expect(player.onEnd(() => {})).toBe(player);
		});
		it("onStateChange returns this", () => {
			expect(player.onStateChange(() => {})).toBe(player);
		});
		it("onProgress returns this", () => {
			expect(player.onProgress(() => {})).toBe(player);
		});
	});
});
