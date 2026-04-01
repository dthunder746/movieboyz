import { fmt, fmtPct, colorClass, formatShortDate, pickIcon } from './utils.js';

export function buildInfoCards(data, colorMap) {
  var el = document.getElementById('info-cards');
  if (!el) return;

  var today = new Date().toISOString().split('T')[0];

  function readCollapsedCookie() {
    var match = document.cookie.match(/(?:^|;)\s*info_cards_collapsed=([^;]*)/);
    if (!match) return null;
    try { return JSON.parse(decodeURIComponent(match[1])); } catch(e) { return null; }
  }

  function writeCollapsedCookie(state) {
    var exp = new Date();
    exp.setFullYear(exp.getFullYear() + 1);
    document.cookie = 'info_cards_collapsed=' + encodeURIComponent(JSON.stringify(state))
      + '; expires=' + exp.toUTCString() + '; path=/; SameSite=Lax';
  }

  var cookieState = readCollapsedCookie() || {};
  var defaultOpen = window.innerWidth >= 550;

  function isOpen(id) {
    if (cookieState[id] !== undefined) return cookieState[id];
    return defaultOpen;
  }

  function ownerDot(owner) {
    if (!owner || owner === 'none') return '<span class="text-neu">—</span>';
    return '<span class="owner-dot" style="background:' + (colorMap[owner] || '#ccc') + '"></span>' + owner;
  }

  // For unowned movies, fall back to the season icon derived from release date.
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

  var cards = [
    { id: 'upcoming',   title: 'Upcoming Releases',  data: upcoming   },
    { id: 'profitable', title: '10 Most Profitable',  data: profitable },
    { id: 'worst',      title: '10 Least Profitable', data: worst      }
  ];

  var html = '<div class="info-cards-grid">';

  cards.forEach(function(c) {
    var open = isOpen(c.id);
    var tableHtml = '';

    if (!c.data.length) {
      tableHtml = '<p class="info-card-empty">No data available</p>';
    } else {
      var rows = c.data.map(function(m) {
        var col3 = '';
        if (c.id === 'upcoming') {
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

      tableHtml = '<div class="info-card-table-wrap">'
        + '<table class="scorecard-movie-table">'
        + '<tbody>' + rows + '</tbody>'
        + '</table>'
        + '</div>';
    }

    html += '<div class="info-card' + (open ? ' is-open' : '') + '" data-card-id="' + c.id + '">'
      + '<div class="info-card-header" data-card-id="' + c.id + '">'
      + '<span class="scorecard-toggle-icon"></span>'
      + '<span class="info-card-title">' + c.title + '</span>'
      + '</div>'
      + '<div class="info-card-body">' + tableHtml + '</div>'
      + '</div>';
  });

  html += '</div>';
  el.innerHTML = html;

  // ── Collapse toggle ───────────────────────────────────────────────────────
  el.addEventListener('click', function(e) {
    var header = e.target.closest('.info-card-header');
    if (!header) return;
    var card = header.closest('.info-card');
    var id = header.dataset.cardId;
    card.classList.toggle('is-open');
    var state = readCollapsedCookie() || {};
    state[id] = card.classList.contains('is-open');
    writeCollapsedCookie(state);
  });
}
