import { fmt, fmtPct, colorClass, pickIcon, formatShortDate } from '../utils.js';
import {
  unpickedReleasedForDraft,
  unpickedUnreleasedForDraft,
  profitRanksForSeason
} from './season-helpers.js';

var SEASON_LABEL = { WINTER: 'Winter', SUMMER: 'Summer', FALL: 'Fall' };

function releasedRow(m, ranks, rankTip) {
  var roi = m.breakeven ? (m.profit_td / m.breakeven * 100) : null;
  var profitHtml = '<span class="' + colorClass(m.profit_td) + '">' + fmt(m.profit_td) + '</span>'
    + ' <span class="text-neu" style="font-size:0.9em">(' + (roi !== null ? fmtPct(roi) : '—') + ')</span>';
  var rank = ranks[m.imdb_id];
  var rankHtml = rank != null
    ? '<span class="text-neu">#' + rank + '</span>'
    : '<span class="text-neu">—</span>';
  var titleAttr = m.movie_title ? ' title="' + m.movie_title.replace(/"/g, '&quot;') + '"' : '';
  return '<tr data-imdb="' + m.imdb_id + '" data-kind="candidate">'
    + '<td class="cell-title"' + titleAttr + '>' + pickIcon(m.pick_type, m.release_date) + m.movie_title + '</td>'
    + '<td class="cell-profit text-end">' + profitHtml + '</td>'
    + '<td class="text-end" title="' + rankTip + '">' + rankHtml + '</td>'
    + '</tr>';
}

function unreleasedRow(m) {
  var dateLabel;
  if (!m.release_date || m.release_date === 'TBA') {
    dateLabel = 'TBA';
  } else {
    dateLabel = formatShortDate(m.release_date);
  }
  var titleAttr = m.movie_title ? ' title="' + m.movie_title.replace(/"/g, '&quot;') + '"' : '';
  return '<tr data-imdb="' + m.imdb_id + '" data-kind="candidate">'
    + '<td class="cell-title"' + titleAttr + '>' + pickIcon(m.pick_type, m.release_date) + m.movie_title + '</td>'
    + '<td class="text-end">' + dateLabel + '</td>'
    + '</tr>';
}

function releasedCard(rows, label, ranks) {
  var rankTip = "Profit rank within the movie's release season";
  if (!rows.length) {
    return '<div class="info-tab-card draft-unpicked-card draft-unpicked-released">'
      + '<div class="draft-unpicked-header">Released - Unpicked - ' + label + '</div>'
      + '<p class="draft-empty draft-unpicked-empty">No unpicked releases with profit data.</p>'
      + '</div>';
  }
  var body = rows.map(function(m) { return releasedRow(m, ranks, rankTip); }).join('');
  return '<div class="info-tab-card draft-unpicked-card draft-unpicked-released">'
    + '<div class="draft-unpicked-header">Released - Unpicked - ' + label + '</div>'
    + '<div class="info-card-table-wrap draft-unpicked-scroll">'
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

function unreleasedCard(rows, label) {
  if (!rows.length) {
    return '<div class="info-tab-card draft-unpicked-card draft-unpicked-unreleased">'
      + '<div class="draft-unpicked-header">Unreleased - Unpicked - ' + label + '</div>'
      + '<p class="draft-empty draft-unpicked-empty">No unreleased unpicked movies.</p>'
      + '</div>';
  }
  var body = rows.map(unreleasedRow).join('');
  return '<div class="info-tab-card draft-unpicked-card draft-unpicked-unreleased">'
    + '<div class="draft-unpicked-header">Unreleased - Unpicked - ' + label + '</div>'
    + '<div class="info-card-table-wrap draft-unpicked-scroll">'
    +   '<table class="scorecard-movie-table">'
    +     '<thead><tr>'
    +       '<th>Movie</th>'
    +       '<th class="text-end">Release date</th>'
    +     '</tr></thead>'
    +     '<tbody>' + body + '</tbody>'
    +   '</table>'
    + '</div>'
    + '</div>';
}

export function buildUnpickedCards(data, season, colorMap, mountEl) {
  if (!mountEl) return;
  var label = SEASON_LABEL[season] || season;
  var released = unpickedReleasedForDraft(data, season);
  var unreleased = unpickedUnreleasedForDraft(data, season);
  var ranks = profitRanksForSeason(data, season);
  mountEl.innerHTML = releasedCard(released, label, ranks) + unreleasedCard(unreleased, label);
}
