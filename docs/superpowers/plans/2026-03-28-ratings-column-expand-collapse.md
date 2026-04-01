# Ratings Column Expand/Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Show all ratings" filter bar button with a [+]/[−] toggle embedded in a "Ratings" column group header in the Tabulator table.

**Architecture:** A reusable `makeExpandableGroup` factory in `table.js` returns a Tabulator column group definition whose title header contains a clickable [+]/[−] button. The button uses Tabulator's `onRendered` callback to inject itself into the DOM after the header is mounted, and manages its own `expanded` state in closure scope. A deferred `tableRef` object is used to avoid a chicken-and-egg dependency between the column definition and the Tabulator instance.

**Tech Stack:** Vanilla JS (ES modules), Tabulator 6.3, Bootstrap 5.3, Vite

---

## Handoff State

**Worktree:** `/Users/marcus/Documents/Projects/movieboyz-site/.worktrees/ratings-column-toggle`
**Branch:** `feature/ratings-column-toggle`
**Base:** `main` (at `aefe529`)
**HEAD:** `a970931`

| Task | Status | Notes |
|------|--------|-------|
| Task 1: CSS changes | ✅ Complete | `5af0816` — spec + quality reviews passed |
| Task 2: `makeExpandableGroup` utility | ✅ Complete | `6e9a8e3` — includes null-guard fix from review |
| Task 3: Restructure column groups | ✅ Complete | `a970931` — spec review passed; quality review noted two minor items (see below) |
| Task 4: Update `buildOwnerFilter` signature | ⬜ Pending | |
| Task 5: Clean up `app.js` | ⬜ Pending | |

**Minor items from Task 3 quality review (fix in Task 4/5 or as a cleanup commit):**
- `cssClass: ''` in `ratingCols` (line ~152 of `table.js`) can be removed entirely — an empty string is the same as omitting the key
- `app.js` line 135 has a temporary `|| []` guard (`_hiddenRatingCols = tableResult.hiddenRatingCols || []`) — Task 5 removes this line entirely

**Known state of `app.js` after Task 3:** The "Show all ratings" owner-filter button no longer renders (because `_hiddenRatingCols` is `[]`, so `hasRatingCols` is `false`). This is intentional — the `[+]` header button is now the sole ratings toggle. Task 5 removes the dead `_showRatings`/`_hiddenRatingCols` code fully.

**Next agent instructions:** Pick up at Task 4. The worktree and branch are already set up — do not create a new one. Run `cd /Users/marcus/Documents/Projects/movieboyz-site/.worktrees/ratings-column-toggle` to begin.

---

### Task 1: Add CSS class for the toggle button

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: Add toggle button style after the "Column group separators" section**

In `css/style.css`, after the `/* ── Column group separators */` block (after line 154), add:

```css
/* ── Expandable group toggle button ────────────────────────────────────── */
.group-expand-btn {
  cursor: pointer;
  font-size: 0.7rem;
  opacity: 0.6;
  margin-left: 6px;
  user-select: none;
  font-family: monospace;
  border: 1px solid currentColor;
  border-radius: 2px;
  padding: 0 3px;
  vertical-align: middle;
}
.group-expand-btn:hover { opacity: 1; }
```

- [ ] **Step 2: Remove the `ratings-sep`, `ratings-end`, and `ratings-expanded` CSS rules**

Delete lines 156–175 in `css/style.css` — the entire block from `.tabulator .tabulator-col.ratings-sep` through the closing `}` of the `#table-wrapper.ratings-expanded .tabulator-col.ratings-end` rule. The section to remove is:

