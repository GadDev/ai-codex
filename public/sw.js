/* ═══════════════════════════════════════════
   Claude Notebook — Service Worker
   Cache strategy:
     Core assets  -> cache-first  (pre-cached on install)
     Note .md     -> stale-while-revalidate (cache-on-access)
     Audio files  -> cache-first, network fallback (NOT pre-cached)
     Everything else -> cache-first, network fallback
   ═══════════════════════════════════════════ */

// AUTO-PATCHED by scripts/build-manifest.ts -- do not edit this line manually.
const CACHE_VERSION = "sha256-ad5a68cddebe";
const CORE_CACHE = `claude-notebook-core-${CACHE_VERSION}`;
const NOTES_CACHE = `claude-notebook-notes-${CACHE_VERSION}`;
const AUDIO_CACHE = `claude-notebook-audio-${CACHE_VERSION}`;

// Only stable, unhashed paths are pre-cached.
// Vite-hashed JS/CSS are NOT listed here -- they are cached on first access
// by the general cache-first fallback below.
const CORE_ASSETS = [
	"./", // index.html (navigation requests)
	"./notes-manifest.json", // needed immediately for search + offline
	"./manifest.json", // PWA manifest
	"./audio/manifest.json", // audio availability index (~2 kB)
	"./icons/icon-192.svg",
	"./icons/icon-512.svg",
];

// ── Install: pre-cache core app shell ──────────────────────────
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE_ASSETS)),
	);
	// Activate immediately — don't wait for old SW to become idle
	self.skipWaiting();
});

// ── Activate: delete stale caches ──────────────────────────────
self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter(
							(key) =>
								key !== CORE_CACHE &&
								key !== NOTES_CACHE &&
								key !== AUDIO_CACHE,
						)
						.map((key) => caches.delete(key)),
				),
			),
	);
	self.clients.claim();
});

// ── Fetch: routing logic ────────────────────────────────────────
self.addEventListener("fetch", (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// 2. Note markdown files — cache-on-access (stale-while-revalidate)
	//    Fetched lazily at runtime; cached for offline use after first visit.
	if (url.pathname.startsWith("/notes/") && url.pathname.endsWith(".md")) {
		event.respondWith(
			caches.open(NOTES_CACHE).then(async (cache) => {
				const cached = await cache.match(request);
				if (cached) {
					// Serve from cache; refresh in background for next visit
					fetch(request)
						.then((fresh) => {
							if (fresh.ok) cache.put(request, fresh);
						})
						.catch(() => {
							/* offline — ignore */
						});
					return cached;
				}
				// Not yet cached — fetch, store, and return
				const fresh = await fetch(request);
				if (fresh.ok) cache.put(request, fresh.clone());
				return fresh;
			}),
		);
		return;
	}

	// 3. Audio files — cache-first, network fallback, offline 503
	//    Never pre-cached (39 × ~3 MB = ~117 MB would be too large).
	//    Cached on first access; served from cache thereafter.
	if (url.pathname.startsWith("/audio/")) {
		event.respondWith(
			caches.open(AUDIO_CACHE).then(async (cache) => {
				const cached = await cache.match(request);
				if (cached) return cached;
				try {
					const fresh = await fetch(request);
					if (fresh.ok) cache.put(request, fresh.clone());
					return fresh;
				} catch {
					// Network unavailable and not cached — return a plain 503
					return new Response("Audio unavailable offline", { status: 503 });
				}
			}),
		);
		return;
	}
});
