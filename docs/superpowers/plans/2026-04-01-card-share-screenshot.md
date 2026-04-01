# Plan: Card Share/Screenshot Button

**Feature branch:** `feature/n1-weekend-strip`
**Repo:** `dthunder746/movieboyz-site` on GitHub
**Handoff target:** Gemini agent

---

## Context for Gemini

This document is a self-contained handoff. You do not have access to the Claude session that produced it, so all required context is included here.

### Project overview

`movieboyz-site` is a static GitHub Pages site for a Fantasy Box Office league. It is a vanilla JS (ES modules) + Vite build. Dependencies: Bootstrap 5.3, Tabulator 6.3, Chart.js 4.4, chartjs-plugin-zoom. No framework.

### Branch and deploy workflow

- Feature branches merge to `dev`, then `dev` merges to `main`.
- Merging to `main` triggers the "Deploy to GitHub Pages" CI workflow (~20s build).
- The `.github/workflows/` directory does not exist locally; the workflow lives only on the remote `main` branch. Do not try to read or modify it.
- After pushing any branch, check whether a CI pipeline was triggered. If one is running, monitor it with `gh run watch` and report the result.

### User constraints (from CLAUDE.md)

These are standing instructions from the user that override defaults:

- **No new packages without explicit user confirmation.** Before running `npm install` or adding anything to `package.json`, stop and ask.
- **No tests** unless explicitly requested.
- **No docstrings, comments, or type annotations** on code you did not change.
- **Commit messages:** imperative mood ("Add share button", not "Added share button"). Do not mention AI tools (Claude, Gemini, etc.) in commit messages, PR descriptions, or issue comments.
- **Docs/READMEs:** never use dashes or em dashes as punctuation. Use periods, commas, or parentheses instead.
- **Destructive actions** (force push, file deletion, branch reset): confirm with user first.
- **Ambiguous tasks:** ask before assuming.

---

## Feature: Share/Screenshot Button on Scorecard Cards

### What the user wants

A button on each owner scorecard card that lets the user share a screenshot of that card. Primary use case is sharing in group chats (WhatsApp, Discord, iMessage, etc.), but sharing anywhere (social media, etc.) is fine.

### Proposed UX

A small icon button placed at the right end of the `.scorecard-footer` (the "Next pick" row at the bottom of each open card). The button uses a share/upload icon. Clicking it:

1. Captures the `.scorecard-card` element as a PNG image.
2. Uses the **Web Share API** (`navigator.share({ files: [imageFile] })`) if available (mobile browsers, Chrome on Android, Safari on iOS).
3. Falls back to **clipboard copy** (`navigator.clipboard.write(...)`) if Web Share is unavailable (desktop Chrome, Firefox, Edge).
4. Falls back to a **PNG download** if clipboard write is also unavailable.

The button is only visible when the card is expanded (`.is-open`), because the footer is inside `.scorecard-body` which is `display: none` when collapsed. No need to handle the collapsed state.

The button must not interfere with the collapse toggle on the header. The click handler for the toggle is on `.scorecard-header`; the share button lives in `.scorecard-footer`, so there is no conflict.

### Library

DOM-to-image capture requires a library. The recommended option is **`html-to-image`** (npm package). It handles CSS variables and `color-mix()` better than `html2canvas`. Approximate size: ~45KB gzipped.

**You must ask the user for permission before installing this package.** Show them the package name, what it does, and its approximate size. Only proceed after they confirm.

If the user declines, note that `html2canvas` is an alternative with worse CSS variable support, and that a pure-CSS fallback (hiding dynamic styles before capture) is a last resort but lossy.

---

## Files to modify

All paths are relative to the repo root.

| File | What changes |
| --- | --- |
| `js/weekend-strip.js` | Add share button HTML to footer; add `captureAndShare(card)` function; attach click handler |
| `css/style.css` | Add `.scorecard-share-btn` styles |
| `package.json` | Add `html-to-image` dependency (after user confirms) |

---

## Detailed implementation steps

### Step 1: Confirm the dependency

Ask the user: "To capture the card as an image, this feature needs `html-to-image` (a DOM-to-PNG library, ~45KB gzipped). OK to add it?"

