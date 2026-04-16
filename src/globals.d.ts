// Ambient declarations for any remaining globals loaded outside the module graph.
// marked, DOMPurify and hljs are now imported as npm packages — no declarations needed here.

// Allow TypeScript to accept Vite-handled CSS side-effect imports.
declare module "*.css" {}

// Injected at build time by vite.config.ts define — resolves to the version field in package.json.
declare const __APP_VERSION__: string;
