# Owner Scorecard Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing `buildWeekendStrip` component with a richer owner scorecard strip — one card per owner showing weekend performance, season stats, active movies, and next upcoming pick.

**Architecture:** Complete rewrite of `js/weekend-strip.js` (same exported function signature) plus replacement of the weekend strip CSS block in `css/style.css`. No other files change. Cards are sorted by current standings rank, built from per-owner data computed inside `buildWeekendStrip`.

**Tech Stack:** Vanilla JS ES modules, Bootstrap 5.3 CSS variables, existing utility functions (`fmt`, `fmtPct`, `colorClass` from `js/utils.js`).

---

## File Map

| File | Action | Notes |
|------|--------|-------|
| `js/weekend-strip.js` | **Rewrite** | Full replacement; same export signature `buildWeekendStrip(data, owners, colorMap)` |
| `css/style.css` | **Modify** | Replace lines 258–312 (the `/* ── Weekend strip */` block) with new scorecard rules |

---

### Task 1: Replace weekend strip CSS

**Files:**
- Modify: `css/style.css:258-312`

- [ ] **Step 1: Open `css/style.css` and delete lines 258–312 (the entire `/* ── Weekend strip */` block)**

The block to remove starts at:
```css
/* ── Weekend strip ───────────────────────────────────────────────────────── */
.weekend-strip-header {
```
and ends at line 312 (the closing `}` of `.weekend-delta`).

- [ ] **Step 2: In place of the deleted block, append the following CSS**

```css
/* ── Owner scorecard strip ───────────────────────────────────────────────── */
.scorecard-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.scorecard-card {
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 8px;
  min-width: 200px;
  flex: 1 1 200px;
  max-width: 280px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Header */
.scorecard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 10px 12px 8px;
  border-bottom: 1px solid var(--bs-border-color);
}

.scorecard-header-left {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.scorecard-owner-name {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2;
}

.scorecard-owner-rank {
  font-size: 0.6875rem;
  color: var(--bs-secondary-color);
}

.scorecard-header-right {
  text-align: right;
}

.scorecard-weekend-total {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.1;
}

.scorecard-weekend-label {
  font-size: 0.59375rem;
  text-transform: uppercase;
  color: var(--bs-secondary-color);
  letter-spacing: 0.06em;
}

/* Stat grid */
.scorecard-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--bs-border-color);
  border-bottom: 1px solid var(--bs-border-color);
}

.scorecard-stat {
  background: var(--bs-tertiary-bg);
  padding: 6px 10px;
  text-align: center;
}

.scorecard-stat-value {
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.2;
}

.scorecard-stat-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  color: var(--bs-secondary-color);
  letter-spacing: 0.05em;
}

/* Movie list */
.scorecard-movies {
  padding: 6px 12px;
  flex: 1;
}

.scorecard-movie-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 3px 0;
}

.scorecard-movie-title {
  font-size: 0.71875rem;
  color: var(--bs-secondary-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  margin-right: 8px;
}

.scorecard-movie-right {
  text-align: right;
  flex-shrink: 0;
}

.scorecard-movie-gross {
  font-size: 0.8125rem;
  font-weight: 700;
}

.scorecard-movie-delta {
  font-size: 0.65625rem;
}

.scorecard-no-movies {
  font-size: 0.71875rem;
  color: var(--bs-secondary-color);
  text-align: center;
  padding: 6px 0;
}

/* Footer */
.scorecard-footer {
  background: rgba(0, 0, 0, 0.15);
  padding: 6px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.scorecard-footer-left {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.scorecard-next-label {
  font-size: 0.5625rem;
  text-transform: uppercase;
  color: var(--bs-secondary-color);
  letter-spacing: 0.06em;
  line-height: 1;
}

.scorecard-next-title {
  font-size: 0.6875rem;
  color: var(--bs-secondary-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scorecard-next-days {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--bs-info);
  flex-shrink: 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "Replace weekend strip CSS with owner scorecard strip styles"
```

---

### Task 2: Rewrite js/weekend-strip.js

**Files:**
- Modify: `js/weekend-strip.js` (full rewrite)