```css
.tabulator .tabulator-col.ratings-sep,
.tabulator-row .tabulator-cell.ratings-sep {
  border-left: 0.5px solid var(--bs-border-color) !important;
}

/* Right border sits on Letterboxd by default (other cols hidden) */
.tabulator .tabulator-col.ratings-sep,
.tabulator-row .tabulator-cell.ratings-sep {
  border-right: 0.5px solid var(--bs-border-color) !important;
}

/* When expanded: remove Letterboxd's right border, add it to Metacritic */
#table-wrapper.ratings-expanded .tabulator .tabulator-col.ratings-sep,
#table-wrapper.ratings-expanded .tabulator-row .tabulator-cell.ratings-sep {
  border-right: none !important;
}
#table-wrapper.ratings-expanded .tabulator .tabulator-col.ratings-end,
#table-wrapper.ratings-expanded .tabulator-row .tabulator-cell.ratings-end {
  border-right: 0.5px solid var(--bs-border-color) !important;
}
```

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "style: add group-expand-btn class, remove ratings-sep/end CSS"
```

---

### Task 2: Add `makeExpandableGroup` utility to `table.js`

**Files:**
- Modify: `js/table.js`

- [ ] **Step 1: Add `makeExpandableGroup` at the top of `table.js`, before `buildTable`**

Insert the following function immediately before the `export function buildTable(` line:

```js
// ── Expandable column group factory ──────────────────────────────────────
// Returns a Tabulator column group definition whose header contains a [+]/[−]
// toggle button that shows/hides the fields listed in hiddenFields.
//
// tableRef: a plain object { current: null } — assign tableRef.current = table
// after the Tabulator instance is constructed.

function makeExpandableGroup(title, childColumns, hiddenFields, tableRef) {
  var expanded = false;
  return {
    title: title,
    titleFormatter: function(cell, params, onRendered) {
      onRendered(function() {
        var el = cell.getElement();
        var btn = document.createElement('span');
        btn.className = 'group-expand-btn';
        btn.textContent = '[+]';
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          expanded = !expanded;
          btn.textContent = expanded ? '[\u2212]' : '[+]';
          hiddenFields.forEach(function(f) {
            if (expanded) tableRef.current.showColumn(f);
            else tableRef.current.hideColumn(f);
          });
        });
        el.appendChild(btn);
      });
      return title;
    },
    columns: childColumns,
  };
}
```

- [ ] **Step 2: Verify syntax by running the dev server**

```bash
cd /Users/marcus/Documents/Projects/movieboyz-site && npm run dev
```

Expected: dev server starts with no errors. Open the local URL in a browser and confirm the table renders. The `makeExpandableGroup` function isn't wired up yet so the table should look unchanged.

- [ ] **Step 3: Commit**

```bash
git add js/table.js
git commit -m "feat: add makeExpandableGroup utility to table.js"
```

---

### Task 3: Restructure column groups in `buildTable`

**Files:**
- Modify: `js/table.js`

- [ ] **Step 1: Remove `cssClass` from the `ratingCols` mapping**

In the `RATING_SOURCES.map` block, the line:

```js
cssClass:      i === 0 ? 'ratings-sep' : i === RATING_SOURCES.length - 1 ? 'ratings-end' : '',
```

Replace with:

```js
cssClass:      '',
```

- [ ] **Step 2: Restructure the column definitions**

Find this block (starting around line 194):

```js
var movieDetailCols = [
  {
    title: 'Opening',
    ...
  },
  {
    title: 'Owner',
    ...
  },
];
Array.prototype.push.apply(movieDetailCols, ratingCols);
movieDetailCols.push(
  {
    title: 'B/E',
    ...
  },
  {
    title: 'Gross TD',
    ...
  },
  {
    title: 'Profit TD',
    ...
  },
  {
    title: 'ROI',
    ...
  }
);
```

Replace it with the same column definitions reorganised into three separate groups. Keep every column definition object unchanged — only the grouping structure changes:

```js
var tableRef = { current: null };
var hiddenRatingFields = RATING_SOURCES.filter(function(s) { return !s.visible; }).map(function(s) { return s.field; });

var movieDetailCols = [
  {
    title: 'Opening',
    field: 'release_date',
    minWidth: 120,
    sorter: 'string',
    formatter: function(cell) {
      var row = cell.getRow().getData();
      var rel = row.release_date;
      if (rel === 'TBA') return '<span class="text-neu">TBA</span>';
      var label = formatShortDate(rel);
      if (row.days_running !== null && row.days_running !== undefined) {
        label += ' · ' + row.days_running + 'd';
      }
      return label;
    },
    formatterParams: { html: true },
  },
  {
    title: 'Owner',
    field: 'owner',
    minWidth: 100,
    formatter: function(cell) {
      var o = cell.getValue();
      return '<span class="owner-dot" style="background:' + (colorMap[o] || '#888') + '"></span>' + o;
    },
    formatterParams: { html: true },
  },
];

