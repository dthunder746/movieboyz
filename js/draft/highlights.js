import { fmt, fmtPct } from '../utils.js';
import { highlightsForDraft } from './season-helpers.js';

function fmtSigned(v) {
  if (v == null) return '—';
  if (v === 0) return fmt(0);
  return (v > 0 ? '+' : '-') + fmt(Math.abs(v));
}

function ownerChip(owner, colorMap) {
  return '<span class="owner-dot" style="background:' + (colorMap[owner] || '#ccc') + '"></span>' + owner;
}

function tile(tone, label, valueHtml, subHtml, tagline) {
  return '<div class="draft-hl-tile draft-hl-' + tone + '">'
    +    '<div class="draft-hl-label">' + label + '</div>'
    +    '<div class="draft-hl-value">' + valueHtml + '</div>'
    +    '<div class="draft-hl-sub">' + subHtml + '</div>'
    +    '<div class="draft-hl-tagline">' + tagline + '</div>'
    +  '</div>';
}

export function buildHighlights(data, season, colorMap, mountEl) {
  if (!mountEl) return;

  var h = highlightsForDraft(data, season);
  var html = '';

  if (h.steal) {
    html += tile('pos', 'Steal of the Draft',
      h.steal.movie,
      ownerChip(h.steal.owner, colorMap) + ' &middot; Pick #' + h.steal.draftPick + ' &rarr; Profit rank #' + h.steal.profitRank,
      'Lowest pick with the highest profit');
  }
  if (h.bust) {
    html += tile('neg', 'Bust of the Draft',
      h.bust.movie,
      ownerChip(h.bust.owner, colorMap) + ' &middot; Pick #' + h.bust.draftPick + ' &rarr; Profit rank #' + h.bust.profitRank,
      'Highest pick with the lowest profit');
  }
  if (h.roi) {
    html += tile('pos', 'Highest ROI',
      h.roi.movie,
      ownerChip(h.roi.owner, colorMap) + ' &middot; ' + fmtPct(h.roi.ratio * 100),
      'Best profit-to-budget multiple');
  }
  if (h.mostConsistent) {
    html += tile('pos', 'Mr. Consistent',
      ownerChip(h.mostConsistent.owner, colorMap),
      fmt(h.mostConsistent.range) + ' range across picks',
      'Smallest gap between best and worst pick');
  }
  if (h.biggestWinner) {
    html += tile('pos', 'Biggest Winner',
      h.biggestWinner.movie,
      ownerChip(h.biggestWinner.owner, colorMap) + ' &middot; ' + fmtSigned(h.biggestWinner.profit),
      'Highest single-pick profit');
  }
  if (h.biggestLoser) {
    html += tile('neg', 'Biggest Loser',
      h.biggestLoser.movie,
      ownerChip(h.biggestLoser.owner, colorMap) + ' &middot; ' + fmtSigned(h.biggestLoser.profit),
      'Lowest single-pick profit');
  }

  if (!html) {
    mountEl.innerHTML = '';
    return;
  }
  mountEl.innerHTML = '<div class="draft-hl-strip">' + html + '</div>';
}
