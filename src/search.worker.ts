/// <reference lib="webworker" />

/* ═══════════════════════════════════════════
   search.worker.ts — Search Worker
   Builds the Fuse.js index off the main thread.
   Still uses importScripts + the vendored fuse.min.js (classic worker).
   Receives:  { notes: NoteSearchEntry[] }
   Posts back: { index: object, notes: NoteSearchEntry[] }
   ═══════════════════════════════════════════ */

// Minimal ambient declaration for the CDN-loaded Fuse used in this worker.
declare const Fuse: {
	createIndex(
		keys: Array<{ name: string; weight: number }>,
		list: unknown[],
	): { toJSON(): object };
};

interface NoteSearchEntry {
	id: string;
	slug: string;
	emoji: string;
	title: string;
	tags: string[];
	content: string;
}

importScripts("./vendor/fuse.min.js");

self.addEventListener(
	"message",
	({ data }: MessageEvent<{ notes: NoteSearchEntry[] }>) => {
		const { notes } = data;

		const index = Fuse.createIndex(
			[
				{ name: "title", weight: 0.4 },
				{ name: "tags", weight: 0.3 },
				{ name: "content", weight: 0.3 },
			],
			notes,
		);

		// Transfer the serialised index back to the main thread
		self.postMessage({ index: index.toJSON(), notes });
	},
);
