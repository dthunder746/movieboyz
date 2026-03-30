# Owner Scorecard Strip — Design Spec

Generated: 2026-03-30
Replaces: initial N1 weekend strip (feature/n1-weekend-strip)

---

## Overview

Replace the existing `buildWeekendStrip` implementation with a richer "owner scorecard" strip. One card per owner, sorted by current standings rank. Cards sit between the nav and the leaderboard — the same position as the current strip.

The goal is a quick, scannable snapshot of the weekend: how each owner is performing right now, which movies are earning, and what's coming next. Cards should be screenshot-shareable.

---

## Card Anatomy

Each card has four sections top to bottom:

### 1. Header

Left side:
- Owner colour dot (9px, existing `.owner-dot` class)
- Owner name (bold, 14px)
- Standing rank below name (e.g. `#1`, muted, 11px)

Right side:
- Weekend total gross (20px bold, green/red/neutral via existing colour classes)
- `THIS WEEKEND` label below it (9.5px, uppercase, muted)

If no movies earned gross this weekend, show `—` in place of the total.

### 2. Stat Grid

2×2 grid of summary stats, separated by 1px borders using Bootstrap CSS variables. Each cell: value centred on top, uppercase label below.

| Cell | Value | Label |
|------|-------|-------|
| Top-left | Owner season profit (cumulative total to latest date) | `Season` |
| Top-right | Weekend gross delta vs previous weekend (signed, coloured) | `Wk Delta` |
| Bottom-left | Bomb impact at latest date | `Bomb Impact` |
| Bottom-right | ROI (picks_profit / breakeven × 100, signed %) | `ROI` |

Null/missing values render as `—` in muted colour.

### 3. Movie List

All movies owned by this owner where `weekly_gross[currentWeek] > 0`, sorted descending by weekly gross.

Each row:
- Movie title left (11.5px, muted, truncated with ellipsis)
- Right column: gross on top (13px bold, white), weekly delta below (10.5px, coloured positive/negative)

Weekly delta = `weekly_gross[currentWeek] - weekly_gross[prevWeek]`. If no previous week data, delta is omitted.

If no movies have gross this weekend, show a single centred line: `No movies in theaters this weekend` (muted, 11.5px).

Card height varies naturally with the number of movies — no cap.

### 4. Up Next Footer

Darker background footer row (using `--bs-body-bg` or equivalent darker token).

- `NEXT` label (9px uppercase, muted)
- Upcoming movie title (11px, muted) — first unreleased movie by release date (`days_running == null`, `release_date` in the future)
- Days until release, right-aligned (11px bold, blue accent)

If no upcoming movie: title shows `None scheduled`, days shows `—`.

---

## Visual Style

- **Card border**: 1px `--bs-border-color`, top border 3px in owner's palette colour
- **Card background**: `--bs-body-bg` (not `--bs-tertiary-bg` — match existing table/leaderboard background)
- **Stat grid background**: `--bs-tertiary-bg` for cells, `--bs-border-color` for the 1px gaps
- **Footer background**: a shade darker than the card — use `rgba(0,0,0,0.15)` over the card background, which works in both light and dark themes
- **Colour classes**: reuse existing `.text-pos`, `.text-neg`, `.text-neu` for all signed values
- **Pick-type badges**: not shown in the scorecard (they're visible in the main table)
- **Border radius**: 8px, matching Bootstrap card defaults
- **Card width**: `min-width: 200px`, `flex: 1 1 200px`, `max-width: 280px` — fills available space responsively

No hardcoded hex colours in CSS. All colours via Bootstrap CSS variables or existing app classes.

---

## Data Mapping

| UI element | Data source |
|---|---|
| Owner weekend total | Sum of `movie.weekly_gross[currentWeek]` across all of the owner's movies |
| Rank | Position in owners sorted by `data.owners[o].total[LATEST_DATE]` descending |
| Season profit | `data.owners[owner].total[LATEST_DATE]` |
| Wk Delta | `currentWeekTotal - prevWeekTotal` where both are sums of `movie.weekly_gross[weekKey]` across the owner's movies — same basis as the weekend total |
| Bomb Impact | `data.owners[owner].bomb_impact[LATEST_DATE]` |
| ROI | `data.owners[owner].picks_profit[LATEST_DATE] / totalBreakeven * 100` — `picks_profit` is an owner-level time series in `data.owners`. `totalBreakeven` = sum of `movie.breakeven` across all owner's picks where breakeven is non-null. Show `—` if denominator is zero or missing. |
| Current week key | Max ISO week key across all `movie.weekly_gross` keys |
| Previous week key | Second-to-last ISO week key in sorted set |
| Active movies | `Object.values(data.movies).filter(m => m.owner === owner && m.weekly_gross[currentWeek] > 0)`, sorted by weekly gross descending |
| Next upcoming | `Object.values(data.movies).filter(m => m.owner === owner && m.days_running == null && m.release_date > today)`, sorted by release_date ascending, take first |
| Days until release | `Math.ceil((new Date(release_date) - today) / 86400000)` |

**ROI note:** `picks_profit` is an owner-level time series under `data.owners[owner].picks_profit` (same shape as `total`). `breakeven` is a per-movie field under `data.movies[id].breakeven`. Owner-level ROI = `picks_profit[LATEST_DATE]` divided by the sum of `movie.breakeven` across all the owner's picks where breakeven is non-null. If that sum is zero or all values are null, show `—`.

---

## Implementation Scope

**Rewrite** `js/weekend-strip.js` in place — the function signature `buildWeekendStrip(data, owners, colorMap)` stays the same. No new files, no changes to `app.js` or `index.html`.

Update `css/style.css` — replace existing weekend strip rules with the new card styles described above.

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| Owner has no movies in theaters this weekend | Show `—` for weekend total and wk delta; "No movies in theaters this weekend" in movie list |
| Owner has no upcoming unreleased movies | Footer shows `None scheduled` / `—` |
| Previous week key doesn't exist (first week of season) | Wk Delta shows `—` |
| ROI denominator is zero or missing | ROI shows `—` |
| `LATEST_DATE` is null | Entire strip hidden (`d-none`) |
| No week keys found in gross data | Entire strip hidden |
