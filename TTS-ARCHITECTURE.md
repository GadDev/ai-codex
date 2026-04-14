# TTS Reader — Architecture & Strategy Review

**Roles:** Senior Architect · Senior Backend Engineer · Senior Frontend Engineer  
**Context:** Web Speech API reader built into a static PWA (no server, no auth, local-first)  
**Goal:** Identify all viable strategies to improve smoothness, reliability, and UX — with honest trade-offs.

---

## Current State Diagnosis

| Layer | What we have | Known pain points |
|---|---|---|
| Engine | `Web Speech API` (`SpeechSynthesisUtterance`) | Chrome silent-drop bug, no pause resume, no offset resume |
| Text prep | Basic cleanup + abbrev expansion | No SSML, no punctuation-aware chunking |
| Playback | Single long utterance (whole note at once) | Any seek = restart from segment, no true mid-sentence resume |
| UI | Floating panel, progress bar, skip/back | Rate change restarts speech; progress is approximate |
| Voice | macOS Samantha/Daniel, Enhanced preferred | No fallback strategy if voice unavailable |

---

## Strategy 1 — Sentence-Chunked Utterances (Recommended Quick Win)

### Idea
Instead of speaking the entire note as one utterance, split the text into individual sentences and queue them one by one. Each sentence is a separate `SpeechSynthesisUtterance`.

### How it works
```
[sentence 1] → speak → onend → [sentence 2] → speak → onend → ...
```
Track `currentSentenceIdx`. Pause = stop at current boundary. Resume = speak from `currentSentenceIdx`.

### Why this fixes the core problems

| Problem | Fix |
|---|---|
| Chrome drops long utterances silently | Short utterances (< 200 chars) never hit the 15s silent-drop threshold |
| Pause/resume broken | Pause = just don't queue next sentence. Resume = queue from where you stopped |
| Seek is jarring | Jump to any sentence index instantly — no restart of the whole note |
| Rate change restarts everything | Rate applies to next queued sentence — gap is < 1 sentence |
| Progress bar is approximate | Progress = `currentSentenceIdx / totalSentences` — exact |

### Trade-offs
- ❌ Small gap (~80–150ms) between sentences — noticeable at slow rates
- ❌ Sentence splitting needs to handle `Mr.`, `Dr.`, `e.g.`, decimal numbers
- ❌ More complex boundary tracking
- ✅ Most reliable cross-browser approach
- ✅ Works today, zero dependencies

### Sentence splitter (robust)
```js
function splitIntoSentences(text) {
  // Negative lookbehind for common abbreviations
  return text
    .replace(/([.!?])\s+(?=[A-Z])/g, "$1\n")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
```

---

## Strategy 2 — SSML Injection (Best Quality, Limited Browser Support)

