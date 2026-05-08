import { buildPicksTable } from './picks-table.js';
import { buildLeaderboard } from './leaderboard.js';
import { buildHighlights } from './highlights.js';
import { buildUnpickedCard } from './unpicked-card.js';
import { seasonFromIsoDate } from './season-helpers.js';

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
    +   SEASON_ORDER.map(function(s) {
          return '<button class="draft-tab-btn' + (s === initial ? ' active' : '') + '" data-season="' + s + '">' + SEASON_LABEL[s] + '</button>';
        }).join('')
    + '</div>'
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

  function render(season) {
    buildPicksTable(data, season, colorMap, picksEl);
    buildLeaderboard(data, season, colorMap, leaderboardEl);
    buildHighlights(data, season, colorMap, highlightsEl);
    buildUnpickedCard(data, season, colorMap, unpickedEl);
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
  });

  render(initial);
}
