import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FetchError, fetchUrl } from "../scripts/agent/fetch.ts";

// ── fetchUrl ───────────────────────────────────────────────────────────────

describe("fetchUrl", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// ── Protocol validation ──────────────────────────────────────────────

	it("throws FetchError for an http: URL", async () => {
		await expect(fetchUrl("http://example.com")).rejects.toThrow(FetchError);
		await expect(fetchUrl("http://example.com")).rejects.toThrow(
			/Unsupported protocol/,
		);
	});

	it("throws FetchError for a file: URL", async () => {
		await expect(fetchUrl("file:///etc/passwd")).rejects.toThrow(FetchError);
	});

	it("throws FetchError for a javascript: URL", async () => {
		await expect(fetchUrl("javascript:alert(1)")).rejects.toThrow(FetchError);
	});

	it("throws FetchError for a data: URL", async () => {
		await expect(fetchUrl("data:text/html,hi")).rejects.toThrow(FetchError);
	});

	it("throws FetchError for a completely invalid URL", async () => {
		await expect(fetchUrl("not-a-url")).rejects.toThrow(FetchError);
		await expect(fetchUrl("not-a-url")).rejects.toThrow(/Invalid URL/);
	});

	// ── Successful fetch ─────────────────────────────────────────────────

	it("returns html, url, and statusCode on a 200 response", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			new Response("<html>ok</html>", { status: 200 }),
		);

		const result = await fetchUrl("https://example.com");

		expect(result.url).toBe("https://example.com");
		expect(result.html).toBe("<html>ok</html>");
		expect(result.statusCode).toBe(200);
	});

	// ── HTTP error responses ─────────────────────────────────────────────

	it("throws FetchError immediately on a 404 response (no retry)", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response("Not Found", { status: 404, statusText: "Not Found" }),
		);

		await expect(fetchUrl("https://example.com")).rejects.toThrow(FetchError);
		await expect(fetchUrl("https://example.com")).rejects.toThrow(/HTTP 404/);
		// 404 is a FetchError — should not retry
		expect(fetch).toHaveBeenCalledTimes(2); // one per fetchUrl call
	});

	it("throws FetchError on a 500 response", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response("Server Error", {
				status: 500,
				statusText: "Internal Server Error",
			}),
		);

		await expect(fetchUrl("https://example.com")).rejects.toThrow(/HTTP 500/);
	});

	// ── Retry behaviour ───────────────────────────────────────────────────

	it("retries on network error and succeeds on the second attempt", async () => {
		vi.mocked(fetch)
			.mockRejectedValueOnce(new TypeError("Network failure"))
			.mockResolvedValueOnce(
				new Response("<html>retry ok</html>", { status: 200 }),
			);

		// Avoid real timers in retry delay
		vi.useFakeTimers();
		const promise = fetchUrl("https://example.com");
		await vi.runAllTimersAsync();
		const result = await promise;

		expect(result.html).toBe("<html>retry ok</html>");
		expect(fetch).toHaveBeenCalledTimes(2);
		vi.useRealTimers();
	});

	it("fails after exhausting all retries on persistent network error", async () => {
		vi.mocked(fetch).mockRejectedValue(new TypeError("Network failure"));

		vi.useFakeTimers();
		const promise = fetchUrl("https://example.com");
		// Register rejection handler before timers fire to avoid unhandled rejection warnings
		const assertion = expect(promise).rejects.toThrow(FetchError);
		await vi.runAllTimersAsync();
		vi.useRealTimers();

		await assertion;
		// 1 initial + 2 retries = 3 total calls
		expect(fetch).toHaveBeenCalledTimes(3);
	});

	// ── Timeout ───────────────────────────────────────────────────────────

	it("throws FetchError with timeout message when the request is aborted", async () => {
		vi.mocked(fetch).mockRejectedValue(
			Object.assign(new Error("The operation was aborted"), {
				name: "AbortError",
			}),
		);

		const err = await fetchUrl("https://example.com").catch((e: unknown) => e);
		expect(err).toBeInstanceOf(FetchError);
		expect((err as FetchError).message).toMatch(/timed out/);
	});
});
