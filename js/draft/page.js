import { buildPicksTable } from './picks-table.js';
import { buildLeaderboard } from './leaderboard.js';
import { buildHighlights } from './highlights.js';
import { buildUnpickedCards } from './unpicked-cards.js';
import { seasonFromIsoDate, picksForDraft, leaderboardForDraft } from './season-helpers.js';
import {
  mountWhatifMode,
  attachSelectionHandlers,
  repaintSelectionAfterRender,
  clearSelectionOnTabChange,
  refreshLockedTooltips
} from './whatif-mode.js';
import * as whatifStore from './whatif-store.js';
import {
  snapshotLeaderboardPositions,
  playLeaderboardFlip,
  tweenNumber,
  flashCellDirection,
  amberOutlineRows,
  fadeResetEnvelope
} from './whatif-animate.js';
import { fmt, fmtPct, colorClass } from '../utils.js';

var SEASON_ORDER = ['WINTER', 'SUMMER', 'FALL'];
var SEASON_LABEL = { WINTER: 'Winter', SUMMER: 'Summer', FALL: 'Fall' };
var COOKIE_NAME = 'draft_active_season';

function readCookie() {
  var match = document.cookie.match(/(?:^|;)\s*draft_active_season=([^;]*)/);
  if (!match) return null;
  var v = decodeURIComponent(match[1]);
  return SEASON_ORDER.indexOf(v) !== -1 ? v : null;
}

function writeCookie(season) {
  var exp = new Date();
  exp.setFullYear(exp.getFullYear() + 1);
  document.cookie = COOKIE_NAME + '=' + encodeURIComponent(season)
    + '; expires=' + exp.toUTCString() + '; path=/; SameSite=Lax';
}

