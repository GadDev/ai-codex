import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateMp3 } from "../../scripts/audio/tts-openai.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AUDIO_DIR = path.resolve(
	new URL("../../public/audio", import.meta.url).pathname,
);

function validMp3Buffer(): Buffer {
	// 2 kB of zeros — passes the MIN_VALID_BYTES check
	return Buffer.alloc(2048, 0);
}

function mockFetchOk(body: Buffer, contentType = "audio/mpeg"): void {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			headers: { get: (_: string) => contentType },
			arrayBuffer: () => Promise.resolve(body.buffer),
			text: () => Promise.resolve(""),
		}),
	);
}

function mockFetchError(status: number, bodyText: string): void {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			ok: false,
			status,
			headers: { get: () => null },
			arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
			text: () => Promise.resolve(bodyText),
		}),
	);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generateMp3", () => {
	const validOutput = path.join(AUDIO_DIR, "test-note.mp3");

	beforeEach(() => {
		process.env.OPENAI_API_KEY = "sk-test-key";
		// Prevent any actual file writes
		vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
		vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);
		vi.spyOn(fs, "existsSync").mockReturnValue(false);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		delete process.env.OPENAI_API_KEY;
	});

	it("throws if OPENAI_API_KEY is not set", async () => {
		delete process.env.OPENAI_API_KEY;
		await expect(generateMp3("hello", validOutput)).rejects.toThrow(
			"OPENAI_API_KEY is not set",
		);
	});

	it("rejects a path outside public/audio/ (path traversal)", async () => {
		mockFetchOk(validMp3Buffer());
		const traversalPath = path.join(AUDIO_DIR, "..", "..", "notes", "evil.mp3");
		await expect(generateMp3("hello", traversalPath)).rejects.toThrow(
			"Path traversal rejected",
		);
	});

	it("rejects an absolute path unrelated to public/audio/", async () => {
		mockFetchOk(validMp3Buffer());
		await expect(generateMp3("hello", "/tmp/evil.mp3")).rejects.toThrow(
			"Path traversal rejected",
		);
	});

	it("throws if output file already exists and force is not set", async () => {
		vi.spyOn(fs, "existsSync").mockReturnValue(true);
		mockFetchOk(validMp3Buffer());
		await expect(generateMp3("hello", validOutput)).rejects.toThrow(
			"already exists",
		);
	});

	it("overwrites existing file when force is true", async () => {
		vi.spyOn(fs, "existsSync").mockReturnValue(true);
		mockFetchOk(validMp3Buffer());
		await expect(
			generateMp3("hello", validOutput, { force: true }),
		).resolves.toBeUndefined();
	});

	it("throws when API returns a non-ok status", async () => {
		mockFetchError(401, '{"error":"invalid API key"}');
		await expect(generateMp3("hello", validOutput)).rejects.toThrow(
			"OpenAI TTS API error (401)",
		);
	});

	it("throws when Content-Type is not audio/mpeg", async () => {
		mockFetchOk(validMp3Buffer(), "application/json");
		await expect(generateMp3("hello", validOutput)).rejects.toThrow(
			"Unexpected Content-Type",
		);
	});

	it("throws when response body is below 1 kB", async () => {
		mockFetchOk(Buffer.alloc(512, 0));
		await expect(generateMp3("hello", validOutput)).rejects.toThrow(
			"too small",
		);
	});

	it("sends correct Authorization header", async () => {
		mockFetchOk(validMp3Buffer());
		await generateMp3("hello", validOutput);
		const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
			string,
			RequestInit,
		];
		expect((init.headers as Record<string, string>)["Authorization"]).toBe(
			"Bearer sk-test-key",
		);
	});

	it("sends correct Content-Type header", async () => {
		mockFetchOk(validMp3Buffer());
		await generateMp3("hello", validOutput);
		const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
			string,
			RequestInit,
		];
		expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
			"application/json",
		);
	});

	it("uses tts-1-hd model and ash voice by default", async () => {
		mockFetchOk(validMp3Buffer());
		await generateMp3("hello", validOutput);
		const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
			string,
			RequestInit,
		];
		const body = JSON.parse(init.body as string);
		expect(body.model).toBe("tts-1-hd");
		expect(body.voice).toBe("ash");
	});

	it("respects custom voice and model options", async () => {
		mockFetchOk(validMp3Buffer());
		await generateMp3("hello", validOutput, { voice: "nova", model: "tts-1" });
		const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
			string,
			RequestInit,
		];
		const body = JSON.parse(init.body as string);
		expect(body.voice).toBe("nova");
		expect(body.model).toBe("tts-1");
	});

	it("writes the buffer to the resolved output path on success", async () => {
		mockFetchOk(validMp3Buffer());
		await generateMp3("hello", validOutput);
		expect(fs.writeFileSync).toHaveBeenCalledWith(
			path.resolve(validOutput),
			expect.any(Buffer),
		);
	});
});
