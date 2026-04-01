# Scorecard Strip v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the owner scorecard strip to full-width collapsible cards with cookie-persisted state, a four-stat summary row (responsive), a minimalist movie table showing all released movies with pick-type icons, and an updated Season Total header.

**Architecture:** Both files are rewritten from scratch. `css/style.css` gets a new scorecard block replacing the existing one. `js/weekend-strip.js` gains four new helpers at module scope (Lucide icon map, `pickIcon`, two date helpers, two cookie helpers), then the main `buildWeekendStrip` function renders the new markup and attaches a single delegated click listener for collapse toggling.

**Tech Stack:** Vanilla JS ES modules, Bootstrap 5.3 CSS variables, Lucide SVG icons (inline), `document.cookie` for state persistence.

---

## File Map

| File | Action | Notes |
|------|--------|-------|
| `css/style.css` | Modify lines 258–end | Replace entire scorecard block with new rules |
| `js/weekend-strip.js` | Rewrite | Same export signature; module-scope helpers added above function |

---

### Task 1: Replace scorecard CSS block

**Files:**
- Modify: `css/style.css:258-end`

The current block starts at line 258 (`/* ── Owner scorecard strip */`) and runs to the end of the file. Replace everything from that comment to the end of file with the following.

- [ ] **Step 1: Delete lines 258 to end-of-file in `css/style.css`**

Open the file, find the line that reads `/* ── Owner scorecard strip ─────...*/` and delete it and everything after it.

- [ ] **Step 2: Append the new CSS block to `css/style.css`**

```css
/* ── Owner scorecard strip ───────────────────────────────────────────────── */
.scorecard-strip {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 1.5rem;
}

.scorecard-card {
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 8px;
  overflow: hidden;
}

.scorecard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
  transition: background 0.1s;
}

.scorecard-header:hover {
  background: var(--bs-tertiary-bg);
}

.scorecard-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.scorecard-toggle-icon {
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 8px solid var(--bs-secondary-color);
  transition: transform 0.15s ease;
  flex-shrink: 0;
}

.scorecard-card.is-open .scorecard-toggle-icon {
  transform: rotate(90deg);
}

.scorecard-owner-name {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2;
}

.scorecard-owner-rank {
  font-size: 0.69rem;
  color: var(--bs-secondary-color);
}

.scorecard-header-right {
  text-align: right;
  flex-shrink: 0;
  margin-left: 12px;
}

.scorecard-season-total {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.1;
}

.scorecard-season-label {
  font-size: 0.59rem;
  text-transform: uppercase;
  color: var(--bs-secondary-color);
  letter-spacing: 0.06em;
}

.scorecard-body {
  display: none;
  border-top: 1px solid var(--bs-border-color);
}

.scorecard-card.is-open .scorecard-body {
  display: block;
}

.scorecard-stats {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 1px;
  background: var(--bs-border-color);
  border-bottom: 1px solid var(--bs-border-color);
}

@media (max-width: 575.98px) {
  .scorecard-stats {
    grid-template-columns: 1fr 1fr;
  }
}

.scorecard-stat {
  background: var(--bs-tertiary-bg);
  padding: 6px 10px;
  text-align: center;
}

.scorecard-stat-value {
  font-size: 0.81rem;
  font-weight: 600;
  line-height: 1.2;
}

.scorecard-stat-label {
  font-size: 0.63rem;
  text-transform: uppercase;
  color: var(--bs-secondary-color);
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.scorecard-movies {
  padding: 0 12px 6px;
}

.scorecard-movie-table {
  width: 100%;
  border-collapse: collapse;
}

.scorecard-movie-table th {
  font-size: 0.63rem;
  text-transform: uppercase;
  color: var(--bs-secondary-color);
  letter-spacing: 0.04em;
  font-weight: 500;
  padding: 6px 4px 4px;
  border-bottom: 1px solid var(--bs-border-color);
  text-align: right;
  white-space: nowrap;
}

.scorecard-movie-table th:first-child {
  text-align: left;
}

.scorecard-movie-table td {
  font-size: 0.75rem;
  padding: 4px;
  border-bottom: 1px solid var(--bs-border-color);
  vertical-align: middle;
  text-align: right;
  white-space: nowrap;
}

.scorecard-movie-table td:first-child {
  text-align: left;
  white-space: normal;
  max-width: 160px;
}

.scorecard-movie-table tbody tr:last-child td {
  border-bottom: none;
}

.scorecard-pick-icon {
  display: inline-flex;
  align-items: center;
  margin-right: 4px;
  vertical-align: middle;
  opacity: 0.7;
}

.scorecard-no-movies {
  font-size: 0.72rem;
  color: var(--bs-secondary-color);
  text-align: center;
  padding: 8px 0;
}

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
  font-size: 0.56rem;
  text-transform: uppercase;
  color: var(--bs-secondary-color);
  letter-spacing: 0.06em;
  line-height: 1;
}

.scorecard-next-title {
  font-size: 0.69rem;
  color: var(--bs-secondary-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 3px;
}

.scorecard-next-days {
  font-size: 0.69rem;
  font-weight: 700;
  color: var(--bs-info);
  flex-shrink: 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "Rewrite scorecard strip CSS for v2 design"
```

