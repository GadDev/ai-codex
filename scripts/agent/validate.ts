/**
 * validate.ts — Verify a formatted Markdown note meets quality and safety standards.
 */

import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const NOTES_DIR = join(ROOT, "notes");
const DRAFTS_DIR = join(ROOT, "notes", "drafts");

/** Minimum total character count for all section content combined. */
const MIN_CONTENT_LENGTH = 200;

/** Required frontmatter keys. */
const REQUIRED_FM_KEYS = ["id", "slug", "title", "tags", "emoji"] as const;

/** Required section headings in the note body. */
const REQUIRED_SECTIONS = [
	"## Overview",
	"## Key Concepts",
	"## Practical Examples",
	"## Why It Matters",
	"## My Takeaways",
	"## References",
] as const;

/** Patterns that indicate unsafe or malformed content. */
const UNSAFE_PATTERNS: RegExp[] = [
	/<script[\s>]/i,
	/<iframe[\s>]/i,
	/javascript\s*:/i,
	/on\w+\s*=/i, // inline event handlers
	/\.\.\//, // path traversal sequences
];

export interface ValidationResult {
	readonly valid: boolean;
	readonly errors: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parseFrontmatterBlock(
	markdown: string,
): Record<string, string> | null {
	const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return null;

	const result: Record<string, string> = {};
	for (const line of (match[1] ?? "").split("\n")) {
		const idx = line.indexOf(":");
		if (idx > 0) {
			result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
		}
	}
	return result;
}

function existingSlugs(): Set<string> {
	const slugs = new Set<string>();

	for (const dir of [NOTES_DIR, DRAFTS_DIR]) {
		let files: string[];
		try {
			files = readdirSync(dir);
		} catch {
			// Directory may not exist yet — that's fine
			continue;
		}
		for (const f of files) {
			if (f.endsWith(".md")) slugs.add(f.slice(0, -3));
		}
	}
	return slugs;
}

function bodyContent(markdown: string): string {
	return markdown.replace(/^---[\s\S]*?---\r?\n/, "").trim();
}

// ── Checks ─────────────────────────────────────────────────────────────────

function checkFrontmatter(
	markdown: string,
	errors: string[],
): Record<string, string> | null {
	const fm = parseFrontmatterBlock(markdown);
	if (!fm) {
		errors.push("Missing or malformed YAML frontmatter block");
		return null;
	}
	for (const key of REQUIRED_FM_KEYS) {
		if (!fm[key] || fm[key].trim() === "") {
			errors.push(`Frontmatter missing required field: "${key}"`);
		}
	}
	return fm;
}

function checkSlugUniqueness(slug: string, errors: string[]): void {
	const known = existingSlugs();
	if (known.has(slug)) {
		errors.push(`Slug "${slug}" already exists in /notes or /notes/drafts`);
	}
}

function checkSlugFormat(slug: string, errors: string[]): void {
	if (!/^[a-z0-9-]+$/.test(slug)) {
		errors.push(
			`Slug "${slug}" contains invalid characters — use lowercase letters, digits, and hyphens only`,
		);
	}
}

function checkSections(markdown: string, errors: string[]): void {
	const body = bodyContent(markdown);
	for (const heading of REQUIRED_SECTIONS) {
		if (!body.includes(heading)) {
			errors.push(`Missing required section: "${heading}"`);
		}
	}
}

function checkContentLength(markdown: string, errors: string[]): void {
	const body = bodyContent(markdown);
	// Strip headings and horizontal rules to measure actual content
	const contentOnly = body
		.replace(/^#{1,6}\s.*$/gm, "")
		.replace(/^---\s*$/gm, "")
		.trim();
	if (contentOnly.length < MIN_CONTENT_LENGTH) {
		errors.push(
			`Content too short: ${contentOnly.length} chars (minimum ${MIN_CONTENT_LENGTH})`,
		);
	}
}

function checkUnsafePatterns(markdown: string, errors: string[]): void {
	for (const pattern of UNSAFE_PATTERNS) {
		if (pattern.test(markdown)) {
			errors.push(
				`Unsafe content detected matching pattern: ${pattern.source}`,
			);
		}
	}
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Validate a Markdown note before it is written to disk.
 * Checks:
 * - Valid YAML frontmatter (id, slug, title, tags, emoji present)
 * - Slug format (lowercase-hyphenated)
 * - Slug uniqueness against existing notes and drafts
 * - All required section headings present
 * - Minimum content length
 * - Absence of unsafe content patterns
 */
export async function validateNote(
	markdown: string,
): Promise<ValidationResult> {
	const errors: string[] = [];

	const fm = checkFrontmatter(markdown, errors);

	if (fm?.["slug"]) {
		checkSlugFormat(fm["slug"], errors);
		checkSlugUniqueness(fm["slug"], errors);
	}

	checkSections(markdown, errors);
	checkContentLength(markdown, errors);
	checkUnsafePatterns(markdown, errors);

	return { valid: errors.length === 0, errors };
}
