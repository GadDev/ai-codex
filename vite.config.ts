import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	test: {
		environment: "jsdom",
		globals: true,
		coverage: {
			provider: "v8",
			include: ["src/**/*.ts"],
			exclude: ["src/main.ts"],
		},
	},

	// Entry point is index.html at the root — Vite's default, stated explicitly for clarity
	root: ".",

	resolve: {
		alias: {
			// Serve notes/ directory at /notes URL path
			"/notes": join(__dirname, "notes"),
		},
	},

	build: {
		outDir: "dist",
		emptyOutDir: true,
		// Emit sourcemaps for production debugging
		sourcemap: true,
	},

	server: {
		// Serve notes/ as static files so fetch("/notes/*.md") works in dev
		fs: {
			allow: ["."],
		},
	},
});
