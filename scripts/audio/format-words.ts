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
 * Estimate word duration based on character count.
 * Assumes average speech rate of ~150 words per minute = ~0.4s per word.
 * Adjusts based on word length.
 */
function estimateDuration(word: string): number {
	// Base duration: 0.1s for short words, up to 0.6s for long words
	return 0.1 + word.length * 0.05;
}

/**
 * Normalise a Whisper verbose_json response into a flat array of word timestamps.
 *
 * - Filters out empty strings and punctuation-only tokens.
 * - Estimates durations for entries where start >= end (Whisper occasionally emits point timestamps).
 * - Logs warnings for estimated timestamps so you know they're inferred, not accurate.
 */
export function formatWords(response: WhisperVerboseJson): WordTimestamp[] {
	const raw = response.words ?? [];

	const result: WordTimestamp[] = [];

	for (const entry of raw) {
		const word = entry.word.trim();

		// Skip empty or punctuation-only tokens
		if (word === "" || PUNCTUATION_ONLY.test(word)) continue;

		// Handle entries with invalid timestamps (start >= end)
		// Estimate duration based on word length and surrounding context
		if (entry.start >= entry.end) {
			const estimatedDuration = estimateDuration(word);
			const estimatedEnd = entry.start + estimatedDuration;
			console.warn(
				`⚠ formatWords: estimating duration for "${word}" (start: ${entry.start}, estimated end: ${estimatedEnd.toFixed(2)})`,
			);
			result.push({ word, start: entry.start, end: estimatedEnd });
		} else {
			result.push({ word, start: entry.start, end: entry.end });
		}
	}

	return result;
}
