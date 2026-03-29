# Weekly Gross Column Redesign

**Date:** 2026-03-29

## Overview

Redesign the table's gross columns to merge Daily Gross and Weekly Gross into a single expandable "Weekly Gross" section, streamline the top-level header structure, and introduce per-week expand/collapse toggles that reveal day-by-day columns. Remove the "Movie Details" group and the week-history toggle.

---

## 1. Column Structure

Top-level column order:

```
Movie | Opening | Owner | Ratings [+] | Financials | Weekly Gross
```

- The **"Movie Details" group is removed.** Opening and Owner become standalone top-level columns with the same content and formatting as before.
- The **"Daily Gross (last 7 days)" group is removed entirely.** Daily figures are surfaced inside each expanded week group instead.
- **"Weekly Gross"** is a top-level column group containing one per-week sub-group, ordered most-recent-first.

### 3-level header structure inside Weekly Gross

| Header row | Content |
|---|---|
| Row 1 | "Weekly Gross" (top-level group title) |
| Row 2 | "Mar 23-29 [+/-]" (per-week expandable group, with toggle button) |
| Row 3 | "week #13" (ISO week number, title of a nested sub-group) |
| Row 4 | "week total" column + day columns (leaf columns) |

The ISO week number is derived from the week key already in the data (e.g. `2026-W13` → `week #13`).

---

## 2. Expand/Collapse Behavior

Each per-week group is built with the existing `makeExpandableGroup` utility. Day columns are defined upfront; visibility is set at construction time.

### Default visibility

- **Current week (most recent):** expanded by default. All day columns for dates that have data are rendered visible. Days with no data yet (future days in the current week) are not created as columns at all.
- **All other weeks:** collapsed by default. The week total column is visible; all 7 day columns are defined but hidden.

### Day column ordering

Within each expanded week, day columns are ordered most-recent-first (e.g. SUN, SAT, FRI, THU, WED, TUE, MON). The week total column always remains visible regardless of expanded state.

### Day column data source

All available dates from `daily_change` are grouped by ISO week key. Each per-week group receives only the dates that fall within its own week, replacing the previous global `last7` slice. This means all historical daily data is accessible, not just the most recent 7 days.

### Week history toggle removed

The "Show week history / Hide week history" button is removed from the filter bar. All weeks are always visible. `_hiddenWeekCols`, `_showWeekHistory`, and related state in `app.js` are removed entirely.

---

## 3. Typography and Visual Styling

### Current week italics

- The per-week group header for the most-recent week ("Mar 23-29") is rendered in italics via a custom `titleFormatter`.
- All cells in the week total column for the current week are rendered in italics via a CSS class on that column.
- Day columns within the current week use normal (non-italic) text.

### Week separator border

A thin left-border separates each week group from the next. This border is thinner than the existing separator between ROI and gross columns. Applied via CSS on the first leaf column of each per-week group.

### Day column background

Day columns carry a CSS class (e.g. `col-day-column`) that applies a subtly lighter background than the table default, visually distinguishing them from the week total column.

### Negative daily gross display

Negative values in day columns are:

- Rendered in **grey** (not red, unlike profit/ROI negatives).
- Annotated with a superscript `*` added via a CSS `::after` pseudo-element on a class `daily-neg-revised`. Sorting remains correct because Tabulator sorts on the raw numeric field value, not the rendered HTML.

A footnote is shown below `#movie-table` whenever any negative daily gross value is present in the data:

> `* Negative daily gross values are not true negatives. They reflect revised estimates for earlier days in the week, superseded by more accurate figures.`

The footnote element exists in `index.html` and is hidden by default; `table.js` adds a class to make it visible when needed.

---

## 4. Code Changes by File

### `js/table.js`

- Remove `last7` / global-daily-date logic. Replace with a map of `weekKey → [sorted dates]` built from all `daily_change` keys across all movies, grouped by ISO week.
- Remove `hiddenWeekCols` from the return value of `buildTable`.
- For each week key (most-recent-first), build a per-week expandable group using `makeExpandableGroup`:
  - `title`: formatted date range (e.g. "Mar 23-29")
  - `childColumns`: a single sub-group titled "week #N" containing the week total column plus day columns for that week
  - `hiddenFields`: all day column fields for that week (empty array for the current week, since days start visible)
  - `expanded` initial state: `true` for current week, `false` for all others
- Remove `showWeekHistory` and `hasWeekHistory` parameters from `buildOwnerFilter`.
- `makeExpandableGroup` receives a new optional `initialExpanded` boolean parameter (default `false`). When `true`, the group starts expanded and the button renders as `−` instead of `+`. The current week passes `true`; all other weeks pass `false` (or omit it).

### `js/app.js`

- Remove `_hiddenWeekCols`, `_showWeekHistory`, and the `data-toggle-week-history` click handler.
- Remove `showWeekHistory` and `hasWeekHistory` arguments from all `buildOwnerFilter` calls.
- `buildTable` no longer returns `hiddenWeekCols`; remove destructuring of that field.

### `css/style.css`

- Add `.col-day-column` — lighter background for day columns.
- Add `.daily-neg-revised` — grey text color for negative daily values.
- Add `.daily-neg-revised::after { content: "*"; ... }` — superscript asterisk.
- Add `.week-current-header` — italic style for the current week group header.
- Add `.week-current-total` — italic style for week total cells in the current week.
- Add thin left-border rule for week group separators (thinner than existing `.week-sep`).
- Remove or adjust `.week-sep`, `.week-latest` as needed.

### `index.html`

- Add a footnote element below `#movie-table`, hidden by default via a CSS class.
- `table.js` removes the hidden class when any negative daily gross value is detected in the row data.

### Unchanged files

`filter.js`, `chart.js`, `leaderboard.js`, `utils.js` — no changes required.