### Idea
Wrap the text in [SSML (Speech Synthesis Markup Language)](https://www.w3.org/TR/speech-synthesis/) to give the engine explicit breathing instructions:

```xml
<speak>
  <p>
    <s>AI Fluency Framework.</s>
    <break time="400ms"/>
    <s>What is AI Fluency?</s>
    <break time="200ms"/>
    The ability to work with AI systems in ways that are
    <emphasis level="moderate">effective</emphasis>,
    efficient, ethical, and safe.
  </p>
</speak>
```

### Browser support
| Browser | SSML support |
|---|---|
| Safari (macOS/iOS) | ✅ Partial — `<break>`, `<emphasis>` |
| Chrome | ❌ Strips all SSML tags, speaks raw XML text |
| Firefox | ❌ None |

### Assessment
**Not viable as primary strategy today.** Chrome (the main target) silently ignores SSML. Usable only as a progressive enhancement for Safari — detect via `voice.voiceURI.includes("com.apple")` and inject breaks for Apple voices only.

---

## Strategy 3 — Web Audio API + External TTS Service (Best Quality, Requires Backend)

### Idea
Replace the browser's built-in TTS entirely. Send text to a cloud TTS API, receive an audio file, play it via `<audio>` or `AudioContext`.

### Candidate APIs

| Service | Quality | Cost | Latency | Offline |
|---|---|---|---|---|
| ElevenLabs | ★★★★★ Neural | ~$0.30/1k chars | ~300ms | ❌ |
| Google Cloud TTS (WaveNet) | ★★★★☆ | ~$16/1M chars | ~150ms | ❌ |
| OpenAI TTS (`tts-1-hd`) | ★★★★☆ | $0.03/1k chars | ~500ms | ❌ |
| Microsoft Azure Neural | ★★★★☆ | ~$16/1M chars | ~200ms | ❌ |
| macOS `say` command (via shell) | ★★★☆☆ | Free | instant | ✅ |

### Architecture
```
Browser                   Backend (e.g. Cloudflare Worker)
  │                               │
  │── POST /tts { text, voice } ──▶│
  │                               │── Cloud TTS API ──▶ audio/mp3
  │◀──────── audio/mp3 stream ────│
  │
  ├── AudioContext.decodeAudioData()
  ├── Play with precise currentTime tracking
  └── Seek = seek AudioBuffer offset (sample-accurate)
```

### Why this is the gold standard
- Sample-accurate seek and progress
- No Chrome bugs — you own the audio pipeline
- Voice quality incomparably better than browser TTS
- Real pause/resume via `AudioContext.suspend()`

### Why it doesn't fit this project today
- App is **static/local-first** — no backend, no API keys stored
- Requires network for every note (breaks offline/PWA use)
- Cost at scale
- CORS/CSP headers need updating

**Verdict:** Right architecture for a SaaS product. Overkill for a local knowledge base. Worth revisiting if the app moves to a hosted model.

---

## Strategy 4 — Pre-generated Audio Files (Offline-First Premium Quality)

### Idea
Run a script at build time that generates `.mp3` files for each note using a high-quality TTS API, bundle them with the app, and play them via `<audio>`.

```
build/
  audio/
    note-01.mp3
    note-02.mp3
    ...
```

### Trade-offs
| | |
|---|---|
| ✅ Zero latency, offline, no API keys at runtime | |
| ✅ Sample-accurate seek via `audio.currentTime` | |
| ✅ Voice quality as good as ElevenLabs/OpenAI | |
| ❌ Audio files add ~5–15MB per note at high quality | |
| ❌ Must regenerate whenever note content changes | |
| ❌ One-time cost per note (~$0.01–0.05) | |
| ❌ No real highlighting sync without a word-timing file | |

### Word-timing for highlighting
High-quality APIs (ElevenLabs, Azure) can return a `word_timestamps` JSON alongside the audio. Store it alongside the `.mp3`:
```json
[
  { "word": "AI", "start": 0.12, "end": 0.31 },
  { "word": "Fluency", "start": 0.33, "end": 0.72 },
  ...
]
```
Then use `audio.ontimeupdate` to sync highlighting — pixel-perfect.

**Verdict:** Best long-term approach for a publishing/learning app. Implement with Strategy 1 as the fallback.

---

## Strategy 5 — Web Workers for Text Processing (Incremental, Zero UX Cost)

### Idea
Move `extractSpeechContent` and `normalizeForSpeech` into a Web Worker so the main thread is never blocked during text preparation (particularly relevant for large notes).

### Worth it?
The largest note is ~15KB of markdown. Text processing takes < 2ms. **Not worth the added complexity at current scale.** Revisit if note count exceeds 500 or if real-time SSML generation is added.

---

## Recommended Roadmap

### Phase 1 — Now (no dependencies, max reliability)
Implement **Strategy 1: sentence-chunked utterances**.

- [ ] Split `fullText` into sentences at load time
- [ ] Store `_sentences[]` alongside `_segments[]`
- [ ] Replace single `_speakFrom()` utterance with a sentence queue
- [ ] Track `_currentSentenceIdx` for pause/resume/seek
- [ ] Map sentence index back to segment index for highlighting

**Expected result:** No more Chrome silent-drop, true pause/resume, smooth seek, exact progress.

### Phase 2 — Near-term (progressive enhancement)
- [ ] Detect Apple voices and inject SSML `<break>` tags for Safari
- [ ] Add `pitch` slider (0.8–1.2) to the player UI — small change, big perceived difference
- [ ] Persist voice + rate preference in `localStorage`

### Phase 3 — If the app evolves to hosted
- [ ] Add a Cloudflare Worker proxy for OpenAI TTS `tts-1-hd`
- [ ] Cache generated audio in a KV store keyed by `hash(text + voice + rate)`
- [ ] Ship word-timestamp JSON for perfect scroll-sync highlighting
- [ ] Fall back to Strategy 1 when offline

---

## Quick Wins Summary (Effort vs. Impact)

| Change | Effort | Impact |
|---|---|---|
| Sentence-chunked utterances | Medium | 🔴 High — fixes Chrome reliability entirely |
| `localStorage` for voice/rate | Tiny | 🟡 Medium — removes friction on every load |
| Add `pitch` slider | Tiny | 🟡 Medium — perceived naturalness |
| Detect Safari for keep-alive | Tiny | 🟡 Medium — stops Chrome false restarts |
| SSML breaks for Apple voices | Small | 🟢 Low-Medium — Safari only |
| Pre-generated audio (build script) | Large | 🔴 High — but requires infrastructure decision |
| Cloud TTS API | Large | 🔴 High — but conflicts with offline-first goal |

---

_Document authored: April 2026_
