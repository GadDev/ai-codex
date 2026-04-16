/**
 * Produces clean, speakable plain text from note markdown.
 * Pure function — no file I/O, no side effects.
 */

/** Abbreviations expanded the same way as `normalizeForSpeech` in src/tts.ts. */
const ABBREVIATIONS: ReadonlyArray<[RegExp, string]> = [
	[/\be\.g\./gi, "for example"],
	[/\bi\.e\./gi, "that is"],
	[/\betc\./gi, "and so on"],
	[/\bvs\.?/gi, "versus"],
	[/\bRLHF\b/g, "R L H F"],
	[/\bAPI\b/g, "A P I"],
	[/\bLLM\b/g, "L L M"],
	[/\bRAG\b/g, "R A G"],
	[/\bUI\b/g, "U I"],
	[/\bUX\b/g, "U X"],
	[/\bURL\b/g, "U R L"],
	[/\bPWA\b/g, "P W A"],
	[/\bSDK\b/g, "S D K"],
	[/\bCI\b/g, "C I"],
	[/\bCD\b/g, "C D"],
];

/** Strip YAML front matter (--- ... --- block at the very top of the file). */
function stripFrontMatter(text: string): string {
	return text.replace(/^---[\s\S]*?---\n?/, "");
}

/** Remove fenced code blocks entirely — do not speak code. */
function stripCodeBlocks(text: string): string {
	return text.replace(/```[\s\S]*?```/g, "");
}

/** Remove inline code spans. */
function stripInlineCode(text: string): string {
	return text.replace(/`[^`]*`/g, "");
}

/**
 * Detect heading lines and append a sentence-ending pause if missing.
 * Processes line-by-line so the pause is appended before the newline.
 */
function addHeadingPauses(text: string): string {
	return text
		.split("\n")
		.map((line) => {
			if (!/^#{1,6}\s+/.test(line)) return line;
			const content = line.replace(/^#{1,6}\s+/, "").trimEnd();
			if (/[.!?]$/.test(content)) return content;
			return `${content}. `;
		})
		.join("\n");
}

/** Strip remaining markdown syntax characters. */
function stripMarkdownSyntax(text: string): string {
	return (
		text
			// Bold / italic markers
			.replace(/\*{1,3}|_{1,3}/g, "")
			// Headings (# at line start — already handled by addHeadingPauses, but catch stragglers)
			.replace(/^#{1,6}\s*/gm, "")
			// Blockquotes
			.replace(/^>\s*/gm, "")
			// Strikethrough
			.replace(/~{1,2}/g, "")
			// Em-dashes and double hyphens → comma-pause
			.replace(/\s*[-\u2014]{2,}\s*/g, ", ")
			.replace(/\s*\u2014\s*/g, ", ")
			// Markdown links — keep link text, drop URL
			.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
			// Bare URLs
			.replace(/https?:\/\/\S+/g, "")
	);
}

function expandAbbreviations(text: string): string {
	let result = text;
	for (const [pattern, replacement] of ABBREVIATIONS) {
		result = result.replace(pattern, replacement);
	}
	return result;
}

function collapseWhitespace(text: string): string {
	return text
		.replace(/[ \t]{2,}/g, " ") // collapse horizontal whitespace
		.replace(/\n{3,}/g, "\n\n") // collapse excess blank lines
		.trim();
}

/**
 * Convert raw note markdown to clean, speakable plain text.
 * Safe to call in a Node.js environment — requires no DOM.
 */
export function extractSpeechText(markdownContent: string): string {
	let text = markdownContent;
	text = stripFrontMatter(text);
	text = stripCodeBlocks(text);
	text = stripInlineCode(text);
	text = addHeadingPauses(text);
	text = stripMarkdownSyntax(text);
	text = expandAbbreviations(text);
	text = collapseWhitespace(text);
	return text;
}
