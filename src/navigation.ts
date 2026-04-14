/* ═══════════════════════════════════════════
   navigation.ts — Note display, history, section spy,
                   and collapsible section logic
   ═══════════════════════════════════════════ */

import DOMPurify from "dompurify";
import hljs from "highlight.js";
import { marked } from "marked";
import { NOTES } from "./data.js";
import {
	renderNav,
	renderRelatedNotes,
	renderSectionNav,
	renderTOC,
	syncNavActiveState,
	syncSectionActiveState,
} from "./render.js";
import { getFilteredNotes, getState, setState } from "./state.js";
import { ttsPlayer } from "./tts-ui.js";
import { parseFrontMatter, readingTime, slugify } from "./utils.js";

// ── Collapsible sections ──

/**
 * Wrap h2 sections in collapsible `.section-body` divs with toggle buttons.
 */
export function makeCollapsible(contentEl: HTMLElement): void {
	const h2s = Array.from(contentEl.querySelectorAll<HTMLElement>("h2"));
	if (h2s.length === 0) return;

	h2s.forEach((h2) => {
		const btn = document.createElement("button");
		btn.className = "collapse-toggle";
		btn.setAttribute("aria-expanded", "true");
		btn.setAttribute("aria-label", "Toggle section");
		btn.innerHTML = '<span class="collapse-chevron">▾</span>';
		h2.appendChild(btn);

		const body = document.createElement("div");
		body.className = "section-body";

		let next = h2.nextElementSibling;
		while (next && next.tagName !== "H2") {
			const tmp = next.nextElementSibling;
			body.appendChild(next);
			next = tmp;
		}

		h2.insertAdjacentElement("afterend", body);

		btn.addEventListener("click", () => {
			const expanded = btn.getAttribute("aria-expanded") === "true";
			btn.setAttribute("aria-expanded", String(!expanded));
			const chevron = btn.querySelector<HTMLElement>(".collapse-chevron");
			if (chevron) {
				chevron.style.transform = expanded ? "rotate(-90deg)" : "rotate(0deg)";
			}
			body.style.display = expanded ? "none" : "";
		});
	});
}

// ── Section scroll-spy ──

/** Assign IDs to headings and start the IntersectionObserver scroll-spy. */
export function setupSectionHighlighting(): void {
	const { sectionObserver } = getState();
	if (sectionObserver) {
		sectionObserver.disconnect();
	}

	const contentEl = document.getElementById("note-content")!;
	const headings = Array.from(
		contentEl.querySelectorAll<HTMLElement>("h2, h3"),
	);
	if (headings.length === 0) {
		setState({ sectionObserver: null });
		return;
	}

	headings.forEach((h) => {
		if (!h.id) h.id = "section-" + slugify(h.textContent ?? "");
	});

	const { activeNoteId } = getState();
	renderSectionNav(headings, activeNoteId);

	const scrollRoot = document.getElementById("main-content")!;

	function getActiveHeading(): HTMLElement | undefined {
		const offset = scrollRoot.scrollTop + scrollRoot.clientHeight * 0.25;
		// At the bottom of the scroll container, always pick the last heading
		const atBottom =
			scrollRoot.scrollTop + scrollRoot.clientHeight >=
			scrollRoot.scrollHeight - 4;
		if (atBottom) return headings[headings.length - 1];
		// Otherwise pick the last heading whose offsetTop is at or above the offset
		let active: HTMLElement | undefined;
		for (const h of headings) {
			if (h.offsetTop <= offset) active = h;
			else break;
		}
		return active ?? headings[0];
	}

	// Highlight on scroll
	const onScroll = (): void => {
		const h = getActiveHeading();
		if (h) syncSectionActiveState(h.id);
	};

	scrollRoot.addEventListener("scroll", onScroll, { passive: true });
	// Trigger immediately so the first section is active on load
	onScroll();

	const observer = {
		disconnect(): void {
			scrollRoot.removeEventListener("scroll", onScroll);
		},
	};
	setState({ sectionObserver: observer });
}

// ── History navigation ──

/** Navigate to the previous note in history. */
export async function navigateBack(): Promise<void> {
	const { historyIndex, noteHistory } = getState();
	if (historyIndex <= 0) return;
	const newIndex = historyIndex - 1;
	setState({ historyIndex: newIndex, isNavigatingHistory: true });
	const targetId = noteHistory[newIndex];
	if (targetId !== undefined) await showNote(targetId);
	setState({ isNavigatingHistory: false });
}

/** Navigate to the next note in history. */
export async function navigateForward(): Promise<void> {
	const { historyIndex, noteHistory } = getState();
	if (historyIndex >= noteHistory.length - 1) return;
	const newIndex = historyIndex + 1;
	setState({ historyIndex: newIndex, isNavigatingHistory: true });
	const targetId = noteHistory[newIndex];
	if (targetId !== undefined) await showNote(targetId);
	setState({ isNavigatingHistory: false });
}

// ── Show note ──

// ── Lazy note fetching ──

/**
 * Fetch the raw markdown for a note by slug.
 * Results are cached in AppState.noteContentCache for the session.
 */