If yes, run: `npm install html-to-image`

### Step 2: Add the share button to footer HTML

In `js/weekend-strip.js`, the footer is assembled at around line 242 as a string. The footer currently ends with `nextDaysHtml` on the right. Add a share button after it.

Current structure (simplified):

```
<div class="scorecard-footer">
  <div class="scorecard-footer-left">
    <div class="scorecard-next-label">Next</div>
    <div class="scorecard-next-title">...</div>
  </div>
  <div class="scorecard-next-days">14d</div>
</div>
```

New structure:

```
<div class="scorecard-footer">
  <div class="scorecard-footer-left">
    <div class="scorecard-next-label">Next</div>
    <div class="scorecard-next-title">...</div>
  </div>
  <div class="scorecard-next-days">14d</div>
  <button class="scorecard-share-btn" title="Share card" aria-label="Share card">
    <!-- share SVG icon -->
  </button>
</div>
```

Use a Lucide share icon (inline SVG, 14x14, matching the existing icon style in the file). The existing icons use `stroke="currentColor" stroke-width="2"`. A suitable share icon:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
  <polyline points="16 6 12 2 8 6"/>
  <line x1="12" y1="2" x2="12" y2="15"/>
</svg>
```

### Step 3: Add the `captureAndShare` function

At the top of `js/weekend-strip.js`, add an import for `html-to-image`:

```js
import * as htmlToImage from 'html-to-image';
```

Add the async function before `buildWeekendStrip`:

```js
async function captureAndShare(card) {
  var dataUrl = await htmlToImage.toPng(card, { pixelRatio: 2 });
  var blob = await (await fetch(dataUrl)).blob();
  var file = new File([blob], 'scorecard.png', { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: 'MovieBoyz Scorecard' });
    return;
  }

  if (navigator.clipboard && navigator.clipboard.write) {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return;
  }

  var a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'scorecard.png';
  a.click();
}
```

### Step 4: Attach the click handler

The existing click handler on `el` (the strip container) listens for `.scorecard-header` clicks. Add a parallel check for `.scorecard-share-btn` clicks in the same listener block, or add a second delegated listener. The share button click must call `e.stopPropagation()` to prevent the collapse toggle from firing.

```js
el.addEventListener('click', function(e) {
  var shareBtn = e.target.closest('.scorecard-share-btn');
  if (shareBtn) {
    e.stopPropagation();
    var card = shareBtn.closest('.scorecard-card');
    captureAndShare(card).catch(function(err) {
      if (err.name !== 'AbortError') console.error('Share failed', err);
    });
    return;
  }

  var header = e.target.closest('.scorecard-header');
  if (!header) return;
  // ... existing collapse logic unchanged
});
```

`AbortError` is thrown when the user dismisses the native share sheet; swallow it silently.

### Step 5: Add CSS for the share button

In `css/style.css`, append to the scorecard block (after `.scorecard-next-days`):

```css
.scorecard-share-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--bs-secondary-color);
  flex-shrink: 0;
  line-height: 1;
  border-radius: 4px;
  transition: color 0.1s, background 0.1s;
}

.scorecard-share-btn:hover {
  color: var(--bs-body-color);
  background: var(--bs-tertiary-bg);
}
```

---

## Known rendering caveats

- `color-mix()` is used for `.scorecard-header:hover` via the `--scorecard-hover-bg` CSS variable. `html-to-image` should handle this, but the hover state will not be active during capture so it does not matter in practice.
- The capture target is the full `.scorecard-card` element including the top border (3px solid owner colour) and body. This gives a complete, self-contained image.
- Dark/light mode is respected automatically because `html-to-image` reads computed styles at capture time.

---

## Definition of done

- Share button appears in the footer of every open scorecard card.
- On mobile (iOS Safari / Chrome Android): tapping the button opens the native share sheet with the card image.
- On desktop Chrome/Firefox: clicking the button copies the card PNG to the clipboard.
- On browsers with neither API: clicking the button downloads `scorecard.png`.
- Dismissing the share sheet (AbortError) does not produce a console error or visible failure.
- The collapse toggle still works normally; the share button click does not collapse the card.
- No visual regressions in the scorecard strip in light and dark mode.
