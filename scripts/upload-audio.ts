#!/usr/bin/env tsx
/**
 * upload-audio.ts
 *
 * Uploads all .mp3 and .words.json files from public/audio/ to Cloudflare R2
 * using the wrangler CLI. Only uploads files — manifest.json is committed to git.
 *
 * Requires: wrangler installed globally and authenticated (`wrangler login`)
 *
 * Run: npm run upload:audio
 */

import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = join(__dirname, "../public/audio");
const BUCKET = "ai-codex-audio";

const files = readdirSync(AUDIO_DIR).filter(
	(f) => f.endsWith(".mp3") || f.endsWith(".words.json"),
);

if (files.length === 0) {
	console.log(
		"No audio files found in public/audio/ — run npm run generate:audio first.",
	);
	process.exit(0);
}

console.log(`Uploading ${files.length} file(s) to R2 bucket: ${BUCKET}\n`);

for (const file of files) {
	const contentType = file.endsWith(".mp3") ? "audio/mpeg" : "application/json";
	const localPath = join(AUDIO_DIR, file);

	console.log(`  → ${file}`);
	execSync(
		`wrangler r2 object put ${BUCKET}/audio/${file} --file "${localPath}" --content-type ${contentType} --remote`,
		{ stdio: "inherit" },
	);
}

console.log(`\nDone — ${files.length} file(s) uploaded.`);