The new implementation:
- Derives `currentWeek` and `prevWeek` from the union of `weekly_gross` keys across all movies.
- Derives `LATEST_DATE` from the union of `total` keys across all owners (same approach as `leaderboard.js` uses its passed-in `LATEST_PROFIT_DATE`).
- Sorts cards by rank (descending `total[LATEST_DATE]`).
- Builds each card's four sections (header, stat grid, movie list, footer) as HTML strings, consistent with the string-concatenation style used in `leaderboard.js`.

- [ ] **Step 1: Replace the entire contents of `js/weekend-strip.js` with the following**

```javascript
import { fmt, fmtPct, colorClass } from './utils.js';

export function buildWeekendStrip(data, owners, colorMap) {
  var el = document.getElementById('weekend-strip');
  if (!el) return;

  // ── Week key resolution ──────────────────────────────────────────────────
  var allWeekKeys = new Set();
  Object.values(data.movies).forEach(function(m) {
    Object.keys(m.weekly_gross || {}).forEach(function(w) { allWeekKeys.add(w); });
  });
  var sortedWeeks = Array.from(allWeekKeys).sort();
  if (!sortedWeeks.length) { el.classList.add('d-none'); return; }
  var currentWeek = sortedWeeks[sortedWeeks.length - 1];
  var prevWeek = sortedWeeks.length > 1 ? sortedWeeks[sortedWeeks.length - 2] : null;

  // ── LATEST_DATE — max date key across all owners' total series ───────────
  var allDates = new Set();
  Object.values(data.owners || {}).forEach(function(od) {
    Object.keys(od.total || {}).forEach(function(d) { allDates.add(d); });
  });
  var sortedDates = Array.from(allDates).sort();
  if (!sortedDates.length) { el.classList.add('d-none'); return; }
  var LATEST_DATE = sortedDates[sortedDates.length - 1];

  // ── Today (for upcoming pick calculation) ────────────────────────────────
  var todayStr = new Date().toISOString().split('T')[0];

  // ── Rank map — owners ordered by total[LATEST_DATE] descending ───────────
  var ranked = owners.slice().sort(function(a, b) {
    var av = ((data.owners[a] || {}).total || {})[LATEST_DATE];
    var bv = ((data.owners[b] || {}).total || {})[LATEST_DATE];
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av;
  });
  var rankMap = {};
  ranked.forEach(function(o, i) { rankMap[o] = i + 1; });

  // ── Stat cell helper ─────────────────────────────────────────────────────
  // format: 'plain' (dollar via fmt), 'signed' (dollar with + prefix), 'pct' (via fmtPct)
  function statCell(val, label, format) {
    var displayVal, cls;
    if (val === null || val === undefined) {
      displayVal = '—';
      cls = 'text-neu';
    } else if (format === 'pct') {
      displayVal = fmtPct(val);
      cls = colorClass(val);
    } else if (format === 'signed') {
      displayVal = (val > 0 ? '+' : '') + fmt(val);
      cls = colorClass(val);
    } else {
      displayVal = fmt(val);
      cls = colorClass(val);
    }
    return '<div class="scorecard-stat">'
      + '<div class="scorecard-stat-value ' + cls + '">' + displayVal + '</div>'
      + '<div class="scorecard-stat-label">' + label + '</div>'
      + '</div>';
  }

  // ── Build each owner's card ──────────────────────────────────────────────
  var html = '<div class="scorecard-strip">';

  ranked.forEach(function(owner) {
    var od = data.owners[owner] || {};
    var ownerMovies = Object.values(data.movies).filter(function(m) { return m.owner === owner; });

    // Weekend totals (sum across all owner movies for currentWeek and prevWeek)
    var currentTotal = 0;
    var prevTotal = 0;
    var hasCurrentGross = false;
    ownerMovies.forEach(function(m) {
      var wg = m.weekly_gross || {};
      var cg = wg[currentWeek];
      if (cg != null && cg > 0) { currentTotal += cg; hasCurrentGross = true; }
      if (prevWeek !== null) {
        var pg = wg[prevWeek];
        if (pg != null) prevTotal += pg;
      }
    });
    // Wk Delta: null when owner has no current gross or there is no previous week
    var wkDelta = (hasCurrentGross && prevWeek !== null) ? currentTotal - prevTotal : null;

    // Owner-level season stats
    var season = (od.total || {})[LATEST_DATE];
    season = season != null ? season : null;
    var bomb = (od.bomb_impact || {})[LATEST_DATE];
    bomb = bomb != null ? bomb : null;
    var picksProfit = (od.picks_profit || {})[LATEST_DATE];
    picksProfit = picksProfit != null ? picksProfit : null;

    // ROI = picks_profit / sum(movie.breakeven) * 100 — null if denominator is zero/missing
    var totalBreakeven = 0;
    ownerMovies.forEach(function(m) {
      if (m.breakeven != null) totalBreakeven += m.breakeven;
    });
    var roi = (picksProfit !== null && totalBreakeven > 0)
      ? picksProfit / totalBreakeven * 100
      : null;

    // Active movies this weekend — sorted by gross descending
    var activeMovies = ownerMovies.filter(function(m) {
      var cg = (m.weekly_gross || {})[currentWeek];
      return cg != null && cg > 0;
    }).sort(function(a, b) {
      return ((b.weekly_gross || {})[currentWeek] || 0) - ((a.weekly_gross || {})[currentWeek] || 0);
    });

    // Next upcoming pick — days_running == null, future release_date, take earliest
    var upcoming = ownerMovies.filter(function(m) {
      return m.days_running == null && m.release_date && m.release_date > todayStr;
    }).sort(function(a, b) { return a.release_date < b.release_date ? -1 : 1; });
    var nextMovie = upcoming.length ? upcoming[0] : null;
    var daysUntil = nextMovie
      ? Math.ceil((new Date(nextMovie.release_date) - new Date(todayStr)) / 86400000)
      : null;

    // ── Header ──────────────────────────────────────────────────────────────
    var totalHtml = hasCurrentGross
      ? '<span class="scorecard-weekend-total ' + colorClass(currentTotal) + '">' + fmt(currentTotal) + '</span>'
      : '<span class="scorecard-weekend-total text-neu">—</span>';

    var headerHtml = '<div class="scorecard-header">'
      + '<div class="scorecard-header-left">'
      + '<span class="owner-dot" style="background:' + colorMap[owner] + '"></span>'
      + '<div>'
      + '<div class="scorecard-owner-name">' + owner + '</div>'
      + '<div class="scorecard-owner-rank">#' + rankMap[owner] + '</div>'
      + '</div>'
      + '</div>'
      + '<div class="scorecard-header-right">'
      + totalHtml
      + '<div class="scorecard-weekend-label">This Weekend</div>'
      + '</div>'
      + '</div>';

    // ── Stat grid ────────────────────────────────────────────────────────────
    var statGridHtml = '<div class="scorecard-stats">'
      + statCell(season, 'Season', 'plain')
      + statCell(wkDelta, 'Wk Delta', 'signed')
      + statCell(bomb, 'Bomb Impact', 'plain')
      + statCell(roi, 'ROI', 'pct')
      + '</div>';

    // ── Movie list ────────────────────────────────────────────────────────────
    var moviesHtml;
    if (!activeMovies.length) {
      moviesHtml = '<div class="scorecard-movies">'
        + '<div class="scorecard-no-movies">No movies in theaters this weekend</div>'
        + '</div>';
    } else {
      var rows = activeMovies.map(function(m) {
        var cg = (m.weekly_gross || {})[currentWeek] || 0;
        var pg = prevWeek !== null ? ((m.weekly_gross || {})[prevWeek] || null) : null;
        var d = pg !== null ? cg - pg : null;
        var deltaHtml = d !== null
          ? '<div class="scorecard-movie-delta ' + colorClass(d) + '">' + (d >= 0 ? '+' : '') + fmt(d) + '</div>'
          : '';
        return '<div class="scorecard-movie-row">'
          + '<div class="scorecard-movie-title" title="' + m.movie_title + '">' + m.movie_title + '</div>'
          + '<div class="scorecard-movie-right">'
          + '<div class="scorecard-movie-gross">' + fmt(cg) + '</div>'
          + deltaHtml
          + '</div>'
          + '</div>';
      }).join('');
      moviesHtml = '<div class="scorecard-movies">' + rows + '</div>';
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    var nextTitleHtml = nextMovie
      ? '<div class="scorecard-next-title" title="' + nextMovie.movie_title + '">' + nextMovie.movie_title + '</div>'
      : '<div class="scorecard-next-title">None scheduled</div>';
    var nextDaysHtml = daysUntil !== null
      ? '<div class="scorecard-next-days">' + daysUntil + 'd</div>'
      : '<div class="scorecard-next-days text-neu">—</div>';

    var footerHtml = '<div class="scorecard-footer">'
      + '<div class="scorecard-footer-left">'
      + '<div class="scorecard-next-label">Next</div>'
      + nextTitleHtml
      + '</div>'
      + nextDaysHtml
      + '</div>';

    // ── Assemble card ─────────────────────────────────────────────────────────
    html += '<div class="scorecard-card" style="border-top:3px solid ' + colorMap[owner] + '">'
      + headerHtml
      + statGridHtml
      + moviesHtml
      + footerHtml
      + '</div>';
  });

  html += '</div>';
  el.classList.remove('d-none');
  el.innerHTML = html;
}
```

