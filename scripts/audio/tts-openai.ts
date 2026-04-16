import fs from "node:fs";
import path from "node:path";

const TTS_ENDPOINT = "https://api.openai.com/v1/audio/speech";
const MIN_VALID_BYTES = 1024;

// Narration style: warm but measured — suited to technical educational content.
// Explicit slow-pacing instruction is the primary lever for speed control.
const VOICE_INSTRUCTIONS =
	"Voice Affect: Warm, refined, and gently instructive — like a knowledgeable teacher who enjoys the subject. " +
	"Tone: Calm, encouraging, and clear. " +
	"Pacing: Noticeably slow and deliberate. Speak at roughly 75% of normal conversational speed. " +
	"Leave a half-beat pause after every comma, and a full pause after every sentence and section heading. " +
	"Pronunciation: Articulate every word fully. Treat acronyms as letter-by-letter sequences — A.I., L.L.M., R.A.G., A.P.I. — with a brief pause between each letter. " +
	"Emotion: Quietly enthusiastic and supportive, as if guiding a motivated student through complex material. " +
	"Overall: prioritise clarity and ease of understanding over expressive performance.";

/** Absolute path to public/audio/ — the only permitted output directory. */
const AUDIO_DIR = path.resolve(
	new URL("../../public/audio", import.meta.url).pathname,
);

export interface TtsOptions {
	/** TTS voice to use. Defaults to "ash". */
	readonly voice?: string;
	/** Model to use. Defaults to "tts-1-hd". */
	readonly model?: string;
	/** Overwrite the output file if it already exists. Defaults to false. */
	readonly force?: boolean;
}

/**
 * Call the OpenAI TTS API and write a validated .mp3 to disk.
 *
 * Reads OPENAI_API_KEY from process.env only — never from parameters.
 * Performs path-traversal check, MIME validation, and size validation
 * before writing. Never overwrites an existing file unless force is set.
 */
export async function generateMp3(
	text: string,
	outputPath: string,
	options: TtsOptions = {},
): Promise<void> {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		throw new Error(
			"OPENAI_API_KEY is not set. Add it to your .env file and run with --env-file=.env",
		);
	}

	const resolvedOutput = path.resolve(outputPath);
	assertWithinAudioDir(resolvedOutput);

	if (!options.force && fs.existsSync(resolvedOutput)) {
		throw new Error(
			`Output file already exists: ${resolvedOutput}\nPass force: true to overwrite.`,
		);
	}

	const body = JSON.stringify({
		model: options.model ?? "tts-1-hd",
		voice: options.voice ?? "ash",
		input: text,
		instructions: VOICE_INSTRUCTIONS,
	});

	const response = await fetch(TTS_ENDPOINT, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body,
	});

	if (!response.ok) {
		const errorBody = await response.text();
		throw new Error(`OpenAI TTS API error (${response.status}): ${errorBody}`);
	}

	const contentType = response.headers.get("content-type") ?? "";
	if (!contentType.includes("audio/mpeg")) {
		throw new Error(
			`Unexpected Content-Type from TTS API: "${contentType}". Expected audio/mpeg.`,
		);
	}

	const buffer = Buffer.from(await response.arrayBuffer());
	if (buffer.byteLength < MIN_VALID_BYTES) {
		throw new Error(
			`TTS response too small (${buffer.byteLength} bytes) — likely an error body masquerading as audio.`,
		);
	}

	fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
	fs.writeFileSync(resolvedOutput, buffer);
}

/**
 * Assert the resolved output path is inside AUDIO_DIR.
 * Prevents path-traversal attacks via crafted slugs containing `..` or `/`.
 */
function assertWithinAudioDir(resolvedPath: string): void {
	const normalised = resolvedPath.endsWith(path.sep)
		? resolvedPath
		: resolvedPath + path.sep;
	const allowed = AUDIO_DIR.endsWith(path.sep)
		? AUDIO_DIR
		: AUDIO_DIR + path.sep;

	if (!normalised.startsWith(allowed)) {
		throw new Error(
			`Path traversal rejected: "${resolvedPath}" is outside the allowed audio directory "${AUDIO_DIR}".`,
		);
	}
}
