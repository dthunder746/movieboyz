# N1: "This Weekend" Strip — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a row of Bootstrap cards between the nav and the leaderboard that shows each owner's active movie, its current partial-week gross, and the delta vs. last weekend.

**Architecture:** New module `js/weekend-strip.js` exports a single `buildWeekendStrip(data, owners, colorMap, LATEST_DATE)` function. Called once from `app.js` `init()`. Renders into a new `#weekend-strip` div in `index.html`. Styles added to `css/style.css`. No new dependencies.

**Tech Stack:** Vanilla JS ES modules, Bootstrap 5.3, existing `utils.js` helpers (`fmt`, `colorClass`, `dateToIsoWeekKey`, `isoWeekBounds`, `formatShortDate`).

---

### Task 1: Create feature branch

**Files:**
- No file changes — git only

- [ ] **Step 1: Create and check out feature branch**

```bash
cd /Users/marcus/Documents/Projects/movieboyz-site
git checkout -b feature/n1-weekend-strip
```

Expected: `Switched to a new branch 'feature/n1-weekend-strip'`

---

### Task 2: Add `#weekend-strip` placeholder to `index.html`

**Files:**
- Modify: `index.html` (between `</nav>` close and the `<div class="container-fluid">` main block — add inside the container div, before the leaderboard heading)

- [ ] **Step 1: Insert the strip container**

In `index.html`, after the opening `<div class="container-fluid px-3">` (line 42) and before the leaderboard heading (line 45), add:

```html
  <!-- Weekend Strip -->
  <div id="weekend-strip" class="mb-3"></div>

```

Result — the top of the main `<div class="container-fluid px-3">` block should read:

```html
<div class="container-fluid px-3">

  <!-- Weekend Strip -->
  <div id="weekend-strip" class="mb-3"></div>

  <!-- Leaderboard -->
  <h6 class="text-uppercase text-muted fw-semibold mb-2" style="letter-spacing:.08em">Standings</h6>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "Add #weekend-strip placeholder to index.html"
```

---

### Task 3: Create `js/weekend-strip.js`

**Files:**
- Create: `js/weekend-strip.js`

"Active movie" per owner: the most recently released movie (by `release_date`) where `days_running != null`. Current week gross comes from `movie.weekly_gross[currentWeekKey]`. Delta is current week gross minus previous week gross (using the week key immediately before `currentWeekKey` in sorted order across all movies).

**Known edge case:** If no movie had any gross in the immediately preceding ISO week (gap week), `prevWeek` will point to an older week, producing a delta vs. a non-adjacent week. This is acceptable for the initial implementation.

- [ ] **Step 1: Create the file**

```js
import { fmt, colorClass, dateToIsoWeekKey, isoWeekBounds, formatShortDate } from './utils.js';

export function buildWeekendStrip(data, owners, colorMap, LATEST_DATE) {
  var el = document.getElementById('weekend-strip');
  if (!el) return;

  if (!LATEST_DATE) { el.classList.add('d-none'); return; }

  var currentWeek = dateToIsoWeekKey(LATEST_DATE);
  var bounds = isoWeekBounds(currentWeek);

  // Collect all week keys across all movies to find the previous week
  var allWeekKeys = new Set();
  Object.values(data.movies).forEach(function(m) {
    Object.keys(m.weekly_gross || {}).forEach(function(w) { allWeekKeys.add(w); });
  });
  var sortedWeeks = Array.from(allWeekKeys).sort();
  var prevWeekIdx = sortedWeeks.indexOf(currentWeek) - 1;
  var prevWeek = prevWeekIdx >= 0 ? sortedWeeks[prevWeekIdx] : null;

  // Build one card per owner — pick the most recently released movie
  var cards = owners.map(function(owner) {
    var released = Object.values(data.movies).filter(function(m) {
      return m.owner === owner && m.days_running != null;
    });
    if (!released.length) return null;

    released.sort(function(a, b) {
      return (a.release_date || '') < (b.release_date || '') ? 1 : -1;
    });
    var movie = released[0];

    var currentGross = (movie.weekly_gross || {})[currentWeek];
    currentGross = currentGross !== undefined ? currentGross : null;
    var prevGross = prevWeek !== null ? ((movie.weekly_gross || {})[prevWeek] || null) : null;
    var delta = (currentGross !== null && prevGross !== null) ? currentGross - prevGross : null;

    return { owner: owner, movie: movie, currentGross: currentGross, delta: delta, color: colorMap[owner] };
  }).filter(Boolean);

  if (!cards.length) { el.classList.add('d-none'); return; }

  var weekLabel = formatShortDate(bounds.start) + '\u2013' + formatShortDate(bounds.end);

  var html = '<div class="weekend-strip-header">'
    + '<span class="text-uppercase text-muted fw-semibold" style="font-size:0.75rem;letter-spacing:.08em">This Weekend</span>'
    + '<span class="text-muted ms-2" style="font-size:0.75rem">' + weekLabel + '</span>'
    + '</div>'
    + '<div class="weekend-strip-cards">';

  cards.forEach(function(c) {
    var pickType = (c.movie.pick_type || 'hit').toLowerCase();
    var pickLabel = pickType.charAt(0).toUpperCase() + pickType.slice(1);

    var grossHtml = c.currentGross !== null
      ? '<span class="weekend-gross">' + fmt(c.currentGross) + '</span>'
      : '<span class="text-neu weekend-gross">—</span>';

    var deltaHtml = '';
    if (c.delta !== null) {
      var sign = c.delta > 0 ? '+' : '';
      deltaHtml = '<span class="weekend-delta ' + colorClass(c.delta) + '">'
        + sign + fmt(c.delta) + ' vs last wk'
        + '</span>';
    }

    html += '<div class="weekend-card">'
      + '<div class="weekend-card-owner">'
      + '<span class="owner-dot" style="background:' + c.color + '"></span>'
      + '<span class="fw-medium">' + c.owner + '</span>'
      + '<span class="pick-badge pick-' + pickType + ' ms-1">' + pickLabel + '</span>'
      + '</div>'
      + '<div class="weekend-card-title" title="' + c.movie.movie_title + '">' + c.movie.movie_title + '</div>'
      + '<div class="weekend-card-gross">' + grossHtml + deltaHtml + '</div>'
      + '</div>';
  });

  html += '</div>';
  el.innerHTML = html;
}
```

