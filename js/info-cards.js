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
    return m.days_running == null && m.release_date > today;
  }).sort(function(a, b) { return a.release_date < b.release_date ? -1 : 1; });

  // Full sorted arrays — row count for these is calculated dynamically from container height.
  var profitable = movies.filter(function(m) { return m.profit_td != null; })
    .sort(function(a, b) { return b.profit_td - a.profit_td; });

  var worst = movies.filter(function(m) { return m.profit_td != null; })
    .sort(function(a, b) { return a.profit_td - b.profit_td; });

  function buildPaneContent(tabId, tabData) {
    if (!tabData.length) {
      return '<p class="info-tab-empty">No data available</p>';
    }

    var col3Header = tabId === 'upcoming' ? 'Date' : 'Profit (ROI)';
    var thead = '<thead><tr>'
      + '<th>Movie</th>'
      + '<th>Owner</th>'
      + '<th>' + col3Header + '</th>'
      + '</tr></thead>';

    var rows = tabData.map(function(m) {
      var col3 = '';
      if (tabId === 'upcoming') {
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
      + '<table class="scorecard-movie-table">'
      + thead
      + '<tbody>' + rows + '</tbody>'
      + '</table>'
      + '</div>';
  }

  var tabs = [
    { id: 'upcoming',   label: 'Upcoming Releases', data: upcoming   },
    { id: 'profitable', label: 'Most Profitable',    data: profitable },
    { id: 'worst',      label: 'Least Profitable',   data: worst      }
  ];

  var navHtml = tabs.map(function(t) {
    return '<button class="info-tab-btn' + (t.id === activeTab ? ' active' : '') + '" data-tab="' + t.id + '">'
      + t.label + '</button>';
  }).join('');

  var panesHtml = tabs.map(function(t) {
    return '<div class="info-tab-pane' + (t.id === activeTab ? ' active' : '') + '" data-tab="' + t.id + '">'
      + buildPaneContent(t.id, t.data)
      + '</div>';
  }).join('');

  el.innerHTML = '<div class="info-tab-card">'
    + '<div class="info-tab-nav">' + navHtml + '</div>'
    + '<div class="info-tab-body">' + panesHtml + '</div>'
    + '</div>';

  // ── Dynamic row count for profitable / worst ─────────────────────────────
  // Row height and header height are measured from the live DOM on first call;
  // after that the cached values are reused across ResizeObserver callbacks.
  var ROW_PX = 0;
  var HEADER_PX = 0;

  function updateDynamicPanes() {
    var body = el.querySelector('.info-tab-body');
    if (!body) return;
    var bodyH = body.clientHeight;
    if (!bodyH) return;

    // Measure once from a live thead/tbody row (any active pane will do).
    if (!ROW_PX) {
      var sampleRow = body.querySelector('tbody tr');
      ROW_PX = sampleRow ? sampleRow.offsetHeight : 28;
    }
    if (!HEADER_PX) {
      var sampleHead = body.querySelector('thead');
      HEADER_PX = sampleHead ? sampleHead.offsetHeight : 24;
    }

    var BOTTOM_PAD = 6; // .info-card-table-wrap padding-bottom
    var count = Math.max(1, Math.floor((bodyH - HEADER_PX - BOTTOM_PAD) / ROW_PX));
    if (window.innerWidth < 960) count = Math.min(10, count);

    ['profitable', 'worst'].forEach(function(id) {
      var pane = el.querySelector('.info-tab-pane[data-tab="' + id + '"]');
      if (!pane) return;
      var arr = id === 'profitable' ? profitable : worst;
      var c = count;
      pane.innerHTML = buildPaneContent(id, arr.slice(0, c));
      // Trim rows until content fits — multi-line titles can make rows taller than ROW_PX.
      if (pane.classList.contains('active')) {
        while (c > 1 && pane.scrollHeight > pane.clientHeight) {
          c--;
          pane.innerHTML = buildPaneContent(id, arr.slice(0, c));
        }
      }
    });
  }

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(updateDynamicPanes).observe(el.querySelector('.info-tab-body'));
  }

  // ── Height sync: drive #info-cards height from the strip on desktop ───────
  // align-items: stretch is NOT used — it would let #info-cards content grow
  // the container height, preventing the strip from shrinking. Instead we
  // observe the strip and set an explicit height on #info-cards so the flex
  // chain inside (.info-tab-card / .info-tab-body) has a definite height to
  // work against.
  var strip = document.getElementById('weekend-strip');

  function syncHeight() {
    if (window.innerWidth < 960 || !strip) {
      el.style.height = '';
      return;
    }
    el.style.height = strip.offsetHeight + 'px';
  }

  if (typeof ResizeObserver !== 'undefined' && strip) {
    new ResizeObserver(syncHeight).observe(strip);
  }
  syncHeight();
  window.addEventListener('resize', syncHeight);

  updateDynamicPanes();

  // ── Tab click ────────────────────────────────────────────────────────────
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
    // Recalculate if switching to a profit tab (pane was hidden during last resize).
    if (id === 'profitable' || id === 'worst') updateDynamicPanes();
  });
}