- [ ] **Step 2: Verify the build runs without errors**

```bash
cd /path/to/movieboyz-site && npm run build
```

Expected: build completes with no errors. If Vite reports an import error, check that `fmtPct` is exported from `js/utils.js` (it is — line 12).

- [ ] **Step 3: Start the dev server and do a visual smoke-check**

```bash
npm run dev
```

Open the dev URL in a browser. Check:
- Scorecard strip appears between nav and leaderboard
- One card per owner, ordered by standings rank
- Each card has: coloured top border, header with dot/name/rank + weekend gross, 2×2 stat grid, movie list, footer
- Owners with no movies this weekend show `—` for weekend total and "No movies in theaters this weekend" in the movie list
- Owners with no upcoming picks show "None scheduled" in the footer
- Light/dark theme toggle does not break card colours (all using Bootstrap CSS variables)

- [ ] **Step 4: Commit**

```bash
git add js/weekend-strip.js
git commit -m "Rewrite buildWeekendStrip as owner scorecard strip"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Covered by |
|-------------|------------|
| One card per owner, sorted by rank | `ranked` array, `rankMap` |
| Header: dot + name + rank (left), weekend total + label (right) | `headerHtml` |
| No movies this weekend → `—` total | `hasCurrentGross` guard |
| Stat grid: Season, Wk Delta, Bomb Impact, ROI | `statGridHtml`, `statCell()` |
| ROI formula: picks_profit / totalBreakeven × 100 | `roi` computation |
| ROI `—` when denominator zero/missing | `totalBreakeven > 0` guard |
| Movie list: active movies sorted descending by gross | `activeMovies` |
| Movie row: title + gross + delta | `rows` map |
| No active movies → "No movies in theaters this weekend" | `!activeMovies.length` branch |
| Delta omitted when no prevWeek data | `pg !== null` guard |
| Footer: NEXT label + upcoming title + days until | `footerHtml` |
| No upcoming → "None scheduled" / `—` | `nextMovie` null guard |
| Top border 3px in owner colour | inline `style="border-top:3px solid …"` |
| Card background: `--bs-body-bg` | `.scorecard-card` CSS |
| Stat grid: `--bs-tertiary-bg` cells, `--bs-border-color` gaps | `.scorecard-stats` grid CSS |
| Footer: `rgba(0,0,0,0.15)` | `.scorecard-footer` CSS |
| Colour classes via `.text-pos/.text-neg/.text-neu` | `colorClass()` throughout |
| No hardcoded hex colours in CSS | confirmed — all Bootstrap variables |
| Card sizing: 200px min, flex 1 1 200px, 280px max | `.scorecard-card` CSS |
| LATEST_DATE null → strip hidden | `sortedDates.length` guard |
| No week keys → strip hidden | `sortedWeeks.length` guard |
| Prev week null → Wk Delta shows `—` | `wkDelta = null` when `prevWeek === null` |

**Placeholder scan:** No TBDs, no TODOs, no "similar to" references. All code blocks are complete.

**Type consistency:** `statCell(val, label, format)` used consistently in Task 2 with formats `'plain'`, `'signed'`, `'pct'`. CSS classes introduced in Task 1 (`scorecard-card`, `scorecard-header`, etc.) all appear in the Task 2 HTML. No mismatches found.