- [ ] **Step 2: Commit**

```bash
git add js/weekend-strip.js
git commit -m "Add weekend-strip module"
```

---

### Task 4: Wire `buildWeekendStrip` into `app.js`

**Files:**
- Modify: `js/app.js` — add import at top, call in `init()`

- [ ] **Step 1: Add import**

In `js/app.js`, add to the import block at the top (after the existing imports):

```js
import { buildWeekendStrip } from './weekend-strip.js';
```

- [ ] **Step 2: Call in `init()`**

In `js/app.js`, in the `init()` function, after the line:

```js
  buildLeaderboard(data, owners, colorMap, LATEST_PROFIT_DATE, []);
```

add:

```js
  buildWeekendStrip(data, owners, colorMap, LATEST_PROFIT_DATE);
```

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "Wire buildWeekendStrip into app init"
```

---

### Task 5: Add CSS for the strip

**Files:**
- Modify: `css/style.css` — append new rules at the end

- [ ] **Step 1: Add styles**

Append to the end of `css/style.css`:

```css
/* ── Weekend strip ───────────────────────────────────────────────────────── */
.weekend-strip-header {
  margin-bottom: 0.5rem;
}

.weekend-strip-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.weekend-card {
  background: var(--bs-tertiary-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 6px;
  padding: 10px 14px;
  min-width: 150px;
  flex: 1 1 150px;
  max-width: 240px;
}

.weekend-card-owner {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
  font-size: 0.85rem;
}

.weekend-card-title {
  font-size: 0.8rem;
  color: var(--bs-secondary-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
  max-width: 200px;
}

.weekend-card-gross {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}

.weekend-gross {
  font-size: 1rem;
  font-weight: 600;
}

.weekend-delta {
  font-size: 0.72rem;
  opacity: 0.85;
}
```

- [ ] **Step 2: Commit**

```bash
git add css/style.css
git commit -m "Add weekend strip styles"
```

---

### Task 6: Smoke test

- [ ] **Step 1: Build and verify**

```bash
cd /Users/marcus/Documents/Projects/movieboyz-site
npm run dev
```

Open the local dev server URL. Verify:
- A row of cards appears above the leaderboard
- One card per owner with a released movie
- Each card shows owner name, colour dot, pick-type badge, movie title, gross value (or `—`), and delta vs. last week (if data available)
- Dark/light theme toggle still works and cards update their background/border accordingly
- No console errors

- [ ] **Step 2: Stop dev server when done** (`Ctrl+C`)

---

### Task 7: Push branch

- [ ] **Step 1: Push to remote**

```bash
git push -u origin feature/n1-weekend-strip
```

Do NOT open a PR or merge into `dev` or `main` — leave that for the user to approve.
