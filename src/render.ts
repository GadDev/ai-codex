/* ═══════════════════════════════════════════
   render.ts — All DOM render functions
   These functions are the only place that writes to the DOM.
   They receive `onNoteClick` as an explicit dependency so this
   module never imports from navigation.ts (avoids circular deps).
   ═══════════════════════════════════════════ */

import type { FuseResult } from "fuse.js";
import { NOTES } from "./data.js";
import { getState } from "./state.js";
import type { NoteMetadata, NoteSearchEntry } from "./types.js";
import {
	categorizeNotes,
	getNoteContent,
	readingTime,
	scoreRelatedness,
} from "./utils.js";

// ── Sidebar nav ──

/**
 * Render the full topic list in the sidebar.
 */
export function renderNav(
	notes: readonly NoteMetadata[],
	onNoteClick: (id: string) => void,
): void {
	const navList = document.getElementById("nav-list")!;
	const label = document.getElementById("nav-section-label")!;

	label.textContent = "Topics";
	navList.innerHTML = "";

	if (notes.length === 0) {
		navList.innerHTML =
			'<div class="search-empty">No notes found.<br>Try a different search.</div>';
		return;
	}

	const { activeNoteId } = getState();

	notes.forEach((note) => {
		const mins = readingTime(
			getNoteContent(note.id.replace(/^note-/, "content-")),
		);
		const item = document.createElement("div");
		item.className = "nav-item" + (note.id === activeNoteId ? " active" : "");
		item.dataset.noteId = note.id;
		item.innerHTML = `
      <span class="nav-emoji">${note.emoji}</span>
      <span class="nav-text">
        <span class="nav-title">${note.title}</span>
        <span class="nav-read-time">${mins} min read</span>
      </span>
    `;
		item.addEventListener("click", () => onNoteClick(note.id));
		navList.appendChild(item);
	});
}

/**
 * Render search results in the sidebar.
 */
