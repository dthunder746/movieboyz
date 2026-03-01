import { colorClass, fmt, formatShortDate } from './utils.js';

// ── Leaderboard ───────────────────────────────────────────────────────────

function shiftDate(isoDate, deltaDays) {
  var d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().split('T')[0];
}

function findFloorDate(sortedDates, target) {
  var result = null;
  for (var i = 0; i < sortedDates.length; i++) {
    if (sortedDates[i] <= target) result = sortedDates[i];
    else break;
  }
  return result;
}

export function buildLeaderboard(data, owners, colorMap, LATEST_DATE, activeOwners) {
  var el = document.getElementById('leaderboard');
  if (!el) return;

  var activeSet = new Set(activeOwners);

  // Build a dense date grid from the union of all owners' total series
  var dateUnion = new Set();
  owners.forEach(function(o) {
    Object.keys((data.owners[o] || {}).total || {}).forEach(function(d) { dateUnion.add(d); });
  });
  var totalDates = Array.from(dateUnion).sort();
  var prevIdx = totalDates.indexOf(LATEST_DATE) - 1;
  var PREV_DATE = prevIdx >= 0 ? totalDates[prevIdx] : null;

  var WEEK_START  = LATEST_DATE ? findFloorDate(totalDates, shiftDate(LATEST_DATE, -7))  : null;

  // Build ranked rows
  var ranked = owners.map(function(o) {
    var od = data.owners[o] || {};
    var total      = od.total        || {};
    var picks      = od.picks_profit || {};
    var bomb       = od.bomb_impact  || {};
    var profit     = LATEST_DATE && total[LATEST_DATE]  !== undefined ? total[LATEST_DATE]  : null;
    var picksVal   = LATEST_DATE && picks[LATEST_DATE]  !== undefined ? picks[LATEST_DATE]  : null;
    var bombVal    = LATEST_DATE && bomb[LATEST_DATE]   !== undefined ? bomb[LATEST_DATE]   : null;
    var prevProfit = PREV_DATE   && total[PREV_DATE]    !== undefined ? total[PREV_DATE]    : null;
    var delta      = (profit !== null && prevProfit !== null) ? profit - prevProfit : null;
    var weekVal    = WEEK_START  && total[WEEK_START]  !== undefined ? profit - total[WEEK_START]  : null;

    var ownedMovies   = Object.values(data.movies).filter(function(m) { return m.owner === o; });
    var releasedCount = ownedMovies.filter(function(m) { return m.days_running != null; }).length;
    var totalCount    = ownedMovies.length;

    return { owner: o, profit: profit, picksVal: picksVal, bombVal: bombVal, delta: delta, weekVal: weekVal, releasedCount: releasedCount, totalCount: totalCount };
  });
  ranked.sort(function(a, b) {
    if (a.profit === null && b.profit === null) return 0;
    if (a.profit === null) return 1;
    if (b.profit === null) return -1;
    return b.profit - a.profit;
  });

  var medals = ['🥇','🥈','🥉'];
  var rows = ranked.map(function(item, idx) {
    var isActive = activeSet.has(item.owner);
    var outlineStyle = isActive
      ? 'outline:2px solid ' + colorMap[item.owner] + ';outline-offset:-1px;'
      : '';
    var rankLabel = medals[idx] || (idx + 1) + '.';
    var dot = '<span class="owner-dot" style="background:' + colorMap[item.owner] + '"></span>';
    var released = item.totalCount ? item.releasedCount + '/' + item.totalCount : '—';

    function cell(v) {
      return '<td class="text-end ' + colorClass(v) + '">' + fmt(v) + '</td>';
    }
    function deltaCell(v) {
      var sign = v !== null && v > 0 ? '+' : '';
      return '<td class="text-end ' + colorClass(v) + '">' + (v !== null ? sign + fmt(v) : '—') + '</td>';
    }

    return '<tr data-owner="' + item.owner + '" style="cursor:pointer;' + outlineStyle + '">'
      + '<td>' + rankLabel + '</td>'
      + '<td>' + dot + '<span class="fw-medium">' + item.owner + '</span></td>'
      + cell(item.profit)
      + cell(item.picksVal)
      + cell(item.bombVal)
      + deltaCell(item.delta)
      + deltaCell(item.weekVal)
      + '<td class="text-end text-secondary">' + released + '</td>'
      + '</tr>';
  });

  var wkTitle  = WEEK_START  && LATEST_DATE ? formatShortDate(WEEK_START)  + ' → ' + formatShortDate(LATEST_DATE) : '';

  el.innerHTML = '<table class="table table-sm table-hover mb-0 lb-stats-table">'
    + '<thead><tr class="text-secondary small">'
    + '<th>#</th><th>Owner</th>'
    + '<th class="text-end">Total</th>'
    + '<th class="text-end">Picks</th>'
    + '<th class="text-end">Bombs</th>'
    + '<th class="text-end">Daily&nbsp;Δ</th>'
    + '<th class="text-end" title="' + wkTitle + '">Wk&nbsp;Δ</th>'
    + '<th class="text-end">Released</th>'
    + '</tr></thead>'
    + '<tbody>' + rows.join('') + '</tbody>'
    + '</table>';
}