var financialCols = [
  {
    title: 'B/E',
    field: 'breakeven',
    hozAlign: 'right',
    minWidth: 80,
    headerTooltip: 'Breakeven (2 × production budget)',
    formatter: fmtGross,
    formatterParams: { html: true },
    sorter: 'number',
  },
  {
    title: 'Gross TD',
    field: 'to_date_gross',
    hozAlign: 'right',
    minWidth: 95,
    formatter: fmtGross,
    formatterParams: { html: true },
    sorter: 'number',
  },
  {
    title: 'Profit TD',
    field: 'to_date_profit',
    hozAlign: 'right',
    minWidth: 95,
    formatter: fmtCell,
    formatterParams: { html: true },
    sorter: 'number',
  },
  {
    title: 'ROI',
    field: 'roi',
    hozAlign: 'right',
    minWidth: 80,
    headerTooltip: 'Return on Investment: (gross − breakeven) / breakeven',
    formatter: fmtRoi,
    formatterParams: { html: true },
    sorter: 'number',
  },
];
```

- [ ] **Step 3: Update the `columns` array and Tabulator instantiation**

Find the `columns` array and `new Tabulator(...)` block:

```js
var columns = [
  titleCol,
  {
    title: 'Movie Details',
    columns: movieDetailCols,
  },
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

var table = new Tabulator('#movie-table', {
```

Replace with:

```js
var ratingsGroup = makeExpandableGroup('Ratings', ratingCols, hiddenRatingFields, tableRef);

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

var table = new Tabulator('#movie-table', {
```

- [ ] **Step 4: Set `tableRef.current` after table construction and update the return value**

Find the `return` statement at the end of `buildTable`:

```js
return { table: table, hiddenWeekCols: hiddenWeekCols, hiddenRatingCols: hiddenRatingCols };
```

Replace with:

```js
tableRef.current = table;
return { table: table, hiddenWeekCols: hiddenWeekCols };
```

Also find and delete the line that computes `hiddenRatingCols` (it is no longer needed):

```js
var hiddenRatingCols = RATING_SOURCES.filter(function(s){ return !s.visible; }).map(function(s){ return s.field; });
```

- [ ] **Step 5: Verify in browser**

```bash
npm run dev
```

Expected:
- Table renders with four column group headers: "Movie Details", "Ratings", "Financials", "Daily Gross (last 7 days)" (and "Weekly Gross" if applicable)
- "Ratings" header shows a small `[+]` button
- Clicking `[+]` expands to show all six rating columns and changes to `[−]`
- Clicking `[−]` collapses back to Letterboxd only

- [ ] **Step 6: Commit**

```bash
git add js/table.js
git commit -m "feat: restructure table into Movie Details / Ratings / Financials groups with expand toggle"
```

---

### Task 4: Update `buildOwnerFilter` signature in `table.js`

**Files:**
- Modify: `js/table.js`

- [ ] **Step 1: Remove `showRatings` and `hasRatingCols` parameters**

Find the function signature:

```js
export function buildOwnerFilter(owners, colorMap, activeOwners, showUnowned, showWeekHistory, hasWeekHistory, showRatings, hasRatingCols) {
```

Replace with:

```js
export function buildOwnerFilter(owners, colorMap, activeOwners, showUnowned, showWeekHistory, hasWeekHistory) {
```

- [ ] **Step 2: Remove the ratings toggle button**

Find and delete this block inside `buildOwnerFilter`:

```js
  if (hasRatingCols) {
    var ratingsToggle = document.createElement('button');
    ratingsToggle.className = 'btn btn-sm btn-outline-secondary';
    ratingsToggle.textContent = showRatings ? 'Hide all ratings' : 'Show all ratings';
    ratingsToggle.dataset.toggleRatings = '1';
    container.appendChild(ratingsToggle);
  }
```

- [ ] **Step 3: Commit**

```bash
git add js/table.js
git commit -m "refactor: remove showRatings params from buildOwnerFilter"
```

---

### Task 5: Clean up `app.js`

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Remove `_showRatings` and `_hiddenRatingCols` state variables**

Find:

```js
  var _showUnowned      = false;
  var _showWeekHistory  = false;
  var _hiddenWeekCols   = [];
  var _showRatings      = false;
  var _hiddenRatingCols = [];
```

Replace with:

```js
  var _showUnowned     = false;
  var _showWeekHistory = false;
  var _hiddenWeekCols  = [];
```

- [ ] **Step 2: Remove `hiddenRatingCols` from the `buildTable` result assignment**

Find:

```js
  var tableResult   = buildTable(data, colorMap);
  _table            = tableResult.table;
  _hiddenWeekCols   = tableResult.hiddenWeekCols;
  _hiddenRatingCols = tableResult.hiddenRatingCols;
```

Replace with:

```js
  var tableResult  = buildTable(data, colorMap);
  _table           = tableResult.table;
  _hiddenWeekCols  = tableResult.hiddenWeekCols;
```

- [ ] **Step 3: Remove `_showRatings` and `_hiddenRatingCols.length > 0` from all `buildOwnerFilter` calls**

There are two calls to `buildOwnerFilter` in `app.js`. Update both.

First call (inside the `ownerFilter` onChange callback):

```js
    buildOwnerFilter(owners, colorMap, activeOwners, _showUnowned, _showWeekHistory, _hiddenWeekCols.length > 0, _showRatings, _hiddenRatingCols.length > 0);
```

Replace with:

```js
    buildOwnerFilter(owners, colorMap, activeOwners, _showUnowned, _showWeekHistory, _hiddenWeekCols.length > 0);
```

Second call (initial render, after `buildTable`):

```js
  buildOwnerFilter(owners, colorMap, [], _showUnowned, _showWeekHistory, _hiddenWeekCols.length > 0, _showRatings, _hiddenRatingCols.length > 0);
```

Replace with:

```js
  buildOwnerFilter(owners, colorMap, [], _showUnowned, _showWeekHistory, _hiddenWeekCols.length > 0);
```

Third call (inside the `data-toggle-unowned` handler):

```js
        buildOwnerFilter(owners, colorMap, ownerFilter.getActive(), _showUnowned, _showWeekHistory, _hiddenWeekCols.length > 0, _showRatings, _hiddenRatingCols.length > 0);
```

Replace with:

```js
        buildOwnerFilter(owners, colorMap, ownerFilter.getActive(), _showUnowned, _showWeekHistory, _hiddenWeekCols.length > 0);
```

Fourth call (inside the `data-toggle-week-history` handler):

```js
        buildOwnerFilter(owners, colorMap, ownerFilter.getActive(), _showUnowned, _showWeekHistory, _hiddenWeekCols.length > 0, _showRatings, _hiddenRatingCols.length > 0);
```

Replace with:

```js
        buildOwnerFilter(owners, colorMap, ownerFilter.getActive(), _showUnowned, _showWeekHistory, _hiddenWeekCols.length > 0);
```

- [ ] **Step 4: Remove the `data-toggle-ratings` handler block**

Find and delete this entire block:

```js
      if (e.target.closest('[data-toggle-ratings]')) {
        _showRatings = !_showRatings;
        _hiddenRatingCols.forEach(function(f) {
          if (_showRatings) _table.showColumn(f);
          else              _table.hideColumn(f);
        });
        var tw = document.getElementById('table-wrapper');
        if (tw) tw.classList.toggle('ratings-expanded', _showRatings);
        buildOwnerFilter(owners, colorMap, ownerFilter.getActive(), _showUnowned, _showWeekHistory, _hiddenWeekCols.length > 0, _showRatings, _hiddenRatingCols.length > 0);
        return;
      }
```

- [ ] **Step 5: Verify in browser**

```bash
npm run dev
```

Expected:
- Filter bar contains: owner buttons, "Show/Hide unowned movies", "Show/Hide week history" (if applicable), "Clear"
- No "Show all ratings" button
- Ratings [+]/[−] toggle in the column header works correctly
- Owner filter, unowned toggle, week history toggle all still work

- [ ] **Step 6: Commit**

```bash
git add js/app.js
git commit -m "refactor: remove ratings toggle state from app.js"
```
