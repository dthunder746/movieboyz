# Ratings Column Expand/Collapse Design

**Date:** 2026-03-28

## Overview

Replace the "Show all ratings" button in the filter bar with a [+]/[−] toggle embedded directly in the Tabulator column group header for the ratings section. The solution is modular so the same pattern can be applied to other column groups (e.g., Weekly Gross) in the future.

## Approach

Option A was selected: the rating columns become their own top-level column group named "Ratings", a peer of the other groups. The group title row contains the [+]/[−] toggle button.

The existing single "Movie Details" wrapper group (which previously contained Opening, Owner, all ratings, and financials) is removed. Three focused peer groups replace it:

| Group | Columns |
|-------|---------|
| Movie Details | Opening, Owner |
| Ratings (expandable) | Letterboxd, IMDb, RT Audience, RT Tomatometer, TMDB, Metacritic |
| Financials | B/E, Gross TD, Profit TD, ROI |

The existing `ratings-sep` and `ratings-end` CSS classes on the first and last rating columns can be removed — visual separation is handled by the group boundaries.

## Architecture

### `makeExpandableGroup(title, hiddenFields, tableRef)` — new utility in `table.js`

A factory function that returns a Tabulator column group definition with built-in expand/collapse behavior.

**Parameters:**
- `title` (string) — label shown in the group header row (e.g., `"Ratings"`)
- `hiddenFields` (string[]) — field names to show/hide on toggle
- `tableRef` ({ current: null }) — a plain mutable object; `.current` is assigned the Tabulator instance after construction (deferred ref pattern avoids chicken-and-egg between column definitions and the table instance)

**Behavior:**
- Owns an `expanded` boolean in closure scope (initial value: `false`)
- Uses Tabulator's `titleFormatter` + `onRendered` callback to inject the toggle button into the rendered header cell after it is attached to the DOM
- On click: toggles `expanded`, updates button label, calls `tableRef.current.showColumn(f)` or `tableRef.current.hideColumn(f)` for each field in `hiddenFields`
- Stops click event propagation to prevent column sort from firing

**Usage pattern:**
```js
var tableRef = { current: null };
var ratingsGroup = makeExpandableGroup('Ratings', hiddenFields, tableRef);
// ... build columns array including ratingsGroup
var table = new Tabulator('#movie-table', { columns: ... });
tableRef.current = table;
```

### Column structure change in `buildTable`

The six rating columns are restructured as follows:

| Column | Field | Visible (collapsed) | Visible (expanded) |
|--------|-------|--------------------|--------------------|
| Letterboxd | `rating_letterboxd` | yes (anchor) | yes |
| IMDb | `rating_imdb` | no | yes |
| RT Audience | `rating_rt_audience` | no | yes |
| RT Tomatometer | `rating_rt_critic` | no | yes |
| TMDB | `rating_tmdb` | no | yes |
| Metacritic | `rating_metacritic` | no | yes |

The Letterboxd column remains `visible: true` as the anchor. It keeps the "Ratings" group header row visible when collapsed. Without at least one visible child column, Tabulator collapses the group header row entirely.

`hiddenFields` passed to `makeExpandableGroup` = the five non-anchor fields.

`buildTable` no longer returns `hiddenRatingCols` (it is managed internally).

### Filter bar cleanup

The following are removed:

**`buildOwnerFilter` in `table.js`:**
- `showRatings` parameter
- `hasRatingCols` parameter
- The "Show all ratings" / "Hide all ratings" button

**`app.js`:**
- `_showRatings` state variable
- `_hiddenRatingCols` state variable
- The `data-toggle-ratings` click handler branch
- The `_hiddenRatingCols` assignment from `buildTable` return value
- The `_showRatings` / `_hiddenRatingCols.length > 0` arguments passed to `buildOwnerFilter`

## Scope

- Ratings expand/collapse only. Week history toggle remains in the filter bar for now.
- No changes to chart, leaderboard, or data-fetching logic.
- The `makeExpandableGroup` utility is designed for reuse but only wired up for ratings in this implementation.
