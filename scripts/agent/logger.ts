/**
 * logger.ts — Append-only file logger for the ingestion pipeline.
 *
 * Writes to /logs/ingest.log (run events) and /logs/error.log (failures).
 * In debug mode, also echoes entries to stdout/stderr.
 */

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const LOGS_DIR = join(ROOT, "logs");

let debugMode = false;

function ensureLogsDir(): void {
	if (!existsSync(LOGS_DIR)) {
		mkdirSync(LOGS_DIR, { recursive: true });
	}
}

function timestamp(): string {
	return new Date().toISOString();
}

/** Enable or disable debug output to stdout/stderr. */
export function setDebug(enabled: boolean): void {
	debugMode = enabled;
}

/** Append a run event to /logs/ingest.log. */
export function logRun(message: string): void {
	ensureLogsDir();
	const line = `[${timestamp()}] ${message}\n`;
	appendFileSync(join(LOGS_DIR, "ingest.log"), line, "utf-8");
	if (debugMode) process.stdout.write(`[debug] ${line}`);
}

/** Append an error event to /logs/error.log. */
export function logError(message: string): void {
	ensureLogsDir();
	const line = `[${timestamp()}] ${message}\n`;
	appendFileSync(join(LOGS_DIR, "error.log"), line, "utf-8");
	if (debugMode) process.stderr.write(`[debug:error] ${line}`);
}
