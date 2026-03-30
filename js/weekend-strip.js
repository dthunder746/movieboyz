import { fmt, colorClass, isoWeekBounds, formatShortDate } from './utils.js';

export function buildWeekendStrip(data, owners, colorMap, LATEST_DATE) {
  var el = document.getElementById('weekend-strip');
  if (!el) return;

  // Collect all week keys across all movies — use the max as current week
  var allWeekKeys = new Set();
  Object.values(data.movies).forEach(function(m) {
    Object.keys(m.weekly_gross || {}).forEach(function(w) { allWeekKeys.add(w); });
  });
  var sortedWeeks = Array.from(allWeekKeys).sort();
  if (!sortedWeeks.length) { el.classList.add('d-none'); return; }

  var currentWeek = sortedWeeks[sortedWeeks.length - 1];
  var bounds = isoWeekBounds(currentWeek);
  var prevWeek = sortedWeeks.length > 1 ? sortedWeeks[sortedWeeks.length - 2] : null;

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
    var pickType = c.movie.pick_type ? c.movie.pick_type.toLowerCase() : null;

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
      + (pickType ? '<span class="pick-badge pick-' + pickType + ' ms-1">' + pickType.charAt(0).toUpperCase() + pickType.slice(1) + '</span>' : '')
      + '</div>'
      + '<div class="weekend-card-title" title="' + c.movie.movie_title + '">' + c.movie.movie_title + '</div>'
      + '<div class="weekend-card-gross">' + grossHtml + deltaHtml + '</div>'
      + '</div>';
  });

  html += '</div>';
  el.innerHTML = html;
}