export function renderSearchResults(
	results: Array<FuseResult<NoteSearchEntry>>,
	onNoteClick: (id: string) => void,
): void {
	const navList = document.getElementById("nav-list")!;
	const label = document.getElementById("nav-section-label")!;

	label.textContent = `Results (${results.length})`;
	navList.innerHTML = "";

	if (results.length === 0) {
		navList.innerHTML =
			'<div class="search-empty">No notes found.<br>Try a different search.</div>';
		return;
	}

	results.forEach(({ item }) => {
		const content = getNoteContent(item.id.replace(/^note-/, "content-"));
		const excerpt =
			content
				.replace(/[#*`>\-|]/g, " ")
				.split(/\s+/)
				.filter((w) => w.length > 2)
				.slice(0, 20)
				.join(" ") + "…";

		const el = document.createElement("div");
		el.className = "search-result-item";
		el.dataset.noteId = item.id;

		const titleEl = document.createElement("div");
		titleEl.className = "search-result-title";
		titleEl.textContent = `${item.emoji} ${item.title}`;

		const excerptEl = document.createElement("div");
		excerptEl.className = "search-result-excerpt";
		excerptEl.textContent = excerpt;

		el.appendChild(titleEl);
		el.appendChild(excerptEl);
		el.addEventListener("click", () => onNoteClick(item.id));
		navList.appendChild(el);
	});
}

// ── Welcome grid ──

/**
 * Populate the welcome screen with categorized note lists.
 */
export function renderWelcomeGrid(onNoteClick: (id: string) => void): void {
	const grid = document.getElementById("welcome-grid")!;
	grid.innerHTML = "";

	const categories = categorizeNotes(NOTES);

	categories.forEach((cat) => {
		// Category header
		const categoryHeader = document.createElement("div");
		categoryHeader.className = "category-header";
		categoryHeader.innerHTML = `
      <h2 class="category-title">${cat.name}</h2>
      <p class="category-description">${cat.description}</p>
    `;
		grid.appendChild(categoryHeader);

		// List of notes in this category
		const notesList = document.createElement("div");
		notesList.className = "category-list";
		cat.notes.forEach((note) => {
			const noteItem = document.createElement("div");
			noteItem.className = "note-item";
			noteItem.textContent = note.title;
			noteItem.addEventListener("click", () => onNoteClick(note.id));
			notesList.appendChild(noteItem);
		});
		grid.appendChild(notesList);
	});
}

// ── Section nav (sidebar sub-items below the active note) ──

/**
 * Render in-note section links below the active sidebar item.
 * Headings must already have `id` attributes before this is called.
 */
export function renderSectionNav(
	headings: HTMLElement[],
	activeNoteId: string | null,
): void {
	document.querySelectorAll<HTMLElement>(".section-nav-item").forEach((el) => {
		el.remove();
	});

	const activeNavItem = document.querySelector<HTMLElement>(".nav-item.active");
	if (!activeNavItem || headings.length === 0) return;

	let insertAfter: Element = activeNavItem;
	headings.forEach((h) => {
		const el = document.createElement("div");
		el.className =
			"section-nav-item" + (h.tagName === "H3" ? " section-nav-h3" : "");
		el.dataset.sectionId = h.id;
		el.textContent = h.textContent ?? "";
		el.addEventListener("click", () => {
			h.scrollIntoView({ behavior: "smooth", block: "start" });
		});
		insertAfter.insertAdjacentElement("afterend", el);
		insertAfter = el;
	});
}

// ── Floating Table of Contents panel ──

/** Build and inject the floating TOC panel for the current note. */
export function renderTOC(): void {
	const existing = document.getElementById("toc-panel");
	if (existing) existing.remove();

	const contentEl = document.getElementById("note-content")!;
	const headings = Array.from(
		contentEl.querySelectorAll<HTMLElement>("h2, h3"),
	);
	if (headings.length < 3) return;

	const panel = document.createElement("aside");
	panel.id = "toc-panel";
	panel.className = "toc-panel";

	const label = document.createElement("div");
	label.className = "toc-heading";
	label.textContent = "Contents";
	panel.appendChild(label);

	headings.forEach((h) => {
		const item = document.createElement("a");
		item.className = "toc-item" + (h.tagName === "H3" ? " toc-h3" : "");
		item.dataset.tocId = h.id;
		item.href = "#" + h.id;
		item.textContent = h.textContent ?? "";
		item.addEventListener("click", (e) => {
			e.preventDefault();
			h.scrollIntoView({ behavior: "smooth", block: "start" });
		});
		panel.appendChild(item);
	});

	document.querySelector<HTMLElement>(".content-body")!.appendChild(panel);
}

// ── Related notes panel ──

/**
 * Append the "Related notes" panel at the bottom of a note.
 */
export function renderRelatedNotes(
	currentNote: NoteMetadata,
	contentEl: HTMLElement,
	onNoteClick: (id: string) => void,
): void {
	const scored = NOTES.filter((n) => n.id !== currentNote.id)
		.map((n) => ({ note: n, score: scoreRelatedness(currentNote, n) }))
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, 3);

	if (scored.length === 0) return;

	const panel = document.createElement("div");
	panel.className = "related-panel";
	panel.innerHTML = `<div class="related-heading">Related notes</div>`;

	scored.forEach(({ note }) => {
		const card = document.createElement("div");
		card.className = "related-card";
		card.innerHTML = `
      <span class="related-card-emoji">${note.emoji}</span>
      <span class="related-card-title">${note.title}</span>
      <span class="related-card-arrow">→</span>
    `;
		card.addEventListener("click", () => onNoteClick(note.id));
		panel.appendChild(card);
	});

	contentEl.appendChild(panel);
}

// ── Active state helpers ──

/** Sync the `.active` class on sidebar nav items to match the given noteId. */
export function syncNavActiveState(noteId: string): void {
	document.querySelectorAll<HTMLElement>(".nav-item").forEach((el) => {
		el.classList.toggle("active", el.dataset.noteId === noteId);
	});
}

/** Update active state on section nav + TOC items when a heading scrolls into view. */
export function syncSectionActiveState(sectionId: string): void {
	document.querySelectorAll<HTMLElement>(".section-nav-item").forEach((el) => {
		el.classList.toggle("section-active", el.dataset.sectionId === sectionId);
	});
	document.querySelectorAll<HTMLElement>(".toc-item").forEach((el) => {
		el.classList.toggle("toc-active", el.dataset.tocId === sectionId);
	});
}
