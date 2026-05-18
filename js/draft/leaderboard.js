import { fmt, colorClass } from '../utils.js';
import { leaderboardForDraft, picksForDraft } from './season-helpers.js';
import { getAffectedImdbIds } from './whatif-store.js';

function isSeasonalOrAlt(m) {
  var pt = (m.pick_type || '').toLowerCase();
  return pt === 'seasonal' || pt === 'alt';
}

function fmtSigned(v) {
  if (v == null) return '—';
  if (v === 0) return fmt(0);
  return (v > 0 ? '+' : '-') + fmt(Math.abs(v));
}

function pickRow(pick, affected) {
  if (!pick) {
    return '<div class="draft-lb-pick">'
      +    '<span class="draft-lb-pick-name text-neu">—</span>'
      +    '<span class="draft-lb-pick-profit text-neu">—</span>'
      +  '</div>';
  }
  if (pick.ghost) {
    return '<div class="draft-lb-pick draft-lb-pick-ghost">'
      +    '<span class="draft-lb-pick-name text-neu">(cleared)</span>'
      +    '<span class="draft-lb-pick-profit text-neu">—</span>'
      +  '</div>';
  }
  var profitHtml = pick.profit_td == null
    ? '<span class="text-neu">—</span>'
    : '<span class="' + colorClass(pick.profit_td) + '">' + fmtSigned(pick.profit_td) + '</span>';
  var swappedAttr = (affected && affected[pick.imdb_id]) ? ' data-swapped="1"' : '';
  return '<div class="draft-lb-pick"' + swappedAttr + ' title="' + pick.movie_title.replace(/"/g, '&quot;') + '">'
    +    '<span class="draft-lb-pick-name">' + pick.movie_title + '</span>'
    +    '<span class="draft-lb-pick-profit">' + profitHtml + '</span>'
    +  '</div>';
}

export function buildLeaderboard(data, season, colorMap, mountEl) {
  if (!mountEl) return;

  var anySeasonalPicks = picksForDraft(data, season).some(isSeasonalOrAlt);
  if (!anySeasonalPicks) {
    mountEl.innerHTML = '<p class="draft-empty draft-leaderboard-empty">No picks yet — leaderboard will populate after the draft.</p>';
    return;
  }

  var rows = leaderboardForDraft(data, season);
  var affected = getAffectedImdbIds();
  var cards = rows.map(function(r, i) {
    var totalHtml = '<span class="' + colorClass(r.total) + '">' + fmt(r.total) + '</span>';
    var hasSwap = r.picks.some(function(p) { return p && affected[p.imdb_id]; });
    var changedAttr = hasSwap ? ' data-changed="1"' : '';
    return '<div class="draft-lb-card" data-owner="' + r.owner + '"' + changedAttr + '>'
      +    '<div class="draft-lb-head">'
      +      '<span class="draft-lb-owner">'
      +        '<span class="owner-dot" style="background:' + (colorMap[r.owner] || '#ccc') + '"></span>'
      +        r.owner
      +      '</span>'
      +      '<span class="draft-lb-rank">#' + (i + 1) + '</span>'
      +    '</div>'
      +    '<div class="draft-lb-total">' + totalHtml + '</div>'
      +    '<div class="draft-lb-picks">'
      +      pickRow(r.picks[0], affected)
      +      pickRow(r.picks[1], affected)
      +      pickRow(r.picks[2], affected)
      +    '</div>'
      +  '</div>';
  }).join('');

  mountEl.innerHTML = '<div class="draft-lb-grid">' + cards + '</div>';
}
