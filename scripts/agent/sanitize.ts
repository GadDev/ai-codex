/**
 * sanitize.ts — Strip unsafe HTML, extract readable plain text.
 * Uses jsdom for DOM parsing — all input is treated as untrusted.
 */

import { JSDOM } from "jsdom";

export interface SanitizeResult {
	readonly title: string;
	readonly text: string;
}

/** HTML tags that must be removed entirely before any content extraction. */
const UNSAFE_TAGS = [
	"script",
	"style",
	"iframe",
	"object",
	"embed",
	"noscript",
	"template",
	"svg",
] as const;

function removeUnsafeTags(document: Document): void {
	for (const tag of UNSAFE_TAGS) {
		for (const el of document.querySelectorAll(tag)) {
			el.remove();
		}
	}
}

function removeUnsafeAttributes(document: Document): void {
	for (const el of document.querySelectorAll("*")) {
		for (const attr of [...el.attributes]) {
			const isEventHandler = attr.name.startsWith("on");
			const isJavascriptHref =
				attr.name === "href" &&
				attr.value.trim().toLowerCase().startsWith("javascript:");
			const isSrcDataUrl =
				attr.name === "src" &&
				attr.value.trim().toLowerCase().startsWith("data:");

			if (isEventHandler || isJavascriptHref || isSrcDataUrl) {
				el.removeAttribute(attr.name);
			}
		}
	}
}

function extractTitle(document: Document): string {
	return (
		document.querySelector("title")?.textContent?.trim() ??
		document.querySelector("h1")?.textContent?.trim() ??
		"Untitled"
	);
}

/**
 * Find the most semantically relevant content container.
 * Priority: <article> → <main> → [role="main"] → <body>
 */
function extractContentElement(document: Document): Element {
	return (
		document.querySelector("article") ??
		document.querySelector("main") ??
		document.querySelector('[role="main"]') ??
		document.body
	);
}

function normalizeWhitespace(text: string): string {
	return text.replace(/\s+/g, " ").trim();
}

/**
 * Sanitize raw HTML and extract readable plain text.
 * - Removes all script, style, iframe, object, embed, noscript, template, and svg tags.
 * - Strips inline event handlers, javascript: hrefs, and data: src attributes.
 * - Extracts the most relevant content area (article > main > body).
 * - Returns normalized plain text and the page title.
 * - Treats all HTML input as untrusted data.
 */
export function sanitizeHtml(html: string, _sourceUrl: string): SanitizeResult {
	const { document } = new JSDOM(html, {
		runScripts: "outside-only",
		resources: "usable",
	}).window;

	const title = extractTitle(document);

	removeUnsafeTags(document);
	removeUnsafeAttributes(document);

	const contentEl = extractContentElement(document);
	const text = normalizeWhitespace(contentEl.textContent ?? "");

	return { title, text };
}
