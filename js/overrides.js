/**
 * Movie overrides — apply runtime corrections to data.json without modifying it.
 *
 * Data file: public/overrides.json (served at /overrides.json).
 *
 * Schema:
 *   {
 *     "_README":   "anything starting with _ is ignored",
 *     "<imdb_id>": { "exclude": true }                 // remove this movie entirely
 *     "<imdb_id>": { "<field>": <value>, ... }         // override one or more fields
 *   }
 *
 * Reserved keys: any key starting with `_` is ignored by the apply function and
 * is a safe place for documentation hints inside the JSON itself.
 *
 * Supported override fields (shallow-merged onto data.movies[id]):
 *   movie_title      string                              Display rename.
 *   release_date     "YYYY-MM-DD" | "TBA" | null         Correct theatrical date.
 *   released_digital "YYYY-MM-DD" | null                 Correct digital date.
 *   owner            "Chris" | "Connie" | "Emerson" |
 *                    "Marcus" | "Matt" | "none"          Ownership correction.
 *   pick_type        "hit" | "seasonal" | "alt" |
 *                    "bomb" | null                       Pick type correction.
 *   draft_pick       number | null                       Draft order correction.
 *   season           "WINTER" | "SUMMER" | "FALL"        Season categorization.
 *   year             number                              Release year.
 *   budget           number                              Production budget.
 *   breakeven        number | null                       Breakeven (normally 2 × budget).
 *   days_running     number | null                       Manual override (rare).
 *
 * The shallow merge means overriding time-series fields (daily_gross, daily_change,
 * profit, weekly_gross) or the nested ratings object would REPLACE them entirely.
 * That is almost never useful; do not override those fields here.
 *
 * Special flag:
 *   exclude          true                                Delete the movie record
 *                                                       before any rendering.
 *
 * `exclude: true` wins over field overrides on the same key.
 *
 * Limitation — owner totals:
 *   data.owners[*] series are computed by the fetcher with bomb-split logic that
 *   this site does not replicate. Excluding a movie removes it from data.movies
 *   but leaves data.owners untouched. For unowned movies this has no effect on
 *   totals (their profit is already zero in the owner aggregates). For owned
 *   movies the totals will be slightly off until the fetcher re-runs or the
 *   override is removed.
 *
 * Examples:
 *   { "tt1234567": { "exclude": true } }
 *   { "tt2345678": { "movie_title": "Project Hell Yeah" } }
 *   { "tt3456789": { "release_date": "2027-06-15", "released_digital": null } }
 */
export function applyOverrides(data, overrides) {
  if (!data || !data.movies || !overrides) return;
  Object.keys(overrides).forEach(function(id) {
    if (id.charAt(0) === '_') return;
    if (!data.movies[id]) {
      console.warn('overrides.json: no movie found for IMDB ID ' + id);
      return;
    }
    var entry = overrides[id];
    if (entry && entry.exclude === true) {
      delete data.movies[id];
      return;
    }
    data.movies[id] = Object.assign({}, data.movies[id], entry);
  });
}
