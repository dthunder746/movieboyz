import { fmt, fmtPct, colorClass, formatShortDate, pickIcon } from './utils.js';

export function buildInfoCards(data, colorMap) {
  var el = document.getElementById('info-cards');
  if (!el) return;

  var today = new Date().toISOString().split('T')[0];

  var COOKIE = 'info_active_tab';

  function readTabCookie() {
    var match = document.cookie.match(/(?:^|;)\s*info_active_tab=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function writeTabCookie(id) {
    var exp = new Date();
    exp.setFullYear(exp.getFullYear() + 1);
    document.cookie = COOKIE + '=' + encodeURIComponent(id)
      + '; expires=' + exp.toUTCString() + '; path=/; SameSite=Lax';
  }

  var activeTab = readTabCookie() || 'upcoming';

  function ownerDot(owner) {
    if (!owner || owner === 'none') return '<span class="text-neu">—</span>';
    return '<span class="owner-dot" style="background:' + (colorMap[owner] || '#ccc') + '"></span>' + owner;
  }

  function movieIcon(m) {
    var type = m.pick_type || (m.release_date ? 'seasonal' : null);
    return pickIcon(type, m.release_date);
  }

  var movies = Object.values(data.movies);

  var upcoming = movies.filter(function(m) {
    return m.days_running == null && m.release_date > today && m.owner !== 'none';
  }).sort(function(a, b) { return a.release_date < b.release_date ? -1 : 1; });

  var profitable = movies.filter(function(m) { return m.profit_td != null; })
    .sort(function(a, b) { return b.profit_td - a.profit_td; }).slice(0, 10);

  var worst = movies.filter(function(m) { return m.profit_td != null; })
    .sort(function(a, b) { return a.profit_td - b.profit_td; }).slice(0, 10);

  var tabs = [
    { id: 'upcoming',   label: 'Upcoming',        data: upcoming   },
    { id: 'profitable', label: 'Most Profitable',  data: profitable },
    { id: 'worst',      label: 'Least Profitable', data: worst      }
  ];

  function buildPane(tab) {
    if (!tab.data.length) {
      return '<p class="info-tab-empty">No data available</p>';
    }
    var rows = tab.data.map(function(m) {
      var col3 = '';
      if (tab.id === 'upcoming') {
        col3 = formatShortDate(m.release_date);
      } else {
        var roi = m.breakeven ? (m.profit_td / m.breakeven * 100) : null;
        col3 = '<span class="' + colorClass(m.profit_td) + '">' + fmt(m.profit_td) + '</span>'
          + ' <span class="text-neu" style="font-size:0.9em">(' + (roi !== null ? fmtPct(roi) : '—') + ')</span>';
      }
      return '<tr>'
        + '<td>' + movieIcon(m) + m.movie_title + '</td>'
        + '<td>' + ownerDot(m.owner) + '</td>'
        + '<td>' + col3 + '</td>'
        + '</tr>';
    }).join('');
    return '<div class="info-card-table-wrap">'
      + '<table class="scorecard-movie-table"><tbody>' + rows + '</tbody></table>'
      + '</div>';
  }

  var navHtml = tabs.map(function(t) {
    return '<button class="info-tab-btn' + (t.id === activeTab ? ' active' : '') + '" data-tab="' + t.id + '">'
      + t.label + '</button>';
  }).join('');

  var panesHtml = tabs.map(function(t) {
    return '<div class="info-tab-pane' + (t.id === activeTab ? ' active' : '') + '" data-tab="' + t.id + '">'
      + buildPane(t)
      + '</div>';
  }).join('');

  el.innerHTML = '<div class="info-tab-card">'
    + '<div class="info-tab-nav">' + navHtml + '</div>'
    + '<div class="info-tab-body">' + panesHtml + '</div>'
    + '</div>';

  el.addEventListener('click', function(e) {
    var btn = e.target.closest('.info-tab-btn');
    if (!btn) return;
    var id = btn.dataset.tab;
    el.querySelectorAll('.info-tab-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.tab === id);
    });
    el.querySelectorAll('.info-tab-pane').forEach(function(p) {
      p.classList.toggle('active', p.dataset.tab === id);
    });
    writeTabCookie(id);
  });
}
