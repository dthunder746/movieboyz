import {
  fmt, fmtPct, colorClass, ratingColorClass,
  formatShortDate, formatDayMonth, isoWeekBounds, getWeekdayAbbr,
} from './utils.js';

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

// ── Tabulator table ───────────────────────────────────────────────────────
// Reads pre-computed fields from each movie record (added by the fetcher).
// Returns { table, hiddenWeekCols } where hiddenWeekCols is an array of
// field names for week columns that start hidden (all weeks beyond last 4).

export function buildTable(data, colorMap) {

  // Collect daily-change dates and weekly keys from pre-computed movie fields
  var allDailyDates = new Set();
  var allWeekKeys   = new Set();
  Object.values(data.movies).forEach(function(m) {
    Object.keys(m.daily_change || {}).forEach(function(d) { allDailyDates.add(d); });
    Object.keys(m.weekly_gross || {}).forEach(function(w) { allWeekKeys.add(w); });
  });
  var sortedDaily = Array.from(allDailyDates).sort();
  var last7       = sortedDaily.slice(-7);
  var allWeeks    = Array.from(allWeekKeys).sort();

  var anyReleased = sortedDaily.length > 0;

  // Build row data from pre-computed fields
  var rows = Object.entries(data.movies).map(function(entry) {
    var imdb_id = entry[0], movie = entry[1];
    var dc = movie.daily_change || {};
    var wg = movie.weekly_gross || {};

    var row = {
      imdb_id:        imdb_id,
      movie_title:    movie.movie_title,
      owner:          movie.owner,
      pick_type:      movie.pick_type,
      release_date:   movie.release_date || 'TBA',
      days_running:   movie.days_running != null ? movie.days_running : null,
      budget:         movie.budget || 0,
      breakeven:      movie.breakeven   != null ? movie.breakeven   : null,
      to_date_gross:  movie.gross_td    != null ? movie.gross_td    : null,
      to_date_profit: movie.profit_td   != null ? movie.profit_td   : null,
      roi: (movie.profit_td != null && movie.breakeven) ? movie.profit_td / movie.breakeven * 100 : null,
    };

    var r = movie.ratings || null;
    row.rating_letterboxd  = r && r.letterboxd  && r.letterboxd.score  != null ? r.letterboxd.score  : null;
    row.rating_imdb        = r && r.imdb        && r.imdb.score        != null ? r.imdb.score        : null;
    row.rating_rt_audience = r && r.rt_audience && r.rt_audience.score != null ? r.rt_audience.score : null;
    row.rating_rt_critic   = r && r.rt_critic   && r.rt_critic.score   != null ? r.rt_critic.score   : null;
    row.rating_tmdb        = r && r.tmdb        && r.tmdb.score        != null ? r.tmdb.score        : null;
    row.rating_metacritic  = r && r.metacritic  && r.metacritic.score  != null ? r.metacritic.score  : null;
    row.ratings_raw        = r;

    last7.forEach(function(d) {
      row['daily_' + d] = dc[d] !== undefined ? dc[d] : null;
    });

    allWeeks.forEach(function(wk) {
      row['week_' + wk] = wg[wk] !== undefined ? wg[wk] : null;
    });

    return row;
  });

  // Formatters
  function fmtCell(cell) {
    var v = cell.getValue();
    if (v === null || v === undefined) return '<span class="text-neu">—</span>';
    return '<span class="' + colorClass(v) + '">' + fmt(v) + '</span>';
  }

  function fmtRoi(cell) {
    var v = cell.getValue();
    if (v === null || v === undefined) return '<span class="text-neu">—</span>';
    return '<span class="' + colorClass(v) + '">' + fmtPct(v) + '</span>';
  }

  function fmtGross(cell) {
    var v = cell.getValue();
    if (v === null || v === undefined) return '<span class="text-neu">—</span>';
    return fmt(v);
  }

  // Week column title from ISO week key (Mon–Sun date range)
  function weekTitle(wk) {
    var b = isoWeekBounds(wk);
    var sm = b.start.split('-'), em = b.end.split('-');
    return sm[1] === em[1]
      ? formatShortDate(b.start) + '–' + parseInt(em[2])
      : formatShortDate(b.start) + '–' + formatShortDate(b.end);
  }

  // Rating sources
  var FAVICON_BASE = 'https://www.google.com/s2/favicons?domain=';
  var RATING_SOURCES = [
    { field: 'rating_letterboxd',  key: 'letterboxd',  label: 'Letterboxd',        icon: FAVICON_BASE + 'letterboxd.com&sz=32',       emoji: false, display: function(v){ return (v/20).toFixed(1); }, visible: true  },
    { field: 'rating_imdb',        key: 'imdb',         label: 'IMDb',              icon: FAVICON_BASE + 'imdb.com&sz=32',             emoji: false, display: function(v){ return (v/10).toFixed(1); }, visible: false },
    { field: 'rating_rt_audience', key: 'rt_audience',  label: 'RT Audience Score', icon: '🍿',                                        emoji: true,  display: function(v){ return v + '%'; },           visible: false },
    { field: 'rating_rt_critic',   key: 'rt_critic',    label: 'RT Tomatometer',    icon: FAVICON_BASE + 'rottentomatoes.com&sz=32',   emoji: false, display: function(v){ return v + '%'; },           visible: false },
    { field: 'rating_tmdb',        key: 'tmdb',         label: 'TMDB',              icon: FAVICON_BASE + 'themoviedb.org&sz=32',       emoji: false, display: function(v){ return (v/10).toFixed(1); }, visible: false },
    { field: 'rating_metacritic',  key: 'metacritic',   label: 'Metacritic',        icon: FAVICON_BASE + 'metacritic.com&sz=32',       emoji: false, display: function(v){ return String(v); },         visible: false },
  ];

  var ratingCols = RATING_SOURCES.map(function(src, i) {
    return {
      title:         src.label,
      field:         src.field,
      titleFormatter: function() {
        if (src.emoji) return '<span style="font-size:14px;line-height:1">' + src.icon + '</span>';
        return '<img src="' + src.icon + '" width="16" height="16" style="vertical-align:middle" alt="' + src.label + '">';
      },
      headerTooltip: src.label,
      hozAlign:      'center',
      minWidth:      50,
      visible:       src.visible,
      cssClass:      i === 0 ? 'ratings-sep' : i === RATING_SOURCES.length - 1 ? 'ratings-end' : '',
      sorter:        'number',
      formatter: function(cell) {
        var v = cell.getValue();
        if (v === null || v === undefined) return '<span class="text-neu">—</span>';
        return '<span class="' + ratingColorClass(v) + '">' + src.display(v) + '</span>';
      },
      formatterParams: { html: true },
      tooltip: function(e, cell) {
        var raw = cell.getRow().getData().ratings_raw;
        if (!raw || !raw[src.key]) return false;
        var votes = raw[src.key].votes;
        if (votes == null) return false;
        return votes.toLocaleString() + ' votes';
      },
    };
  });

  var hiddenRatingCols = RATING_SOURCES.filter(function(s){ return !s.visible; }).map(function(s){ return s.field; });

  // Column definitions
  var titleCol = {
    title: 'Movie',
    field: 'movie_title',
    frozen: true,
    minWidth: 190,
    formatter: function(cell) {
      var row = cell.getRow().getData();
      var dot = '<span class="owner-dot" style="background:' + (colorMap[row.owner] || '#888') + '"></span>';
      var badge = row.pick_type ? '<span class="pick-badge pick-' + row.pick_type + '">' + row.pick_type + '</span>' : '';
      return dot + cell.getValue() + (badge ? ' ' + badge : '');
    },
    formatterParams: { html: true },
  };

  var dailyCols = last7.slice().reverse().map(function(d, i) {
    var abbr = getWeekdayAbbr(d);
    var isWeekend = (abbr === 'SAT' || abbr === 'SUN');
    var classes = [i === 0 ? 'daily-sep' : null, isWeekend ? 'col-weekend' : null].filter(Boolean).join(' ');
    var col = {
      title: formatDayMonth(d),
      field: 'daily_' + d,
      hozAlign: 'right',
      minWidth: 68,
      cssClass: classes,
      formatter: fmtCell,
      formatterParams: { html: true },
      sorter: 'number',
    };
    col.titleFormatter = function() {
      var cls = 'col-day-label' + (isWeekend ? ' col-weekend-label' : '');
      return '<span class="' + cls + '">' + abbr + '</span><br>' + formatDayMonth(d);
    };
    return col;
  });

  // All weeks reversed (most recent first); last 4 visible, older hidden
  var reversedWeeks = allWeeks.slice().reverse();
  var weeklyCols = reversedWeeks.map(function(wk, i) {
    var isLatest = (i === 0);
    var visible  = (i < 4);
    return {
      title:    weekTitle(wk),
      field:    'week_' + wk,
      hozAlign: 'right',
      minWidth: 90,
      visible:  visible,
      cssClass: [i === 0 ? 'week-sep' : null, isLatest ? 'week-latest' : null].filter(Boolean).join(' '),
      formatter: fmtCell,
      formatterParams: { html: true },
      sorter: 'number',
    };
  });

  // Field names for columns that start hidden (all weeks beyond last 4)
  var hiddenWeekCols = reversedWeeks.slice(4).map(function(wk) { return 'week_' + wk; });

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
  Array.prototype.push.apply(movieDetailCols, ratingCols);
  movieDetailCols.push(
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
    }
  );

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
    data:                  rows,
    columns:               columns,
    layout:                'fitDataFill',
    responsiveLayout:      false,
    initialSort:           [{ column: 'release_date', dir: 'asc' }],
    columnHeaderVertAlign: 'bottom',
    resizableColumns:      false,
    selectableRows:        true,
    pagination:            true,
    paginationSize:        25,
    paginationSizeSelector: [10, 25, 50, 100, true],
  });

  return { table: table, hiddenWeekCols: hiddenWeekCols, hiddenRatingCols: hiddenRatingCols };
}

