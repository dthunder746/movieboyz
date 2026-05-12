import { fmtTimestamp } from './utils.js';
import { buildColorMap } from './palettes.js';
import { buildDraftPage } from './draft/page.js';
import { applyOverrides } from './overrides.js';

var KNOWN_OWNERS = ['Chris', 'Connie', 'Emerson', 'Marcus', 'Matt'];
var earlyColorMap = buildColorMap(KNOWN_OWNERS);

function setFavicon(owner, color) {
  var canvas = document.createElement('canvas');
  canvas.width = 32; canvas.height = 32;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(16, 16, 14, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(owner.charAt(0).toUpperCase(), 16, 17);
  var link = document.querySelector('link[rel="icon"]') || document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = canvas.toDataURL('image/png');
  if (!link.parentNode) document.head.appendChild(link);
}

var cachedLeader = localStorage.getItem('mbLeader') || 'Emerson';
if (earlyColorMap[cachedLeader]) setFavicon(cachedLeader, earlyColorMap[cachedLeader]);

var themeSwitch = document.getElementById('themeSwitch');
var saved = localStorage.getItem('mbTheme') || 'dark';
if (themeSwitch) themeSwitch.checked = (saved === 'light');

if (themeSwitch) {
  themeSwitch.addEventListener('change', function() {
    var theme = themeSwitch.checked ? 'light' : 'dark';
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('mbTheme', theme);
  });
}

function init(data) {
  var owners   = Object.keys(data.owners || {}).sort();
  var colorMap = buildColorMap(owners);

  var leader = null;
  owners.forEach(function(o) {
    var totals = data.owners[o] && data.owners[o].total;
    var t = (totals && totals[data.latest_profit_date]) || 0;
    if (leader === null || t > leader.total) leader = { owner: o, total: t };
  });
  if (leader && colorMap[leader.owner]) {
    if (leader.owner !== cachedLeader) setFavicon(leader.owner, colorMap[leader.owner]);
    localStorage.setItem('mbLeader', leader.owner);
  }

  if (data.fetched_at) {
    var elData = document.getElementById('data-updated');
    if (elData) elData.textContent = 'data.json updated ' + fmtTimestamp(data.fetched_at);
  }

  fetch('https://api.github.com/repos/dthunder746/movieboyz-site/commits?path=2026.html&per_page=1')
    .then(function(r) { return r.json(); })
    .then(function(commits) {
      if (commits && commits[0] && commits[0].commit) {
        var dateStr = commits[0].commit.committer.date;
        var elSite = document.getElementById('site-updated');
        if (elSite) elSite.textContent = '2026.html updated ' + fmtTimestamp(new Date(dateStr));
      }
    })
    .catch(function() {});

  buildDraftPage(data, colorMap);
}

var DATA_URL = (import.meta.env.VITE_DATA_URL || 'https://raw.githubusercontent.com/dthunder746/movieboyz-site/data/data.json') + '?t=' + Date.now();
var OVERRIDES_URL = '/overrides.json?t=' + Date.now();

Promise.all([
  fetch(DATA_URL).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }),
  fetch(OVERRIDES_URL).then(function(r) { return r.ok ? r.json() : {}; }).catch(function() { return {}; })
])
  .then(function(results) {
    applyOverrides(results[0], results[1]);
    init(results[0]);
  })
  .catch(function(err) {
    document.body.innerHTML += '<div class="alert alert-danger m-3">Failed to load data.json: ' + err.message + '</div>';
  });
