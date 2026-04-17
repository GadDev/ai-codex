/**
 * Browser-compatible port of scripts/audio/extract-text.ts.
 * Pure function — no Node APIs, no DOM required.
 *
 * Used by the stale-audio check in tts-ui.ts to hash raw markdown
 * using the same algorithm that generated the audioHash in the manifest.
 *
 * Keep in sync with scripts/audio/extract-text.ts.
 */

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

function stripFrontMatter(text: string): string {
	return text.replace(/^---[\s\S]*?---\n?/, "");
}

function stripCodeBlocks(text: string): string {
	return text.replace(/```[\s\S]*?```/g, "");
}

function stripInlineCode(text: string): string {
	return text.replace(/`[^`]*`/g, "");
}

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

function stripMarkdownSyntax(text: string): string {
	return text
		.replace(/\*{1,3}|_{1,3}/g, "")
		.replace(/^#{1,6}\s*/gm, "")
		.replace(/^>\s*/gm, "")
		.replace(/~{1,2}/g, "")
		.replace(/\s*[-\u2014]{2,}\s*/g, ", ")
		.replace(/\s*\u2014\s*/g, ", ")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/https?:\/\/\S+/g, "");
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
		.replace(/[ \t]{2,}/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/**
 * Convert raw note markdown to clean, speakable plain text.
 * Produces the same output as scripts/audio/extract-text.ts — used to
 * verify that the audioHash in the manifest still matches the note content.
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