export function buildDraftPage(data, colorMap) {
  var root = document.getElementById('draft-app');
  if (!root) return;

  var initial = readCookie() || seasonFromIsoDate(data.latest_date);
  if (SEASON_ORDER.indexOf(initial) === -1) initial = 'WINTER';

  root.innerHTML = ''
    + '<div class="draft-tab-nav" role="tablist">'
    +   '<div class="draft-tab-nav-seasons">'
    +     SEASON_ORDER.map(function(s) {
            return '<button class="draft-tab-btn' + (s === initial ? ' active' : '') + '" data-season="' + s + '">' + SEASON_LABEL[s] + '</button>';
          }).join('')
    +   '</div>'
    +   '<div class="draft-tab-nav-actions">'
    +     '<button class="draft-whatif-pill" id="draft-whatif-pill" type="button" aria-pressed="false">'
    +       '<span class="draft-whatif-pill-icon" aria-hidden="true">🔁</span>'
    +       '<span class="draft-whatif-pill-label">What-if</span>'
    +     '</button>'
    +   '</div>'
    + '</div>'
    + '<div id="draft-whatif-banner" class="draft-whatif-banner" hidden></div>'
    + '<div id="draft-leaderboard"></div>'
    + '<div class="draft-body">'
    +   '<section class="draft-main">'
    +     '<div id="draft-picks"></div>'
    +     '<div id="draft-highlights"></div>'
    +   '</section>'
    +   '<aside class="draft-sidebar">'
    +     '<div id="draft-unpicked"></div>'
    +   '</aside>'
    + '</div>';

  var picksEl       = document.getElementById('draft-picks');
  var leaderboardEl = document.getElementById('draft-leaderboard');
  var highlightsEl  = document.getElementById('draft-highlights');
  var unpickedEl    = document.getElementById('draft-unpicked');

  var currentSeason = initial;
  var currentView = data;

  function render(season) {
    currentSeason = season;
    currentView = whatifStore.applyToData(data);
    var picks = picksForDraft(currentView, season);
    if (!picks.length) {
      leaderboardEl.innerHTML = '';
      highlightsEl.innerHTML  = '';
      unpickedEl.innerHTML    = '';
      picksEl.innerHTML = '<div class="draft-empty-page"><p>No picks yet for the '
        + SEASON_LABEL[season]
        + ' draft — check back later.</p></div>';
      return;
    }
    buildPicksTable(currentView, season, colorMap, picksEl);
    buildLeaderboard(currentView, season, colorMap, leaderboardEl);
    buildHighlights(currentView, season, colorMap, highlightsEl);
    buildUnpickedCards(currentView, season, colorMap, unpickedEl);
    repaintSelectionAfterRender();
    refreshLockedTooltips();
  }

  function snapshotFromView(view, season) {
    var snap = { totals: {}, profits: {}, rois: {} };
    leaderboardForDraft(view, season).forEach(function(r) {
      snap.totals[r.owner] = r.total;
    });
    picksForDraft(view, season).forEach(function(m) {
      snap.profits[m.imdb_id] = m.profit_td;
      if (m.profit_td != null && m.breakeven) {
        snap.rois[m.imdb_id] = (m.profit_td / m.breakeven) * 100;
      } else {
        snap.rois[m.imdb_id] = null;
      }
    });
    return snap;
  }

  root.addEventListener('click', function(e) {
    var btn = e.target.closest('.draft-tab-btn');
    if (!btn) return;
    var s = btn.dataset.season;
    if (!s || SEASON_ORDER.indexOf(s) === -1) return;
    root.querySelectorAll('.draft-tab-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.season === s);
    });
    writeCookie(s);
    render(s);
    clearSelectionOnTabChange();
  });

  var lastSwapCount = whatifStore.getState().swaps.length;
  whatifStore.subscribe(function() {
    var s = whatifStore.getState();
    if (!s.enabled) { render(currentSeason); lastSwapCount = 0; return; }
    lastSwapCount = s.swaps.length;
    var op = whatifStore.getLastOp();
    if (op === 'reset') {
      fadeResetEnvelope(function() { render(currentSeason); }, function() {});
      return;
    }
    var prevSnap = snapshotFromView(currentView, currentSeason);
    var prevPos = snapshotLeaderboardPositions();
    var prevRows = collectCurrentRowImdbs();
    render(currentSeason);
    var newSnap = snapshotFromView(currentView, currentSeason);
    playLeaderboardFlip(prevPos);
    runNumberTweens(prevSnap, newSnap);
    flashDirectionalCells(prevSnap, newSnap);
    flashNewRows(prevRows);
  });

  function collectCurrentRowImdbs() {
    var ids = [];
    document.querySelectorAll('#draft-picks tbody tr[data-imdb], #draft-unpicked tbody tr[data-imdb]').forEach(function(tr) {
      ids.push(tr.dataset.imdb);
    });
    return ids;
  }

  function runNumberTweens(prev, next) {
    document.querySelectorAll('#draft-leaderboard .draft-lb-card').forEach(function(card) {
      var owner = card.dataset.owner;
      var totalEl = card.querySelector('.draft-lb-total');
      if (!totalEl || !owner) return;
      var span = totalEl.querySelector('span') || totalEl;
      var from = prev.totals[owner];
      var to = next.totals[owner];
      if (from == null || to == null) return;
      tweenNumber(span, from, to, 250, fmt, colorClass);
    });
    document.querySelectorAll('#draft-picks tbody tr').forEach(function(tr) {
      var imdb = tr.dataset.imdb;
      if (!imdb) return;
      var cells = tr.querySelectorAll('td');
      if (cells[4]) {
        var span = cells[4].querySelector('span') || cells[4];
        var from = prev.profits[imdb];
        var to = next.profits[imdb];
        if (from != null && to != null && from !== to) tweenNumber(span, from, to, 250, fmt, colorClass);
      }
      if (cells[5]) {
        var spanR = cells[5].querySelector('span') || cells[5];
        var fromR = prev.rois[imdb];
        var toR = next.rois[imdb];
        if (fromR != null && toR != null && fromR !== toR) tweenNumber(spanR, fromR, toR, 250, fmtPct, colorClass);
      }
    });
  }

  function flashDirectionalCells(prev, next) {
    document.querySelectorAll('#draft-picks tbody tr').forEach(function(tr) {
      var imdb = tr.dataset.imdb;
      if (!imdb) return;
      var cells = tr.querySelectorAll('td');
      if (cells[4]) flashCellDirection(cells[4], prev.profits[imdb], next.profits[imdb]);
    });
    document.querySelectorAll('#draft-leaderboard .draft-lb-card').forEach(function(card) {
      var owner = card.dataset.owner;
      if (!owner) return;
      var totalEl = card.querySelector('.draft-lb-total');
      flashCellDirection(totalEl, prev.totals[owner], next.totals[owner]);
    });
  }

  function flashNewRows(prevIds) {
    var newIds = [];
    document.querySelectorAll('#draft-picks tbody tr[data-imdb], #draft-unpicked tbody tr[data-imdb]').forEach(function(tr) {
      if (prevIds.indexOf(tr.dataset.imdb) === -1) newIds.push(tr.dataset.imdb);
    });
    amberOutlineRows(newIds);
  }

  render(initial);
  mountWhatifMode();
  attachSelectionHandlers(function() { return currentSeason; });
}
