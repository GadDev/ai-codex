import fs from "node:fs";
import path from "node:path";
import type { WhisperVerboseJson, WordTimestamp } from "./format-words.ts";
import { formatWords } from "./format-words.ts";

const TRANSCRIPTION_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";

/**
 * Transcribe an .mp3 file via OpenAI Whisper and return word-level timestamps.
 *
 * Reads OPENAI_API_KEY from process.env only.
 * The returned array is already normalised by formatWords — empty and
 * punctuation-only tokens are stripped, malformed timestamps throw.
 */
export async function transcribeWords(
	mp3Path: string,
): Promise<WordTimestamp[]> {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		throw new Error(
			"OPENAI_API_KEY is not set. Add it to your .env file and run with --env-file=.env",
		);
	}

	const resolvedPath = path.resolve(mp3Path);
	if (!fs.existsSync(resolvedPath)) {
		throw new Error(`MP3 file not found: ${resolvedPath}`);
	}

	const mp3Buffer = fs.readFileSync(resolvedPath);

	const formData = new FormData();
	formData.append(
		"file",
		new Blob([mp3Buffer], { type: "audio/mpeg" }),
		path.basename(resolvedPath),
	);
	formData.append("model", "whisper-1");
	formData.append("response_format", "verbose_json");
	formData.append("timestamp_granularities[]", "word");

	const response = await fetch(TRANSCRIPTION_ENDPOINT, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
		body: formData,
	});

	if (!response.ok) {
		const errorBody = await response.text();
		throw new Error(
			`OpenAI Whisper API error (${response.status}): ${errorBody}`,
		);
	}

	const json = (await response.json()) as WhisperVerboseJson;
	return formatWords(json);
}
