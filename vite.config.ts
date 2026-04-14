import { defineConfig } from "vitest/config";

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
