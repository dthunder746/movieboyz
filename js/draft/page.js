import { buildPicksTable } from './picks-table.js';
import { buildLeaderboard } from './leaderboard.js';
import { buildHighlights } from './highlights.js';
import { buildUnpickedCards } from './unpicked-cards.js';
import { seasonFromIsoDate, picksForDraft } from './season-helpers.js';
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
  snapshotNumbers,
  tweenNumber,
  flashCellDirection,
  amberOutlineRows,
  fadeResetEnvelope
} from './whatif-animate.js';
import { fmt, fmtPct } from '../utils.js';

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

  function render(season) {
    currentSeason = season;
    var view = whatifStore.applyToData(data);
    var picks = picksForDraft(view, season);
    if (!picks.length) {
      leaderboardEl.innerHTML = '';
      highlightsEl.innerHTML  = '';
      unpickedEl.innerHTML    = '';
      picksEl.innerHTML = '<div class="draft-empty-page"><p>No picks yet for the '
        + SEASON_LABEL[season]
        + ' draft — check back later.</p></div>';
      return;
    }
    buildPicksTable(view, season, colorMap, picksEl);
    buildLeaderboard(view, season, colorMap, leaderboardEl);
    buildHighlights(view, season, colorMap, highlightsEl);
    buildUnpickedCards(view, season, colorMap, unpickedEl);
    repaintSelectionAfterRender();
    refreshLockedTooltips();
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
  var resetIntent = false;
  whatifStore.subscribe(function() {
    var s = whatifStore.getState();
    if (!s.enabled) { render(currentSeason); lastSwapCount = 0; return; }
    var delta = s.swaps.length - lastSwapCount;
    lastSwapCount = s.swaps.length;
    if (delta < -1 || resetIntent) {
      resetIntent = false;
      fadeResetEnvelope(function() { render(currentSeason); }, function() {});
      return;
    }
    var prevPos = snapshotLeaderboardPositions();
    var prevNums = snapshotNumbers();
    var prevRows = collectCurrentRowImdbs();
    render(currentSeason);
    playLeaderboardFlip(prevPos);
    runNumberTweens(prevNums);
    flashDirectionalCells(prevNums);
    flashNewRows(prevRows);
  });

  function collectCurrentRowImdbs() {
    var ids = [];
    document.querySelectorAll('#draft-picks tbody tr[data-imdb], #draft-unpicked tbody tr[data-imdb]').forEach(function(tr) {
      ids.push(tr.dataset.imdb);
    });
    return ids;
  }

  function runNumberTweens(prevNums) {
    document.querySelectorAll('#draft-leaderboard .draft-lb-card').forEach(function(card) {
      var owner = card.dataset.owner;
      var totalEl = card.querySelector('.draft-lb-total');
      if (!totalEl || !owner) return;
      var to = parseFloat(totalEl.textContent.replace(/[\$,]/g, '')) || 0;
      var from = prevNums['lb:' + owner];
      if (from == null) return;
      tweenNumber(totalEl, from, to, 250, fmt);
    });
    document.querySelectorAll('#draft-picks tbody tr').forEach(function(tr) {
      var imdb = tr.dataset.imdb;
      if (!imdb) return;
      var cells = tr.querySelectorAll('td');
      if (cells[4]) {
        var to = parseFloat(cells[4].textContent.replace(/[\$,]/g, '')) || 0;
        var from = prevNums['pick:profit:' + imdb];
        if (from != null && from !== to) tweenNumber(cells[4], from, to, 250, fmt);
      }
      if (cells[5]) {
        var toR = parseFloat(cells[5].textContent.replace(/[%,]/g, '')) || 0;
        var fromR = prevNums['pick:roi:' + imdb];
        if (fromR != null && fromR !== toR) tweenNumber(cells[5], fromR, toR, 250, fmtPct);
      }
    });
  }

  function flashDirectionalCells(prevNums) {
    document.querySelectorAll('#draft-picks tbody tr').forEach(function(tr) {
      var imdb = tr.dataset.imdb;
      if (!imdb) return;
      var cells = tr.querySelectorAll('td');
      if (cells[4]) {
        var to = parseFloat(cells[4].textContent.replace(/[\$,]/g, '')) || 0;
        flashCellDirection(cells[4], prevNums['pick:profit:' + imdb], to);
      }
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
