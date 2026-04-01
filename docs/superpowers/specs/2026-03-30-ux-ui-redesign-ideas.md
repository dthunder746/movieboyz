# MovieBoyz UX/UI Redesign Ideas — Full Spec

Generated: 2026-03-30
Source: parallel research/brainstorm agents (frontend analysis, library research, UX brainstorm)

---

## Context

The weekly gross redesign introduced nested column groups (up to 5 header rows when fully expanded: top-level groups, week date-range groups, week# sub-groups, day-of-week labels, day columns). This exposed a broader UX problem: the table is optimised for analysts, but the actual audience is a small group of friends asking one question each visit — "where do I stand, how is my movie doing this weekend?"

This document collects all ideas generated for interrogation and design direction decision.

---

## Part 1 — Table Density (Quick Wins, No Structural Change)

These are CSS/config tweaks that reduce header height without removing any data.

### D1. Add `line-height: 1` to header cells
- **File:** `css/style.css` — add to `.tabulator-col-title` selector (line ~68)
- **Impact:** ~15-20% header height reduction (body default is 1.5)
- **Effort:** 1 line
- **Risk:** None

### D2. Reduce header cell padding to 4px top/bottom
- **File:** `css/style.css` — new rule targeting `.tabulator-header .tabulator-col`
- **Rule:** `padding-top: 4px; padding-bottom: 4px;` (Tabulator default is ~8px)
- **Impact:** ~20-25% height reduction
- **Effort:** 1 rule
- **Risk:** Low

### D3. Add `line-height: 1` to `.col-day-label`
- **File:** `css/style.css` — add to existing `.col-day-label` block (line ~185)
- **Impact:** ~10-15% reduction on the day-label row specifically
- **Effort:** 1 line
- **Risk:** None

### D4. Reduce column minWidths
- **File:** `js/table.js`
- Day columns: `68 → 60` (saves ~56px across 7 columns)
- Week total column: `150 → 130`
- Visible ratings column: `120 → 100`
- **Impact:** Narrower columns, slightly more data visible without scroll
- **Effort:** 3 numbers
- **Risk:** Medium — numeric values may feel cramped below ~60px; test with real data

### D5. Reduce group-expand-btn to 14x14
- **File:** `css/style.css` — `.group-expand-btn` block (line ~155)
- Change: `width/height: 16px → 14px`, `margin-left: 6px → 4px`, `font-size: 0.65rem → 0.6rem`
- **Impact:** Small, ~5px savings per button
- **Effort:** 2-3 values
- **Risk:** Slightly smaller tap target on mobile

**Cumulative estimate for D1-D3:** Header compresses from ~5 rows to ~3.5 rows (~30-35% reduction).

---

## Part 2 — Table Structure and Information Architecture

These change how data is presented in the table, without adding new pages or components.

### T1. Compact / Full table mode toggle
- Default state: show only `Movie | Owner | Gross TD | Profit TD | ROI | [current week total]`
- A "Full breakdown" button (or toggle) reveals all week groups and day columns
- The existing `makeExpandableGroup` mechanism handles show/hide per-week; this generalises it to a global mode
- **Impact:** High — directly addresses the 5-row header problem for casual visitors
- **Effort:** Medium — needs a global state toggle wired to all week groups and day columns
- **Dependency:** Works well with D1-D3 already applied

### T2. Simpler week header labels
- Replace `"Mar 24-30"` date-range labels with `"Wk 1"`, `"Wk 2"` etc. (relative to season start)
- Full date range moves to a tooltip on hover
- **Impact:** Medium — shorter labels reduce header text wrapping; easier to reference in conversation ("Wk 3 was big")
- **Effort:** Low — modify `weekTitle()` in `js/table.js`, add `headerTooltip`
- **Note:** Requires defining "season start" — could be the earliest release date in the data, or a config constant

### T3. Ratings group hidden by default (collapsed)
- The ratings group already starts with only Letterboxd visible; the group header still occupies a row
- Set the group to start fully collapsed (no columns visible) — user clicks [+] to expand
- **Impact:** Low-Medium — removes one persistent header row
- **Effort:** Low — `makeExpandableGroup(..., initialExpanded: false)` + hide Letterboxd column by default
- **Trade-off:** Ratings are arguably useful context; hiding them by default may frustrate users who care

### T4. Pick-type filter buttons
- Add pick-type filter pills (Hit, Seasonal, Alt, Bomb) alongside the existing owner filter
- Wire to Tabulator `.setFilter()` — same pattern already used for owner filtering
- **Impact:** Medium — lets users quickly drill into "all bombs" or "all hits"
- **Effort:** Low — `buildOwnerFilter` pattern in `js/app.js` can be extended

### T5. Sortable leaderboard columns
- The leaderboard (`#leaderboard` table) is plain HTML with no interactivity
- Add click-to-sort on columns: Total, Picks value, Wk Delta, Daily Delta
- Sort logic: re-render from the existing `ranked` array in `buildLeaderboard()`
- **Impact:** Low — mostly a power-user feature; current sort (by total) is probably the right default
- **Effort:** Low

---

## Part 3 — New Components (Additive)

These add new UI elements without removing existing ones.

### N1. "This Weekend" strip
- A row of Bootstrap cards between the nav and leaderboard showing each owner's active movie
- Per card: owner colour dot, movie title, pick-type badge, current partial-week gross (or "--" if no data yet), delta vs. last weekend (if available)
- Data is already present in the weekly gross structure — current week total is `week_[current wk key]`
- **Impact:** High — surfaces the single most relevant data point for a typical Sunday visit without any table interaction
- **Effort:** Low-Medium — new component reading from existing data; no new data infrastructure

### N2. Movie detail drawer
- Clicking a table row opens a Bootstrap off-canvas drawer (right side, full height) instead of / in addition to the chart highlight
- Drawer content: movie poster (from TMDB API or omit), owner + pick-type, release date, budget, breakeven, gross TD, profit TD, ROI, all ratings side by side, weekly gross sparkline
- Removes pressure to show everything in the table row itself
- **Impact:** High — enables a much thinner table while preserving drill-down access to all data
- **Effort:** Medium — new component; TMDB poster fetch is optional complexity

### N3. Sticky standings bar
- On scroll past the leaderboard, a slim sticky bar pins to the top of the viewport
- Content: rank position, owner name, profit (colour-coded), weekly delta — one row per owner
- On mobile: horizontally scrollable chip row
- **Impact:** Medium — removes the need to scroll back up to check standings while browsing the movie table
- **Effort:** Low-Medium — `IntersectionObserver` on the leaderboard to show/hide the sticky bar

### N4. Owner profile enhancements in leaderboard
- Add two sub-lines to each leaderboard row: top-performing movie (by profit) and worst-performing movie
- Could be a tooltip or always-visible sub-row
- **Impact:** Medium — adds narrative context ("Marcus is winning on Thunderbolts but getting crushed on White Noise")
- **Effort:** Low — data already available; just render changes

### N5. Season summary footer row
- A summary row at the bottom of the leaderboard: total league gross, total picks released, average ROI, # profitable vs. loss picks
- **Impact:** Low — contextual, nice to have
- **Effort:** Low

### N6. Leaderboard sparklines
- Mini SVG sparkline (4-8 weeks of cumulative profit) inside the leaderboard "Total" column
- Libraries: plain inline SVG (no dependency), or a ~3KB micro library
- Data: already computed in the chart's owner-totals series
- **Impact:** Medium — shows trajectory (rising vs. plateauing) without requiring chart interaction
- **Effort:** Medium — needs a small SVG rendering function and access to the weekly owner-total series

---

## Part 4 — Layout and Navigation

These change the overall page structure.

### L1. Two-tab layout: Standings / Movies
- Wrap the page in Bootstrap nav-tabs or nav-pills
- Tab 1 "Standings": leaderboard + profit chart (what you see first on load)
- Tab 2 "Movies": the movie table + owner filter
- Hash-based URLs: `#standings`, `#movies` for direct linking
- **Impact:** High — users who only want standings never see the wide table; cleaner separation of concerns
- **Effort:** Low — Bootstrap tabs + minor JS to persist active tab

### L2. URL/localStorage state persistence
- Persist active owner filter and selected movies to `localStorage` (theme is already persisted this way)
- Optionally encode in URL hash for sharing: `#owner=Marcus,Derek`
- **Impact:** Low-Medium — quality of life; prevents having to re-set filters on every visit
- **Effort:** Low

---

## Part 5 — New Visualisations

### V1. Rank-over-time bump chart
- A secondary chart mode showing each owner's rank position over time (weeks)
- Dramatically shows lead changes: who was winning in week 4 vs. week 8
- Computable from existing owner-total series — rank each owner per week
- **Impact:** Medium — more narratively interesting than the cumulative profit chart; good for end-of-season review
- **Effort:** Medium — new Chart.js dataset configuration; rank computation logic

---

## Part 6 — Mobile-Specific

### M1. Card list on mobile (≤767px)
- On narrow viewports, replace the Tabulator table with a card-per-movie list
- Card content: movie title, owner dot, pick-type badge, profit (colour-coded), ROI, current week gross
- Tapping a card opens the detail drawer (N2)
- The Tabulator table only renders on wider screens
- **Impact:** High — transforms the mobile experience (current horizontal scroll with disabled frozen columns is poor)
- **Effort:** High — essentially a second rendering path; requires a responsive breakpoint check and a new card layout component

---

## Design Direction Summary Matrix

| ID | Idea | Impact | Effort | Category |
|----|------|--------|--------|----------|
| D1-D3 | CSS density quick wins | High | Low | Density |
| T1 | Compact/Full table toggle | High | Medium | Structure |
| N1 | "This Weekend" strip | High | Low-Med | New component |
| L1 | Two-tab layout | High | Low | Navigation |
| N2 | Movie detail drawer | High | Medium | New component |
| M1 | Mobile card list | High | High | Mobile |
| T2 | Simpler week labels (Wk N) | Medium | Low | Structure |
| N3 | Sticky standings bar | Medium | Low-Med | New component |
| T4 | Pick-type filter | Medium | Low | Structure |
| N6 | Leaderboard sparklines | Medium | Medium | Visualisation |
| V1 | Rank-over-time bump chart | Medium | Medium | Visualisation |
| N4 | Owner profile enhancements | Medium | Low | New component |
| D4-D5 | minWidth/button tweaks | Low-Med | Low | Density |
| T3 | Ratings hidden by default | Low-Med | Low | Structure |
| T5 | Sortable leaderboard | Low | Low | Structure |
| L2 | URL/localStorage state | Low-Med | Low | Navigation |
| N5 | Season summary footer | Low | Low | New component |

---

## Remaining Items Ranked by Impact-to-Effort

Items from Parts 2–6 that are not yet implemented, ordered by priority.

| Rank | ID | Idea | Impact | Effort | Rationale |
|------|----|------|--------|--------|-----------|
| 1 | L1 | Two-tab layout (Standings/Movies) | High | Low | Single biggest structural win. Casual users never have to see the table. Bootstrap tabs + hash routing is minimal JS. |
| 2 | N1 | "This Weekend" strip | High | Low-Med | Directly answers the question users actually show up to ask. Data already exists. |
| 3 | T1 | Compact/Full table toggle | High | Medium | Kills the 5-row header problem without removing data. Natural pairing with L1. |
| 4 | N2 | Movie detail drawer | High | Medium | Unlocks a much thinner table — offloads detail to drawer. Enables M1 too. |
| 5 | T2 | Simpler week labels ("Wk N") | Medium | Low | Low effort, reduces header text wrapping immediately. |
| 6 | T4 | Pick-type filter pills | Medium | Low | Extends existing owner filter pattern — near copy-paste. |
| 7 | N3 | Sticky standings bar | Medium | Low-Med | Useful on long-scroll sessions; IntersectionObserver is well-understood. |
| 8 | N4 | Owner profile enhancements | Medium | Low | Data already computed, pure render change to leaderboard. |
| 9 | N6 | Leaderboard sparklines | Medium | Medium | Good trajectory signal; needs a small SVG helper but no new deps. |
| 10 | V1 | Rank-over-time bump chart | Medium | Medium | More narratively interesting chart; better for end-of-season. Not urgent mid-season. |
| 11 | M1 | Mobile card list | High | High | High payoff but high effort; best tackled after N2 (drawer) exists as the drill-down target. |
| 12 | L2 | localStorage filter persistence | Low-Med | Low | Quality-of-life, not visible enough to prioritise now. |
| 13 | T5 | Sortable leaderboard | Low | Low | Current default sort (by total) is correct; marginal gain. |
| 14 | D4/D5 | Remaining minWidth/button tweaks | Low-Med | Low | Finish the density work, but diminishing returns at this point. |
| 15 | N5 | Season summary footer | Low | Low | Nice to have; lowest priority. |

**Top cluster for concepting: L1, N1, T1, N2** — these four define a coherent new information architecture (tabs hide the table, the strip surfaces current data, the toggle controls table density, the drawer enables detail-on-demand). The rest are incremental on top of that foundation.

---

## Open Design Questions

1. **Compact vs. detail**: Is the table the right primary UI at all, or should movie cards / a detail drawer be the default mobile experience with the table as "power mode"?
2. **Season definition**: T2 (week labels) and N1 (this weekend strip) both benefit from a defined season start date. Is this a config constant or derived from the data?
3. **Poster images**: N2 (movie detail drawer) is significantly richer with posters. Is TMDB API access in scope, or should the drawer be poster-free?
4. **Ratings default**: T3 proposes hiding ratings by default. Does the group still show any value at a glance if fully collapsed on load?
5. **Tab vs. single-page**: L1 (two tabs) is a structural change. Does the page feel long enough today to warrant splitting, or is it acceptable with compact mode (T1)?
