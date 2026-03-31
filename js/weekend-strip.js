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

    // Header
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

    // Stat grid
    var statGridHtml = '<div class="scorecard-stats">'
      + statCell(season, 'Season', 'plain')
      + statCell(wkDelta, 'Wk Delta', 'signed')
      + statCell(bomb, 'Bomb Impact', 'plain')
      + statCell(roi, 'ROI', 'pct')
      + '</div>';

    // Movie list
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

    // Footer
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

    // Assemble card
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
