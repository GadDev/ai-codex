/* ═══════════════════════════════════════════
   main.ts — Entry point
   Imports all modules and boots the app.
   ═══════════════════════════════════════════ */

import "highlight.js/styles/github-dark.min.css";

import { initData, NOTES } from "./data.js";
import { showNote } from "./navigation.js";
import { renderNav, renderWelcomeGrid } from "./render.js";
import { initSearch } from "./search.js";
import { getFilteredNotes } from "./state.js";
import {
	setupKeyboard,
	setupMobileMenu,
	setupTagFilter,
	setupThemeToggle,
} from "./ui.js";
import { configureParsers } from "./utils.js";

async function init() {
	await initData();

	const versionEl = document.querySelector<HTMLElement>(".logo-version");
	if (versionEl) versionEl.textContent = `v${__APP_VERSION__}`;
	configureParsers();
	initSearch();
	renderNav(getFilteredNotes(NOTES), showNote);
	renderWelcomeGrid(showNote);
	setupKeyboard();
	setupMobileMenu();
	setupThemeToggle();
	setupTagFilter();

	// Hide sidebar on mobile at startup
	if (window.innerWidth <= 768) {
		document
			.querySelector<HTMLElement>(".sidebar")
			?.classList.add("mobile-hidden");
	}
}

document.addEventListener("DOMContentLoaded", () => {
	init().catch((err) => console.error("App init failed:", err));
});

// ── Service Worker registration ──
// Kept here (not inline in HTML) so it is covered by the script-src CSP allowlist.
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("./sw.js").catch(() => {
			// SW registration is best-effort; app works fine without it
		});
	});
}
