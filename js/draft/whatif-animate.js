function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function snapshotLeaderboardPositions() {
  var snap = {};
  document.querySelectorAll('#draft-leaderboard .draft-lb-card').forEach(function(card) {
    var owner = card.dataset.owner;
    if (!owner) return;
    var rect = card.getBoundingClientRect();
    snap[owner] = { top: rect.top, left: rect.left };
  });
  return snap;
}

export function playLeaderboardFlip(prevPositions) {
  if (prefersReducedMotion()) return;
  if (!prevPositions) return;
  document.querySelectorAll('#draft-leaderboard .draft-lb-card').forEach(function(card) {
    var owner = card.dataset.owner;
    var prev = prevPositions[owner];
    if (!prev) return;
    var rect = card.getBoundingClientRect();
    var dx = prev.left - rect.left;
    var dy = prev.top - rect.top;
    if (dx === 0 && dy === 0) return;
    card.style.transition = 'none';
    card.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        card.style.transition = 'transform 250ms ease-out';
        card.style.transform = 'translate(0, 0)';
        setTimeout(function() {
          card.style.transition = '';
          card.style.transform = '';
        }, 280);
      });
    });
  });
}

function parseDisplayNumber(text) {
  if (!text) return null;
  var t = text.replace(/[,\$%\s]/g, '').replace(/—/g, '');
  if (!t) return null;
  var n = parseFloat(t);
  return isNaN(n) ? null : n;
}

export function snapshotNumbers() {
  var snap = {};
  document.querySelectorAll('#draft-leaderboard .draft-lb-card').forEach(function(card) {
    var owner = card.dataset.owner;
    var totalEl = card.querySelector('.draft-lb-total');
    if (owner && totalEl) {
      snap['lb:' + owner] = parseDisplayNumber(totalEl.textContent);
    }
  });
  document.querySelectorAll('#draft-picks tbody tr').forEach(function(tr) {
    var imdb = tr.dataset.imdb;
    if (!imdb) return;
    var cells = tr.querySelectorAll('td');
    var profitEl = cells[4];
    var roiEl = cells[5];
    if (profitEl) snap['pick:profit:' + imdb] = parseDisplayNumber(profitEl.textContent);
    if (roiEl) snap['pick:roi:' + imdb] = parseDisplayNumber(roiEl.textContent);
  });
  return snap;
}

function applyColor(el, cls) {
  if (!el) return;
  el.classList.remove('text-pos', 'text-neg', 'text-neu');
  if (cls) el.classList.add(cls);
}

export function tweenNumber(el, from, to, ms, formatter, colorFor) {
  if (!el) return;
  if (from == null || to == null || from === to) {
    if (colorFor) applyColor(el, colorFor(to == null ? from : to));
    return;
  }
  if (prefersReducedMotion()) {
    el.textContent = formatter(to);
    if (colorFor) applyColor(el, colorFor(to));
    return;
  }
  var start = performance.now();
  function frame(now) {
    var t = Math.min(1, (now - start) / ms);
    var eased = 1 - Math.pow(1 - t, 3);
    var value = from + (to - from) * eased;
    el.textContent = formatter(value);
    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      el.textContent = formatter(to);
      if (colorFor) applyColor(el, colorFor(to));
    }
  }
  requestAnimationFrame(frame);
}

export function flashCellDirection(el, fromVal, toVal) {
  if (!el || fromVal == null || toVal == null || fromVal === toVal) return;
  var cls = toVal > fromVal ? 'draft-flash-pos' : 'draft-flash-neg';
  el.classList.remove('draft-flash-pos', 'draft-flash-neg');
  void el.offsetWidth;
  el.classList.add(cls);
}

export function amberOutlineRows(imdbIds) {
  imdbIds.forEach(function(id) {
    document.querySelectorAll('tr[data-imdb="' + id + '"]').forEach(function(tr) {
      tr.classList.remove('draft-amber-outline');
      void tr.offsetWidth;
      tr.classList.add('draft-amber-outline');
    });
  });
}

export function fadeResetEnvelope(beforeRender, afterRender) {
  var targets = [
    document.getElementById('draft-leaderboard'),
    document.getElementById('draft-picks'),
    document.getElementById('draft-highlights'),
    document.getElementById('draft-unpicked')
  ].filter(Boolean);

  if (prefersReducedMotion()) {
    beforeRender();
    afterRender();
    return;
  }

  var primary = targets[0];
  if (!primary) {
    beforeRender();
    afterRender();
    return;
  }

  targets.forEach(function(el) {
    el.style.transition = 'opacity 180ms ease-out';
    el.style.opacity = '0';
  });

  var fired = false;
  function onFadeOut() {
    if (fired) return;
    fired = true;
    primary.removeEventListener('transitionend', onFadeOut);
    beforeRender();
    targets.forEach(function(el) {
      el.style.transition = 'opacity 220ms ease-out';
      el.style.opacity = '1';
    });
    afterRender();
    setTimeout(function() {
      targets.forEach(function(el) { el.style.transition = ''; el.style.opacity = ''; });
    }, 240);
  }
  primary.addEventListener('transitionend', onFadeOut);
  setTimeout(onFadeOut, 220);
}