// ── Owner filter ──────────────────────────────────────────────────────────
// Pure render — no internal state. Reads activeOwners array, paints buttons.
// Clicks are handled via event delegation in app.js.
// showWeekHistory / hasWeekHistory control the week-history toggle button.

export function buildOwnerFilter(owners, colorMap, activeOwners, showUnowned, showWeekHistory, hasWeekHistory, showRatings, hasRatingCols) {
  var container = document.getElementById('owner-filter');
  if (!container) return;
  var activeSet = new Set(activeOwners);

  container.innerHTML = '';

  owners.forEach(function(owner) {
    var active = activeSet.has(owner);
    var btn = document.createElement('button');
    btn.className = 'btn btn-sm ' + (active ? 'btn-primary' : 'btn-outline-secondary');
    if (active) btn.style.backgroundColor = colorMap[owner];
    btn.style.borderColor = colorMap[owner];
    btn.dataset.owner = owner;
    btn.innerHTML = '<span class="owner-dot" style="background:' + colorMap[owner] + '"></span>' + owner;
    container.appendChild(btn);
  });

  var unownedToggle = document.createElement('button');
  unownedToggle.className = 'btn btn-sm btn-outline-secondary';
  unownedToggle.textContent = showUnowned ? 'Hide unowned movies' : 'Show unowned movies';
  unownedToggle.dataset.toggleUnowned = '1';
  container.appendChild(unownedToggle);

  if (hasWeekHistory) {
    var weekToggle = document.createElement('button');
    weekToggle.className = 'btn btn-sm btn-outline-secondary';
    weekToggle.textContent = showWeekHistory ? 'Hide week history' : 'Show week history';
    weekToggle.dataset.toggleWeekHistory = '1';
    container.appendChild(weekToggle);
  }

  if (hasRatingCols) {
    var ratingsToggle = document.createElement('button');
    ratingsToggle.className = 'btn btn-sm btn-outline-secondary';
    ratingsToggle.textContent = showRatings ? 'Hide all ratings' : 'Show all ratings';
    ratingsToggle.dataset.toggleRatings = '1';
    container.appendChild(ratingsToggle);
  }

  var clear = document.createElement('button');
  clear.className = 'btn btn-sm btn-outline-secondary';
  clear.textContent = 'Clear';
  clear.dataset.clear = '1';
  container.appendChild(clear);
}
