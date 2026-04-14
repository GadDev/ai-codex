/* ═══════════════════════════════════════════
   ui.ts — Stateless UI setup functions
   Keyboard shortcuts, mobile sidebar, theme toggle, tag filter.
   All functions are one-time registrations (called once during init).
   ═══════════════════════════════════════════ */

import { NOTES } from "./data.js";
import { navigateBack, navigateForward, showNote } from "./navigation.js";
import { renderNav, renderSearchResults } from "./render.js";
import { handleSearch } from "./search.js";
import { getFilteredNotes, getState, setState } from "./state.js";

// ── Mobile sidebar ──

export function closeMobileSidebar(): void {
	if (window.innerWidth <= 768) {
		document
			.querySelector<HTMLElement>(".sidebar")
			?.classList.add("mobile-hidden");
	}
}

export function toggleMobileSidebar(): void {
	if (window.innerWidth <= 768) {
		document
			.querySelector<HTMLElement>(".sidebar")
			?.classList.toggle("mobile-hidden");
	}
}

// ── Keyboard shortcuts ──

export function setupKeyboard(): void {
	const searchInput = document.getElementById(
		"search-input",
	) as HTMLInputElement | null;

	document.addEventListener("keydown", (e) => {
		// ⌘K / Ctrl+K → focus search
		if ((e.metaKey || e.ctrlKey) && e.key === "k") {
			e.preventDefault();
			searchInput?.focus();
			searchInput?.select();
		}

		// Escape → clear search
		if (e.key === "Escape") {
			if (searchInput) searchInput.value = "";
			handleSearch("", {
				renderNav,
				renderSearchResults,
				onNoteClick: showNote,
			});
			searchInput?.blur();
			closeMobileSidebar();
		}

		// ⌘[ / Ctrl+[ → navigate back in history
		if ((e.metaKey || e.ctrlKey) && e.key === "[") {
			e.preventDefault();
			navigateBack();
		}

		// ⌘] / Ctrl+] → navigate forward in history
		if ((e.metaKey || e.ctrlKey) && e.key === "]") {
			e.preventDefault();
			navigateForward();
		}

		// ↑ ↓ → navigate topics (when search input is not focused)
		if (
			(e.key === "ArrowDown" || e.key === "ArrowUp") &&
			document.activeElement !== searchInput
		) {
			e.preventDefault();
			const { activeNoteId } = getState();
			const currentIndex = NOTES.findIndex((n) => n.id === activeNoteId);
			const nextIndex =
				e.key === "ArrowDown"
					? (currentIndex + 1) % NOTES.length
					: (currentIndex - 1 + NOTES.length) % NOTES.length;
			const nextNote = NOTES[nextIndex];
			if (nextNote) showNote(nextNote.id);
		}
	});

	searchInput?.addEventListener("input", (e) => {
		handleSearch((e.target as HTMLInputElement).value, {
			renderNav,
			renderSearchResults,
			onNoteClick: showNote,
		});
	});
}

// ── Mobile menu ──

export function setupMobileMenu(): void {
	const hamburger = document.getElementById("hamburger-toggle");

	hamburger?.addEventListener("click", toggleMobileSidebar);

	// Close sidebar when clicking nav items or search results
	document.addEventListener("click", (e) => {
		const target = e.target as Element | null;
		if (
			target?.closest(".nav-item") ||
			target?.closest(".search-result-item")
		) {
			closeMobileSidebar();
		}
	});

	// Close sidebar when clicking outside on mobile
	document.addEventListener("click", (e) => {
		const target = e.target as Element | null;
		if (
			window.innerWidth <= 768 &&
			!target?.closest(".sidebar") &&
			!target?.closest(".hamburger-toggle")
		) {
			closeMobileSidebar();
		}
	});

	// Restore sidebar on desktop resize
	window.addEventListener("resize", () => {
		if (window.innerWidth > 768) {
			document
				.querySelector<HTMLElement>(".sidebar")
				?.classList.remove("mobile-hidden");
		}
	});
}

// ── Theme toggle ──

export function setupThemeToggle(): void {
	const html = document.documentElement;
	const btn = document.getElementById("theme-toggle");
	const icon = document.getElementById("theme-toggle-icon");
	const label = document.getElementById("theme-toggle-label");

	const applyTheme = (isDark: boolean): void => {
		html.setAttribute("data-theme", isDark ? "dark" : "light");
		if (icon) icon.textContent = isDark ? "☀️" : "🌙";
		if (label) label.textContent = isDark ? "Light mode" : "Dark mode";
	};

	const saved = localStorage.getItem("theme");
	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	applyTheme(saved ? saved === "dark" : prefersDark);

	btn?.addEventListener("click", () => {
		const isDark = html.getAttribute("data-theme") !== "dark";
		applyTheme(isDark);
		localStorage.setItem("theme", isDark ? "dark" : "light");
	});
}

// ── Tag filter ──

export function setupTagFilter(): void {
	const allTags = [...new Set(NOTES.flatMap((n) => n.tags))].sort();
	const container = document.getElementById("tag-filter");
	if (!container) return;

	allTags.forEach((tag) => {
		const pill = document.createElement("button");
		pill.className = "tag-pill";
		pill.textContent = tag;
		pill.dataset.tag = tag;

		pill.addEventListener("click", () => {
			const { activeTagFilter, isSearching } = getState();

			if (activeTagFilter === tag) {
				setState({ activeTagFilter: null });
				pill.classList.remove("active");
			} else {
				setState({ activeTagFilter: tag });
				container.querySelectorAll(".tag-pill").forEach((p) => {
					p.classList.remove("active");
				});
				pill.classList.add("active");
			}

			if (!isSearching) {
				renderNav(getFilteredNotes(NOTES), showNote);
			}
		});

		container.appendChild(pill);
	});
}
