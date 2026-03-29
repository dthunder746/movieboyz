# Weekly Gross Column Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge Daily Gross and Weekly Gross into a single "Weekly Gross" group with per-week expandable day columns, remove the "Movie Details" group and week-history toggle, and add negative daily gross styling with a footnote.

**Architecture:** Extend the existing `makeExpandableGroup` utility with an `initialExpanded` flag, then replace the separate `dailyCols`/`weeklyCols` arrays in `buildTable` with a `perWeekGroups` array. Each element is a 3-level Tabulator column group (Weekly Gross > date range [+/-] > week #N > columns). Row data is updated to cover all available dates. Week history toggle state is deleted from `app.js`.

**Tech Stack:** Vanilla JS (ES5-style), Tabulator 6.3, Bootstrap 5.3, Vite (dev server: `npm run dev`)

---

## File Map

| File | Change |
|---|---|
| `js/utils.js` | Add `dateToIsoWeekKey` export |
| `js/table.js` | Add `initialExpanded` to `makeExpandableGroup`; update row data; replace `dailyCols`/`weeklyCols` with `perWeekGroups`; clean up `buildOwnerFilter` signature and `buildTable` return |
| `js/app.js` | Remove `_hiddenWeekCols`, `_showWeekHistory`, week-history click handler, and all related `buildOwnerFilter` argument sites |
| `css/style.css` | Thinner week separator; current-week italic; day column background; negative gross grey + asterisk; footnote style |
| `index.html` | Add `#daily-neg-footnote` element below `#movie-table` |

---

### Task 1: Add `dateToIsoWeekKey` to `utils.js`

Converts `'YYYY-MM-DD'` → `'YYYY-WNN'` (ISO week key). Used in `table.js` to group daily dates by week when building per-week column groups.

**Files:**
- Modify: `js/utils.js`

- [ ] **Step 1: Add function after `isoWeekBounds`**

In `js/utils.js`, after the closing brace of `isoWeekBounds`, add:

```js
export function dateToIsoWeekKey(dateStr) {
  var parts = dateStr.split('-');
  var d = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
  var day = d.getUTCDay() || 7; // Mon=1 … Sun=7
  // Thursday of this week determines the ISO year
  var thursday = new Date(d.getTime() + (4 - day) * 86400000);
  var year = thursday.getUTCFullYear();
  // Monday of ISO week 1 for that year
  var jan4 = new Date(Date.UTC(year, 0, 4));
  var jan4day = jan4.getUTCDay() || 7;
  var w1Mon = new Date(jan4.getTime() - (jan4day - 1) * 86400000);
  // Monday of the input date's week
  var monday = new Date(d.getTime() - (day - 1) * 86400000);
  var weekNum = 1 + Math.round((monday.getTime() - w1Mon.getTime()) / (7 * 86400000));
  return year + '-W' + String(weekNum).padStart(2, '0');
}
```

- [ ] **Step 2: Verify in browser console**

Run `npm run dev`, open the browser console, and run:

```js
// In the browser console (the app loads utils.js as a module):
// Expected: "2026-W13"  (2026-03-29 is a Sunday in ISO week 13)
// Expected: "2026-W01"  (2026-01-01 is a Thursday, belongs to week 1)
// Expected: "2025-W52"  (2025-12-28 is a Sunday in ISO week 52 of 2025)
```

Manually trace `dateToIsoWeekKey('2026-03-29')`:
- `day` = 0 → 7 (Sunday)
- `thursday` = 2026-03-29 − 3 days = 2026-03-26 → `year` = 2026
- `jan4` = 2026-01-04 (Sunday), `jan4day` = 7, `w1Mon` = 2025-12-29
- `monday` = 2026-03-23
- `weekNum` = 1 + (2026-03-23 − 2025-12-29) / 7 = 1 + 12 = **13** ✓

- [ ] **Step 3: Commit**

```bash
git add js/utils.js
git commit -m "feat: add dateToIsoWeekKey utility"
```

---

### Task 2: Add `initialExpanded` to `makeExpandableGroup`

The current week's per-week group starts expanded. Add an optional 5th parameter — no change to existing callers (Ratings group passes nothing, stays collapsed).

**Files:**
- Modify: `js/table.js` (lines 13–38)

- [ ] **Step 1: Update the function signature and `expanded` initialisation**

Find the start of `makeExpandableGroup`:

```js
function makeExpandableGroup(title, childColumns, hiddenFields, tableRef) {
  var expanded = false;
```

Replace with:

```js
function makeExpandableGroup(title, childColumns, hiddenFields, tableRef, initialExpanded) {
  var expanded = !!initialExpanded;
```

- [ ] **Step 2: Set initial button text based on `expanded`**

Find inside the same function:

```js
btn.textContent = '+';
```

Replace with:

```js
btn.textContent = expanded ? '\u2212' : '+';
```

- [ ] **Step 3: Verify no regression**

```bash
npm run dev
```

Open the app. The Ratings [+] button should still appear (collapsed) and toggle correctly.

- [ ] **Step 4: Commit**

```bash
git add js/table.js
git commit -m "feat: add initialExpanded option to makeExpandableGroup"
```

---

### Task 3: Update row data to cover all daily dates

Currently `last7` (the 7 most-recent dates globally) limits which `daily_*` row fields are populated. Switch to `allDailyDates` so every date's data is available. Do not remove the `last7` declaration yet — `dailyCols` still references it and will be removed in Task 4.

**Files:**
- Modify: `js/table.js`

- [ ] **Step 1: Change the row data loop**

Inside `buildTable`, in the `rows` map callback, find:

```js
last7.forEach(function(d) {
  row['daily_' + d] = dc[d] !== undefined ? dc[d] : null;
});
```

Replace with:

```js
allDailyDates.forEach(function(d) {
  row['daily_' + d] = dc[d] !== undefined ? dc[d] : null;
});
```

- [ ] **Step 2: Run dev server — no errors expected**

```bash
npm run dev
```

The table still renders. `last7` is still declared (used by `dailyCols`), so nothing breaks.

- [ ] **Step 3: Commit**

```bash
git add js/table.js
git commit -m "refactor: populate daily_* row fields for all dates, not just last 7"
```

---

### Task 4: Replace `dailyCols`/`weeklyCols` with per-week expandable groups

This is the main structural change. Remove the old column arrays and replace them with `perWeekGroups`. Also remove the now-unused `last7` variable and `hiddenWeekCols`, and update the `buildTable` return value to just `table`.

**Files:**
- Modify: `js/table.js`

- [ ] **Step 1: Add `dateToIsoWeekKey` to the import**

At the top of `table.js`, find:

```js
import {
  fmt, fmtPct, colorClass, ratingColorClass,
  formatShortDate, formatDayMonth, isoWeekBounds, getWeekdayAbbr,
} from './utils.js';
```

Replace with:

```js
import {
  fmt, fmtPct, colorClass, ratingColorClass,
  formatShortDate, formatDayMonth, isoWeekBounds, getWeekdayAbbr, dateToIsoWeekKey,
} from './utils.js';
```

- [ ] **Step 2: Remove `last7` variable**

Find and delete this line (inside `buildTable`, near the top of the function):

```js
var last7       = sortedDaily.slice(-7);
```

- [ ] **Step 3: Add the date-by-week map**

After the `allWeeks` and `anyReleased` variables, add:

```js
  // Group all daily dates by ISO week key (used to build per-week day columns)
  var datesByWeek = {};
  allDailyDates.forEach(function(d) {
    var wk = dateToIsoWeekKey(d);
    if (!datesByWeek[wk]) datesByWeek[wk] = [];
    datesByWeek[wk].push(d);
  });
```

- [ ] **Step 4: Add `fmtDailyCell` after `fmtGross`**

After the closing brace of `fmtGross`, add:

```js
  function fmtDailyCell(cell) {
    var v = cell.getValue();
    if (v === null || v === undefined) return '<span class="text-neu">—</span>';
    if (v < 0) return '<span class="daily-neg-revised">' + fmt(v) + '</span>';
    return '<span class="' + colorClass(v) + '">' + fmt(v) + '</span>';
  }
```

- [ ] **Step 5: Remove `dailyCols`, `weeklyCols`, and `hiddenWeekCols`**

Delete the entire `dailyCols` block:

```js
  var dailyCols = last7.slice().reverse().map(function(d, i) {
    ...
  });
```

Delete the entire `weeklyCols` block:

```js
  // All weeks reversed (most recent first); last 4 visible, older hidden
  var reversedWeeks = allWeeks.slice().reverse();
  var weeklyCols = reversedWeeks.map(function(wk, i) {
    ...
  });
```

Delete the `hiddenWeekCols` line:

```js
  var hiddenWeekCols = reversedWeeks.slice(4).map(function(wk) { return 'week_' + wk; });
```

- [ ] **Step 6: Add `perWeekGroups` builder**

After the `financialCols` definition (before `var ratingsGroup`), add:

```js
  // ── Per-week expandable column groups ──────────────────────────────────
  var reversedWeeks = allWeeks.slice().reverse();

  var perWeekGroups = reversedWeeks.map(function(wk, i) {
    var isCurrentWeek = (i === 0);
    var weekNum = parseInt(wk.split('-W')[1]);

    // Dates to use as day columns for this week, ordered most-recent-first
    var datesForWeek;
    if (isCurrentWeek) {
      // Only dates that have actual data (no future days)
      datesForWeek = (datesByWeek[wk] || []).slice().sort().reverse();
    } else {
      // All 7 days Mon–Sun, ordered Sun→Mon (most-recent-first within the week)
      var bounds = isoWeekBounds(wk);
      var startMs = new Date(bounds.start + 'T00:00:00Z').getTime();
      datesForWeek = [];
      for (var di = 6; di >= 0; di--) {
        var dt = new Date(startMs + di * 86400000);
        datesForWeek.push(
          dt.getUTCFullYear() + '-' +
          String(dt.getUTCMonth() + 1).padStart(2, '0') + '-' +
          String(dt.getUTCDate()).padStart(2, '0')
        );
      }
    }

    // Day columns
    var dayCols = datesForWeek.map(function(d) {
      var abbr = getWeekdayAbbr(d);
      var isWeekend = (abbr === 'SAT' || abbr === 'SUN');
      return {
        title:    formatDayMonth(d),
        field:    'daily_' + d,
        hozAlign: 'right',
        minWidth: 68,
        cssClass: ['col-day-column', isWeekend ? 'col-weekend' : null].filter(Boolean).join(' '),
        visible:  isCurrentWeek,
        titleFormatter: function() {
          var cls = 'col-day-label' + (isWeekend ? ' col-weekend-label' : '');
          return '<span class="' + cls + '">' + abbr + '</span><br>' + formatDayMonth(d);
        },
        formatter:       fmtDailyCell,
        formatterParams: { html: true },
        sorter:          'number',
      };
    });

    // Week total column — always visible, italic for current week
    var weekTotalCol = {
      title:    'total',
      field:    'week_' + wk,
      hozAlign: 'right',
      minWidth: 90,
      cssClass: isCurrentWeek ? 'week-sep week-current-total' : 'week-sep',
      formatter: fmtGross,
      formatterParams: { html: true },
      sorter:   'number',
    };

    // "week #N" inner sub-group
    var weekSubGroup = {
      title:   'week #' + weekNum,
      columns: [weekTotalCol].concat(dayCols),
    };

    // Hidden day fields for collapsed weeks (current week starts expanded → no hidden fields)
    var hiddenDayFields = isCurrentWeek
      ? []
      : datesForWeek.map(function(d) { return 'daily_' + d; });

    var group = makeExpandableGroup(
      weekTitle(wk),
      [weekSubGroup],
      hiddenDayFields,
      tableRef,
      isCurrentWeek
    );

    if (isCurrentWeek) group.cssClass = 'week-current-header';

    return group;
  });
```

- [ ] **Step 7: Replace the `columns` assembly and `anyReleased` block**

Find and replace the `columns` array declaration and the `if (anyReleased)` block:

```js
  var columns = [
    titleCol,
    { title: 'Movie Details', columns: movieDetailCols },
    ratingsGroup,
    { title: 'Financials', columns: financialCols },
  ];

  if (anyReleased) {
    if (dailyCols.length > 0) {
      columns.push({
        title: 'Daily Gross (last 7 days)',
        columns: dailyCols,
      });
    }
    if (weeklyCols.length > 0) {
      columns.push({
        title: 'Weekly Gross',
        columns: weeklyCols,
      });
    }
  }
```

Replace with:

```js
  var columns = [
    titleCol,
    movieDetailCols[0],  // Opening
    movieDetailCols[1],  // Owner
    ratingsGroup,
    { title: 'Financials', columns: financialCols },
  ];

  if (anyReleased && perWeekGroups.length > 0) {
    columns.push({ title: 'Weekly Gross', columns: perWeekGroups });
  }
```

- [ ] **Step 8: Update `buildTable` return value**

Find:

```js
  return { table: table, hiddenWeekCols: hiddenWeekCols };
```

Replace with:

```js
  return table;
```

- [ ] **Step 9: Run dev server and visually verify**

```bash
npm run dev
```

Check:
- "Movie Details" group label is gone; Opening and Owner are standalone top-level columns
- "Daily Gross (last 7 days)" group is gone
- "Weekly Gross" group appears, containing per-week sub-groups
- Current week shows day columns by default (expanded); older weeks are collapsed
- [+]/[-] button in each week header toggles its day columns
- Ratings [+] still works independently
- No console errors

- [ ] **Step 10: Commit**

```bash
git add js/table.js
git commit -m "feat: replace daily/weekly columns with per-week expandable groups"
```

---

### Task 5: Clean up `buildOwnerFilter` signature and `app.js`

Remove the week-history parameters and state that no longer exist.

**Files:**
- Modify: `js/table.js`
- Modify: `js/app.js`

- [ ] **Step 1: Update `buildOwnerFilter` signature in `table.js`**

Find:

```js
export function buildOwnerFilter(owners, colorMap, activeOwners, showUnowned, showWeekHistory, hasWeekHistory) {
```

Replace with:

```js
export function buildOwnerFilter(owners, colorMap, activeOwners, showUnowned) {
```

Find and delete the week history button block inside `buildOwnerFilter`:

```js
  if (hasWeekHistory) {
    var weekToggle = document.createElement('button');
    weekToggle.className = 'btn btn-sm btn-outline-secondary';
    weekToggle.textContent = showWeekHistory ? 'Hide week history' : 'Show week history';
    weekToggle.dataset.toggleWeekHistory = '1';
    container.appendChild(weekToggle);
  }
```

- [ ] **Step 2: Remove week history state variables in `app.js`**

Find:

```js
  var _showUnowned     = false;
  var _showWeekHistory = false;
  var _hiddenWeekCols  = [];
```

Replace with:

```js
  var _showUnowned = false;
```

- [ ] **Step 3: Update `buildTable` call and initial `buildOwnerFilter` call**

Find:

```js
  var tableResult  = buildTable(data, colorMap);
  _table           = tableResult.table;
  _hiddenWeekCols  = tableResult.hiddenWeekCols;
  buildOwnerFilter(owners, colorMap, [], _showUnowned, _showWeekHistory, _hiddenWeekCols.length > 0);
```

Replace with:

```js
  _table = buildTable(data, colorMap);
  buildOwnerFilter(owners, colorMap, [], _showUnowned);
```

- [ ] **Step 4: Update `buildOwnerFilter` call in the `ownerFilter` onChange handler**

Find (inside the `createOwnerFilter` callback):

```js
    buildOwnerFilter(owners, colorMap, activeOwners, _showUnowned, _showWeekHistory, _hiddenWeekCols.length > 0);
```

Replace with:

```js
    buildOwnerFilter(owners, colorMap, activeOwners, _showUnowned);
```

- [ ] **Step 5: Update `buildOwnerFilter` call in the unowned toggle handler**

Find (inside the `ofEl` click handler):

```js
        buildOwnerFilter(owners, colorMap, ownerFilter.getActive(), _showUnowned, _showWeekHistory, _hiddenWeekCols.length > 0);
```

Replace with:

```js
        buildOwnerFilter(owners, colorMap, ownerFilter.getActive(), _showUnowned);
```

- [ ] **Step 6: Delete the week history toggle click handler**

Find and delete this entire block inside the `ofEl` click handler:

```js
      if (e.target.closest('[data-toggle-week-history]')) {
        _showWeekHistory = !_showWeekHistory;
        _hiddenWeekCols.forEach(function(f) {
          if (_showWeekHistory) _table.showColumn(f);
          else                  _table.hideColumn(f);
        });
        buildOwnerFilter(owners, colorMap, ownerFilter.getActive(), _showUnowned, _showWeekHistory, _hiddenWeekCols.length > 0);
        return;
      }
```

- [ ] **Step 7: Run dev server — confirm no errors and no week history button**

```bash
npm run dev
```

The filter bar should show owner buttons, the unowned toggle, and Clear — no week history button. All other controls work.

- [ ] **Step 8: Commit**

```bash
git add js/table.js js/app.js
git commit -m "refactor: remove week history toggle and hiddenWeekCols"
```

---

### Task 6: Add CSS styles

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: Replace the `week-sep` / `daily-sep` rule with a thinner separator**

Find:

```css
.tabulator .tabulator-col.week-sep,
.tabulator .tabulator-col.daily-sep,
.tabulator-row .tabulator-cell.week-sep,
.tabulator-row .tabulator-cell.daily-sep {
  border-left: 2px solid var(--bs-border-color) !important;
}
```

Replace with:

```css
.tabulator .tabulator-col.week-sep,
.tabulator-row .tabulator-cell.week-sep {
  border-left: 1px solid var(--bs-border-color) !important;
}
```

- [ ] **Step 2: Replace the `week-latest` italic rule with `week-current-*` rules**

Find and delete:

```css
/* ── Latest (in-progress) weekly column — italic to signal partial figures  */
.tabulator .tabulator-col.week-latest .tabulator-col-title,
.tabulator-row .tabulator-cell.week-latest {
  font-style: italic;
}
```

Add in its place:

```css
/* ── Current (in-progress) week — italic header group title and total cells  */
.tabulator .tabulator-col.week-current-header .tabulator-col-title {
  font-style: italic;
}
.tabulator-row .tabulator-cell.week-current-total {
  font-style: italic;
}
```

- [ ] **Step 3: Append new rules at the end of `style.css`**

```css
/* ── Day-column background (subtly distinct from week total column) ────────── */
.tabulator-row .tabulator-cell.col-day-column {
  background-color: rgba(0, 0, 0, 0.025);
}
[data-bs-theme="dark"] .tabulator .tabulator-header .tabulator-col.col-day-column,
[data-bs-theme="dark"] .tabulator-row .tabulator-cell.col-day-column {
  background-color: rgba(255, 255, 255, 0.03);
}

/* ── Negative daily gross — grey text + asterisk superscript ─────────────── */
.daily-neg-revised {
  color: var(--bs-secondary-color) !important;
}
.daily-neg-revised::after {
  content: "*";
  font-size: 0.65em;
  vertical-align: super;
  margin-left: 1px;
}

/* ── Group expand button — light mode colours ────────────────────────────── */
[data-bs-theme="light"] .group-expand-btn {
  background: rgba(0, 0, 0, 0.07);
  color: rgba(0, 0, 0, 0.45);
}
[data-bs-theme="light"] .group-expand-btn:hover {
  background: rgba(0, 0, 0, 0.14);
  color: rgba(0, 0, 0, 0.8);
}

/* ── Negative daily gross footnote ──────────────────────────────────────── */
#daily-neg-footnote {
  font-size: 0.75rem;
  color: var(--bs-secondary-color);
  margin-top: 0.25rem;
}
```

- [ ] **Step 4: Run dev server and verify styles visually**

```bash
npm run dev
```

Check:
- Day columns have a subtly lighter background than the week total column
- Week total column for the current week is italic
- Current week date-range header (e.g. "Mar 23-29") is italic
- Week separators are visibly thinner (1px) than before (2px)
- Any negative daily value appears grey (not red) — check browser data for a movie with negatives

- [ ] **Step 5: Commit**

```bash
git add css/style.css
git commit -m "style: add day column, negative gross, and current-week italic styles"
```

---

### Task 7: Add footnote element and wire visibility

**Files:**
- Modify: `index.html`
- Modify: `js/table.js`

- [ ] **Step 1: Add footnote element to `index.html`**

Find:

```html
    <div id="movie-table"></div>
  </div>
```

Replace with:

```html
    <div id="movie-table"></div>
    <p id="daily-neg-footnote" class="d-none">* Negative daily gross values are not true negatives. They reflect revised estimates for earlier days in the week, superseded by more accurate figures.</p>
  </div>
```

- [ ] **Step 2: Wire footnote visibility in `buildTable` in `table.js`**

After the closing of the `rows` array (after the `.map(...)` call, before the `// Formatters` comment), add:

```js
  var hasNegDailyGross = rows.some(function(row) {
    return Object.keys(row).some(function(k) {
      return k.startsWith('daily_') && typeof row[k] === 'number' && row[k] < 0;
    });
  });
  if (hasNegDailyGross) {
    var footnote = document.getElementById('daily-neg-footnote');
    if (footnote) footnote.classList.remove('d-none');
  }
```

- [ ] **Step 3: Run dev server and verify**

```bash
npm run dev
```

- If the current data contains any negative daily gross values, the footnote appears below the table in muted text.
- If no negative values are present, the footnote remains hidden.

To force-test the footnote: temporarily set a `daily_*` value to `-1000` in the browser console on a row object, then call `_table.updateData(...)` — or confirm against real data.

- [ ] **Step 4: Commit**

```bash
git add index.html js/table.js
git commit -m "feat: add negative daily gross footnote"
```
