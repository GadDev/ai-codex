/**
 * save.ts — Persist a validated note to /notes/drafts/.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const DRAFTS_DIR = resolve(join(ROOT, "notes", "drafts"));

export interface SaveResult {
	readonly filePath: string;
}

export class SaveError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SaveError";
	}
}

/**
 * Assert the slug is safe and the resolved path stays inside DRAFTS_DIR.
 * Rejects slugs containing `..`, `/`, `\`, or null bytes.
 */
function assertSafePath(slug: string, resolvedPath: string): void {
	if (/(\.\.|\/|\\|\0)/.test(slug)) {
		throw new SaveError(
			`Unsafe slug "${slug}": contains path traversal sequences`,
		);
	}
	if (
		!resolvedPath.startsWith(`${DRAFTS_DIR}/`) &&
		resolvedPath !== DRAFTS_DIR
	) {
		throw new SaveError(
			`Path traversal detected: resolved path is outside the drafts directory`,
		);
	}
}

/**
 * Write a Markdown note to /notes/drafts/{slug}.md.
 * - Rejects slugs containing path traversal sequences.
 * - Resolves the final path and asserts it remains inside DRAFTS_DIR.
 * - Never overwrites an existing file.
 * - Creates the drafts directory if it does not exist.
 */
export async function saveDraft(
	slug: string,
	markdown: string,
): Promise<SaveResult> {
	const targetPath = resolve(join(DRAFTS_DIR, `${slug}.md`));

	assertSafePath(slug, targetPath);

	if (!existsSync(DRAFTS_DIR)) {
		mkdirSync(DRAFTS_DIR, { recursive: true });
	}

	if (existsSync(targetPath)) {
		throw new SaveError(
			`File already exists: "${targetPath}". Will not overwrite.`,
		);
	}

	writeFileSync(targetPath, markdown, "utf-8");

	return { filePath: targetPath };
}