export async function fetchNote(slug: string): Promise<string> {
	const { noteContentCache } = getState();
	const cached = noteContentCache.get(slug);
	if (cached !== undefined) return cached;

	const response = await fetch(`/notes/${slug}.md`);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch note: /notes/${slug}.md (${response.status})`,
		);
	}
	const raw = await response.text();
	noteContentCache.set(slug, raw);
	return raw;
}

/**
 * Render a note into the main content area and update all related UI.
 */
export async function showNote(noteId: string): Promise<void> {
	const note = NOTES.find((n) => n.id === noteId);
	if (!note) return;

	// ── History tracking ──
	const { isNavigatingHistory, noteHistory, historyIndex } = getState();
	if (!isNavigatingHistory) {
		const trimmedHistory = noteHistory.slice(0, historyIndex + 1);
		setState({
			noteHistory: [...trimmedHistory, noteId],
			historyIndex: trimmedHistory.length,
		});
	}
	// When isNavigatingHistory is true, historyIndex was already updated by the caller.

	setState({ activeNoteId: noteId });

	// Sync sidebar active state
	syncNavActiveState(noteId);

	// Switch screens
	document.getElementById("welcome-screen")!.style.display = "none";
	const noteView = document.getElementById("note-view")!;
	noteView.style.display = "flex";

	// ── Show loading skeleton while fetching ──
	const contentEl = document.getElementById("note-content")!;
	contentEl.innerHTML =
		'<div class="note-skeleton" aria-busy="true" aria-label="Loading note"><div class="skeleton-line skeleton-title"></div><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line skeleton-short"></div></div>';

	// ── Fetch markdown (cache-first) ──
	let rawMd: string;
	try {
		rawMd = await fetchNote(note.slug);
	} catch (err) {
		contentEl.innerHTML =
			'<p class="note-load-error">Failed to load note. Please try again.</p>';
		console.error(err);
		return;
	}

	const mins = readingTime(rawMd);
	const frontMatter = parseFrontMatter(rawMd);
	const dateStr = frontMatter["date"] ?? "";

	const { historyIndex: newIndex, noteHistory: newHistory } = getState();
	const canBack = newIndex > 0;
	const canForward = newIndex < newHistory.length - 1;

	// ── Topbar (built safely — user content via textContent only) ──
	const topbar = document.getElementById("note-topbar")!;
	topbar.innerHTML = `
    <div class="topbar-nav">
      <button class="nav-hist-btn" id="nav-back" aria-label="Back (⌘[)" title="Back (⌘[)" ${canBack ? "" : "disabled"}>‹</button>
      <button class="nav-hist-btn" id="nav-forward" aria-label="Forward (⌘])" title="Forward (⌘])" ${canForward ? "" : "disabled"}>›</button>
    </div>
    <span class="topbar-emoji"></span>
    <span class="topbar-title"></span>
    <span class="topbar-meta"></span>
    <div class="topbar-tags"></div>
  `;
	topbar.querySelector<HTMLElement>(".topbar-emoji")!.textContent = note.emoji;
	topbar.querySelector<HTMLElement>(".topbar-title")!.textContent = note.title;
	topbar.querySelector<HTMLElement>(".topbar-meta")!.textContent =
		`${mins} min read${dateStr ? " · " + dateStr : ""}`;

	const tagsContainer = topbar.querySelector<HTMLElement>(".topbar-tags")!;
	note.tags.forEach((t) => {
		const span = document.createElement("span");
		span.className = "tag";
		span.textContent = t;
		tagsContainer.appendChild(span);
	});

	document.getElementById("nav-back")!.addEventListener("click", navigateBack);
	document
		.getElementById("nav-forward")!
		.addEventListener("click", navigateForward);

	// ── Render markdown content (contentEl already in DOM from skeleton above) ──
	const mdBody = rawMd.replace(/^---[\s\S]*?---\n?/, "");
	contentEl.innerHTML = DOMPurify.sanitize(marked.parse(mdBody) as string);

	// Syntax-highlight any blocks not yet processed
	contentEl.querySelectorAll("pre code:not(.hljs)").forEach((el) => {
		hljs.highlightElement(el as HTMLElement);
	});

	// Collapsible h2 sections
	makeCollapsible(contentEl);

	// Related notes panel (passes showNote as the click callback)
	renderRelatedNotes(note, contentEl, showNote);

	// Scroll to top
	document.getElementById("main-content")!.scrollTop = 0;

	// Section nav + scroll spy
	setupSectionHighlighting();

	// Floating TOC
	renderTOC();

	// Read Aloud — attach TTS player to the freshly rendered content
	ttsPlayer.attach(contentEl);

	// Close mobile sidebar
	const sidebar = document.querySelector<HTMLElement>(".sidebar");
	if (sidebar && window.innerWidth <= 768) {
		sidebar.classList.add("mobile-hidden");
	}

	// Re-render nav to reflect new active state (keeps arrow-key nav in sync)
	renderNav(getFilteredNotes(NOTES), showNote);
}