---

### Task 2: Rewrite js/weekend-strip.js

**Files:**
- Modify: `js/weekend-strip.js` (full rewrite)

Key data sources used below — all from `data` passed in by `app.js`:
- `data.movies[id].gross_td` → Gross TD (same field as main table)
- `data.movies[id].profit_td` → Profit TD (same field as main table)
- `data.movies[id].breakeven` → B/E
- `data.movies[id].weekly_gross[weekKey]` → per-ISO-week box office
- `data.movies[id].pick_type` → one of `'Hit'`, `'Bomb'`, `'Winter'`, `'Summer'`, `'Fall'` (may be null)
- `data.movies[id].days_running` → null = not yet released
- `data.owners[o].picks_profit[LATEST_DATE]` → cumulative picks P&L (excludes bombs)
- `data.owners[o].bomb_impact[LATEST_DATE]` → cumulative bomb loss
- `data.owners[o].total[LATEST_DATE]` → season total
- Week Δ = `total[LATEST_DATE] - total[WEEK_START]` where `WEEK_START` is the floor date in `sortedDates` that is ≤ `LATEST_DATE - 7 days` (identical to the leaderboard's Wk Δ column)
- ROI excl. bombs = `picks_profit[LATEST_DATE] / sum(non-bomb movie.breakeven) × 100`

- [ ] **Step 1: Replace the entire contents of `js/weekend-strip.js` with the following**

```javascript
import { fmt, fmtPct, colorClass } from './utils.js';

// ── Lucide pick-type icons (inline SVG, 11×11) ────────────────────────────
var PICK_ICONS = {
  hit:    '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  winter: '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/></svg>',
  summer: '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
  fall:   '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
  bomb:   '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="13" r="9"/><path d="m19.5 9.5 1.8-1.8a2.4 2.4 0 0 0 0-3.4l-1.6-1.6a2.4 2.4 0 0 0-3.4 0l-1.8 1.8"/><path d="m22 2-1.5 1.5"/></svg>',
};

// 9×9 bomb icon used inline in the ROI stat label
var BOMB_ICON_SM = '<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="13" r="9"/><path d="m19.5 9.5 1.8-1.8a2.4 2.4 0 0 0 0-3.4l-1.6-1.6a2.4 2.4 0 0 0-3.4 0l-1.8 1.8"/><path d="m22 2-1.5 1.5"/></svg>';

function pickIcon(pickType) {
  if (!pickType) return '';
  var key = pickType.toLowerCase();
  return PICK_ICONS[key] ? '<span class="scorecard-pick-icon">' + PICK_ICONS[key] + '</span>' : '';
}

// ── Date helpers (mirrors unexported locals in leaderboard.js) ────────────
function shiftDate(isoDate, deltaDays) {
  var d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().split('T')[0];
}

function findFloorDate(sortedDates, target) {
  var result = null;
  for (var i = 0; i < sortedDates.length; i++) {
    if (sortedDates[i] <= target) result = sortedDates[i];
    else break;
  }
  return result;
}

// ── Cookie helpers ────────────────────────────────────────────────────────
function readCollapsedCookie() {
  var match = document.cookie.match(/(?:^|;)\s*scorecard_collapsed=([^;]*)/);
  if (!match) return null;
  try { return JSON.parse(decodeURIComponent(match[1])); } catch(e) { return null; }
}

function writeCollapsedCookie(state) {
  var exp = new Date();
  exp.setFullYear(exp.getFullYear() + 1);
  document.cookie = 'scorecard_collapsed=' + encodeURIComponent(JSON.stringify(state))
    + '; expires=' + exp.toUTCString() + '; path=/; SameSite=Lax';
}

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

  // ── LATEST_DATE ──────────────────────────────────────────────────────────
  var allDates = new Set();
  Object.values(data.owners || {}).forEach(function(od) {
    Object.keys(od.total || {}).forEach(function(d) { allDates.add(d); });
  });
  var sortedDates = Array.from(allDates).sort();
  if (!sortedDates.length) { el.classList.add('d-none'); return; }
  var LATEST_DATE = sortedDates[sortedDates.length - 1];

  // ── WEEK_START for Wk Δ (same calc as leaderboard: floor date 7 days back) ──
  var WEEK_START = findFloorDate(sortedDates, shiftDate(LATEST_DATE, -7));

  // ── Today ────────────────────────────────────────────────────────────────
  var todayStr = new Date().toISOString().split('T')[0];

  // ── Rank map — ordered by total[LATEST_DATE] descending ──────────────────
  var ranked = owners.slice().sort(function(a, b) {
    var av = ((data.owners[a] || {}).total || {})[LATEST_DATE];
    var bv = ((data.owners[b] || {}).total || {})[LATEST_DATE];
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av;
  });
  var rankMap = {};
  ranked.forEach(function(o, i) { rankMap[o] = i + 1; });

  // ── Collapsed state — default all collapsed; cookie overrides per owner ───
  var cookieState = readCollapsedCookie();
  function isOpen(owner) {
    return !!(cookieState && cookieState[owner] === true);
  }

  // ── Stat cell helper ─────────────────────────────────────────────────────
  // labelHtml may contain HTML (e.g. inline SVG for bomb icon in ROI label)
  function statCell(val, labelHtml, format) {
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
      + '<div class="scorecard-stat-label">' + labelHtml + '</div>'
      + '</div>';
  }

  // ── Build cards ──────────────────────────────────────────────────────────
  var html = '<div class="scorecard-strip">';

  ranked.forEach(function(owner) {
    var od = data.owners[owner] || {};
    var ownerMovies = Object.values(data.movies).filter(function(m) { return m.owner === owner; });
    var open = isOpen(owner);

    // Season total (header right)
    var season = (od.total || {})[LATEST_DATE];
    season = season != null ? season : null;

    // Stat grid
    var picksTotal = (od.picks_profit || {})[LATEST_DATE];
    picksTotal = picksTotal != null ? picksTotal : null;
    var bombImpact = (od.bomb_impact || {})[LATEST_DATE];
    bombImpact = bombImpact != null ? bombImpact : null;
    var totalVal = (od.total || {})[LATEST_DATE];
    totalVal = totalVal != null ? totalVal : null;
    var weekStartVal = WEEK_START ? (od.total || {})[WEEK_START] : undefined;
    var wkDelta = (totalVal !== null && weekStartVal !== undefined && weekStartVal !== null)
      ? totalVal - weekStartVal
      : null;
    // ROI excl. bombs: picks_profit / sum(non-bomb breakeven) * 100
    var totalBreakeven = 0;
    ownerMovies.forEach(function(m) {
      if (m.pick_type && m.pick_type.toLowerCase() !== 'bomb' && m.breakeven != null) {
        totalBreakeven += m.breakeven;
      }
    });
    var roi = (picksTotal !== null && totalBreakeven > 0) ? picksTotal / totalBreakeven * 100 : null;

    // ── Header ──────────────────────────────────────────────────────────────
    var seasonHtml = season !== null
      ? '<span class="scorecard-season-total ' + colorClass(season) + '">' + fmt(season) + '</span>'
      : '<span class="scorecard-season-total text-neu">—</span>';

    var headerHtml = '<div class="scorecard-header" data-owner="' + owner + '">'
      + '<div class="scorecard-header-left">'
      + '<span class="scorecard-toggle-icon"></span>'
      + '<span class="owner-dot" style="background:' + colorMap[owner] + '"></span>'
      + '<div>'
      + '<div class="scorecard-owner-name">' + owner + '</div>'
      + '<div class="scorecard-owner-rank">#' + rankMap[owner] + '</div>'
      + '</div>'
      + '</div>'
      + '<div class="scorecard-header-right">'
      + seasonHtml
      + '<div class="scorecard-season-label">Season Total</div>'
      + '</div>'
      + '</div>';

    // ── Stat grid ────────────────────────────────────────────────────────────
    var statGridHtml = '<div class="scorecard-stats">'
      + statCell(picksTotal,  'Picks Total',                     'plain')
      + statCell(bombImpact,  'Bomb Impact',                     'plain')
      + statCell(wkDelta,     'Week &#916;',                     'signed')
      + statCell(roi,         'ROI excl. ' + BOMB_ICON_SM,       'pct')
      + '</div>';

    // ── Movie table (all released movies, sorted by release date) ─────────────
    var releasedMovies = ownerMovies.filter(function(m) { return m.days_running != null; })
      .sort(function(a, b) { return (a.release_date || '') < (b.release_date || '') ? -1 : 1; });

    var movieTableHtml;
    if (!releasedMovies.length) {
      movieTableHtml = '<div class="scorecard-movies"><div class="scorecard-no-movies">No movies released yet</div></div>';
    } else {
      var tableRows = releasedMovies.map(function(m) {
        var wg = m.weekly_gross || {};
        var cg = wg[currentWeek] != null ? wg[currentWeek] : null;
        var wgPrev = prevWeek !== null ? wg[prevWeek] : undefined;
        var pg = prevWeek !== null && wgPrev != null ? wgPrev : null;
        var wkD = (cg !== null && pg !== null) ? cg - pg : null;
        var wkDHtml = wkD !== null
          ? '<span class="' + colorClass(wkD) + '">' + (wkD >= 0 ? '+' : '') + fmt(wkD) + '</span>'
          : '<span class="text-neu">—</span>';
        var profitTd = m.profit_td != null ? m.profit_td : null;
        return '<tr>'
          + '<td>' + pickIcon(m.pick_type) + m.movie_title + '</td>'
          + '<td>' + (m.breakeven != null ? fmt(m.breakeven) : '<span class="text-neu">—</span>') + '</td>'
          + '<td>' + (m.gross_td != null ? fmt(m.gross_td) : '<span class="text-neu">—</span>') + '</td>'
          + '<td class="' + colorClass(profitTd) + '">' + fmt(profitTd) + '</td>'
          + '<td>' + wkDHtml + '</td>'
          + '</tr>';
      }).join('');
      movieTableHtml = '<div class="scorecard-movies">'
        + '<table class="scorecard-movie-table">'
        + '<thead><tr>'
        + '<th>Movie</th><th>B/E</th><th>Gross TD</th><th>Profit TD</th><th>Wk &#916;</th>'
        + '</tr></thead>'
        + '<tbody>' + tableRows + '</tbody>'
        + '</table>'
        + '</div>';
    }

    // ── Footer (next unreleased pick) ─────────────────────────────────────────
    var upcoming = ownerMovies.filter(function(m) {
      return m.days_running == null && m.release_date && m.release_date > todayStr;
    }).sort(function(a, b) { return a.release_date < b.release_date ? -1 : 1; });
    var nextMovie = upcoming.length ? upcoming[0] : null;
    var daysUntil = nextMovie
      ? Math.ceil((new Date(nextMovie.release_date) - new Date(todayStr)) / 86400000)
      : null;

    var nextTitleHtml = nextMovie
      ? '<div class="scorecard-next-title" title="' + nextMovie.movie_title + '">'
          + pickIcon(nextMovie.pick_type) + nextMovie.movie_title + '</div>'
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
    html += '<div class="scorecard-card' + (open ? ' is-open' : '') + '"'
      + ' style="border-top:3px solid ' + colorMap[owner] + '">'
      + headerHtml
      + '<div class="scorecard-body">'
      + statGridHtml
      + movieTableHtml
      + footerHtml
      + '</div>'
      + '</div>';
  });

  html += '</div>';
  el.classList.remove('d-none');
  el.innerHTML = html;

  // ── Collapse toggle ───────────────────────────────────────────────────────
  el.addEventListener('click', function(e) {
    var header = e.target.closest('.scorecard-header');
    if (!header) return;
    var card = header.closest('.scorecard-card');
    if (!card) return;
    card.classList.toggle('is-open');
    var state = readCollapsedCookie() || {};
    state[header.dataset.owner] = card.classList.contains('is-open');
    writeCollapsedCookie(state);
  });
}
```

- [ ] **Step 2: Verify the build runs without errors**

```bash
cd /Users/marcus/Documents/Projects/movieboyz-site && npm run build 2>&1 | tail -10
```

Expected: exits 0, no import errors. If Vite reports a missing export, check that `fmtPct` and `colorClass` are exported from `js/utils.js` (they are at lines 12 and 17).

- [ ] **Step 3: Start dev server and smoke-check visually**

```bash
npm run dev
```

Open the dev URL and verify:

- Strip renders a full-width column of cards
- Each card is collapsed by default (body hidden, triangle points right)
- Clicking a header opens the card (triangle rotates to point down)
- Header shows owner dot, name, rank, Season Total with colour class
- Expanded card shows 4-stat row (Picks Total, Bomb Impact, Week Δ, ROI excl. bomb icon)
- On a narrow viewport (<576px) stats wrap to 2×2 grid
- Movie table lists all released movies with icon, B/E, Gross TD, Profit TD, Wk Δ
- Bomb pick appears in the table with the bomb icon
- Next footer shows first upcoming pick with its icon prepended
- Collapse state persists across page reload (check `document.cookie` in devtools for `scorecard_collapsed`)
- Light/dark theme toggle does not break card colours

- [ ] **Step 4: Commit**

```bash
git add js/weekend-strip.js
git commit -m "Rewrite buildWeekendStrip as collapsible scorecard strip v2"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Covered by |
|---|---|
| Full-width cards | `.scorecard-strip` flex-direction column, `.scorecard-card` no max-width |
| Collapsible on headline click | `.scorecard-header` click via event delegation, `is-open` toggle |
| Hover state on header | `.scorecard-header:hover` CSS rule |
| Triangle indicator, right=closed, down=open | `.scorecard-toggle-icon` CSS border triangle + 90deg rotation |
| Default all collapsed | `isOpen()` returns `false` unless cookie says `true` |
| Cookie persists collapse state | `readCollapsedCookie()` / `writeCollapsedCookie()` |
| Desktop: 4 stats in one row | `grid-template-columns: 1fr 1fr 1fr 1fr` |
| Mobile: 2×2 stats | `@media (max-width: 575.98px)` override to `1fr 1fr` |
| Top-right = Season Total | `scorecard-season-total` + `scorecard-season-label` |
| Stats: Picks Total, Bomb Impact, Week Δ, ROI excl. bomb | `statGridHtml` four cells |
| Week Δ same as standings table | `totalVal - weekStartVal` using `WEEK_START = findFloorDate(sortedDates, shiftDate(LATEST_DATE, -7))` |
| ROI label with bomb icon | `'ROI excl. ' + BOMB_ICON_SM` as label HTML |
| Movie table with horizontal borders only | `.scorecard-movie-table` border-collapse, `border-bottom` on td/th |
| Table header: Movie, B/E, Gross TD, Profit TD, Wk Δ | `<thead>` in movie table HTML |
| All released movies listed | filter `m.days_running != null` |
| Bomb pick in table | no exclusion, bomb movies appear with bomb icon |
| Pick-type icons (star/snowflake/sun/leaf/bomb) | `PICK_ICONS` map, `pickIcon()` helper |
| Icons prepended in movie table | `pickIcon(m.pick_type)` in first `<td>` |
| Next footer with pick icon | `pickIcon(nextMovie.pick_type)` in `nextTitleHtml` |
| Footer still present | `footerHtml` still assembled and included |

**Placeholder scan:** No TBDs, TODOs, or "similar to" references. All code blocks are complete.

**Type consistency:** `statCell(val, labelHtml, format)` used with formats `'plain'`, `'signed'`, `'pct'` consistently. `pickIcon()` always returns a string (empty or SVG span). CSS classes introduced in Task 1 exactly match those used in Task 2 HTML strings.
