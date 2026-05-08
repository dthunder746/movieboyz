import { fmt, fmtPct, colorClass, pickIcon } from '../utils.js';
import { unpickedForDraft, profitRanksForSeason } from './season-helpers.js';

var SEASON_LABEL = { WINTER: 'Winter', SUMMER: 'Summer', FALL: 'Fall' };

export function buildUnpickedCard(data, season, colorMap, mountEl) {
  if (!mountEl) return;

  var rows = unpickedForDraft(data, season);
  var label = SEASON_LABEL[season] || season;

  if (!rows.length) {
    mountEl.innerHTML = '<div class="info-tab-card">'
      + '<div class="draft-unpicked-header">Most Profitable Unpicked — ' + label + '</div>'
      + '<p class="draft-empty draft-unpicked-empty">No unpicked releases with profit data.</p>'
      + '</div>';
    return;
  }

  var ranks = profitRanksForSeason(data, season);
  var rankTip = "Profit rank within the movie's release season";

  var body = rows.map(function(m) {
    var roi = m.breakeven ? (m.profit_td / m.breakeven * 100) : null;
    var profitHtml = '<span class="' + colorClass(m.profit_td) + '">' + fmt(m.profit_td) + '</span>'
      + ' <span class="text-neu" style="font-size:0.9em">(' + (roi !== null ? fmtPct(roi) : '—') + ')</span>';
    var rank = ranks[m.imdb_id];
    var rankHtml = rank != null
      ? '<span class="text-neu">#' + rank + '</span>'
      : '<span class="text-neu">—</span>';
    var titleAttr = m.movie_title ? ' title="' + m.movie_title.replace(/"/g, '&quot;') + '"' : '';
    return '<tr>'
      + '<td class="cell-title"' + titleAttr + '>' + pickIcon(m.pick_type, m.release_date) + m.movie_title + '</td>'
      + '<td class="cell-profit text-end">' + profitHtml + '</td>'
      + '<td class="text-end" title="' + rankTip + '">' + rankHtml + '</td>'
      + '</tr>';
  }).join('');

  mountEl.innerHTML = '<div class="info-tab-card">'
    + '<div class="draft-unpicked-header">Most Profitable Unpicked — ' + label + '</div>'
    + '<div class="info-card-table-wrap">'
    +   '<table class="scorecard-movie-table">'
    +     '<colgroup>'
    +       '<col class="col-title">'
    +       '<col class="col-profit">'
    +       '<col class="col-rank">'
    +     '</colgroup>'
    +     '<thead><tr>'
    +       '<th>Movie</th>'
    +       '<th class="text-end">Profit (ROI)</th>'
    +       '<th class="text-end" title="' + rankTip + '">Rank</th>'
    +     '</tr></thead>'
    +     '<tbody>' + body + '</tbody>'
    +   '</table>'
    + '</div>'
    + '</div>';
}
