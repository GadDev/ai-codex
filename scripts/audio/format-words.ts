/** A single word with its start and end timestamps (seconds). */
export interface WordTimestamp {
	readonly word: string;
	readonly start: number;
	readonly end: number;
}

/** Subset of the Whisper verbose_json response that we care about. */
export interface WhisperVerboseJson {
	readonly words?: ReadonlyArray<{
		readonly word: string;
		readonly start: number;
		readonly end: number;
	}>;
}

const PUNCTUATION_ONLY = /^\p{P}+$/u;

/**
 * Normalise a Whisper verbose_json response into a flat array of word timestamps.
 *
 * - Filters out empty strings and punctuation-only tokens.
 * - Rejects entries where start >= end (malformed Whisper output) with a thrown Error.
 */
export function formatWords(response: WhisperVerboseJson): WordTimestamp[] {
	const raw = response.words ?? [];

	const result: WordTimestamp[] = [];

	for (const entry of raw) {
		const word = entry.word.trim();

		// Skip empty or punctuation-only tokens
		if (word === "" || PUNCTUATION_ONLY.test(word)) continue;

		if (entry.start >= entry.end) {
			throw new Error(
				`Malformed Whisper timestamp for word "${word}": start (${entry.start}) >= end (${entry.end})`,
			);
		}

		result.push({ word, start: entry.start, end: entry.end });
	}

	return result;
}
