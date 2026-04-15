import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotesManifest } from "../src/types.ts";

// ── Helpers ───────────────────────────────────────────────────────────────

const ROOT = join(import.meta.dirname ?? process.cwd(), "..");

/** Read the generated manifest from disk (built by build-manifest.ts). */
function readManifest(): NotesManifest {
	const raw = readFileSync(
		join(ROOT, "public", "notes-manifest.json"),
		"utf-8",
	);
	return JSON.parse(raw) as NotesManifest;
}

/** Slugs of all .md files directly in notes/ (excludes subdirectories like drafts/). */
function diskSlugs(): Set<string> {
	return new Set(
		readdirSync(join(ROOT, "notes"), { withFileTypes: true })
			.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
			.map((entry) => entry.name.replace(/\.md$/, "")),
	);
}

// ── Manifest structural integrity ─────────────────────────────────────────

describe("notes-manifest.json structure", () => {
	it("has a non-empty version string", () => {
		const manifest = readManifest();
		expect(typeof manifest.version).toBe("string");
		expect(manifest.version.length).toBeGreaterThan(0);
	});

	it("has a non-empty notes array", () => {
		const manifest = readManifest();
		expect(Array.isArray(manifest.notes)).toBe(true);
		expect(manifest.notes.length).toBeGreaterThan(0);
	});

	it("every entry has id, slug, emoji, title, tags, and content fields", () => {
		const manifest = readManifest();
		for (const note of manifest.notes) {
			expect(typeof note.id, `id missing for ${note.slug}`).toBe("string");
			expect(typeof note.slug, `slug missing for ${note.id}`).toBe("string");
			expect(typeof note.emoji, `emoji missing for ${note.id}`).toBe("string");
			expect(typeof note.title, `title missing for ${note.id}`).toBe("string");
			expect(Array.isArray(note.tags), `tags not array for ${note.id}`).toBe(
				true,
			);
			expect(typeof note.content, `content missing for ${note.id}`).toBe(
				"string",
			);
		}
	});
});

// ── No duplicate IDs ──────────────────────────────────────────────────────

describe("note IDs", () => {
	it("no two notes share the same id", () => {
		const manifest = readManifest();
		const ids = manifest.notes.map((n) => n.id);
		const unique = new Set(ids);
		expect(unique.size).toBe(ids.length);
	});

	it("no two notes share the same slug", () => {
		const manifest = readManifest();
		const slugs = manifest.notes.map((n) => n.slug);
		const unique = new Set(slugs);
		expect(unique.size).toBe(slugs.length);
	});

	it("ids follow the pattern 'note-NN'", () => {
		const manifest = readManifest();
		for (const note of manifest.notes) {
			expect(note.id, `unexpected id format: ${note.id}`).toMatch(/^note-\d+$/);
		}
	});
});

// ── Every manifest note has a matching .md file ───────────────────────────

describe("note file presence", () => {
	it("every note in the manifest has a corresponding .md file in notes/", () => {
		const manifest = readManifest();
		const onDisk = diskSlugs();
		for (const note of manifest.notes) {
			expect(onDisk.has(note.slug), `Missing notes/${note.slug}.md`).toBe(true);
		}
	});

	it("every .md file in notes/ has a corresponding entry in the manifest", () => {
		const manifest = readManifest();
		const manifestSlugs = new Set(manifest.notes.map((n) => n.slug));
		for (const slug of diskSlugs()) {
			expect(manifestSlugs.has(slug), `${slug}.md has no manifest entry`).toBe(
				true,
			);
		}
	});
});

// ── initData populates NOTES and SEARCH_ENTRIES ───────────────────────────

describe("initData", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("populates NOTES and SEARCH_ENTRIES from fetched manifest", async () => {
		const sampleManifest: NotesManifest = {
			version: "sha256-test",
			notes: [
				{
					id: "note-01",
					slug: "01-test",
					emoji: "📝",
					title: "Test Note",
					tags: ["ai"],
					content: "test content",
				},
			],
		};

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => sampleManifest,
			}),
		);

		// Re-import the module fresh to avoid stale cached state
		const { initData } = await import("../src/data.ts");
		await initData();

		// After initData the module-level arrays are populated
		const { NOTES: N, SEARCH_ENTRIES: SE } = await import("../src/data.ts");
		expect(N.length).toBe(1);
		expect(N[0]!.id).toBe("note-01");
		expect(SE.length).toBe(1);
		expect(SE[0]!.content).toBe("test content");
	});

	it("throws when the manifest fetch fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: false, status: 404 }),
		);

		const { initData } = await import("../src/data.ts");
		await expect(initData()).rejects.toThrow("404");
	});
});
