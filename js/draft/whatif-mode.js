import * as store from './whatif-store.js';

var pillEl = null;
var bannerEl = null;
var appEl = null;
var counterEl = null;
var undoBtn = null;
var resetBtn = null;
var exitBtn = null;
var helpBtn = null;

function renderBannerContent() {
  bannerEl.innerHTML = ''
    + '<div class="draft-whatif-banner-info">'
    +   '<span class="draft-whatif-banner-icon" aria-hidden="true">⚠</span>'
    +   '<span class="draft-whatif-banner-label">WHAT-IF MODE</span>'
    +   '<span class="draft-whatif-banner-counter" id="draft-whatif-counter"></span>'
    + '</div>'
    + '<div class="draft-whatif-banner-actions">'
    +   '<button id="draft-whatif-help" class="btn btn-sm btn-link" type="button" aria-label="Help">?</button>'
    +   '<button id="draft-whatif-undo" class="btn btn-sm btn-outline-secondary" type="button">Undo</button>'
    +   '<button id="draft-whatif-reset" class="btn btn-sm btn-outline-secondary" type="button">Reset</button>'
    +   '<button id="draft-whatif-exit" class="btn btn-sm btn-warning" type="button">Exit</button>'
    + '</div>';

  counterEl = document.getElementById('draft-whatif-counter');
  undoBtn = document.getElementById('draft-whatif-undo');
  resetBtn = document.getElementById('draft-whatif-reset');
  exitBtn = document.getElementById('draft-whatif-exit');
  helpBtn = document.getElementById('draft-whatif-help');

  undoBtn.addEventListener('click', function() { store.undo(); });
  resetBtn.addEventListener('click', function() { store.reset(); });
  exitBtn.addEventListener('click', function() { store.disable(); });
  helpBtn.addEventListener('click', function() {
    if (typeof window.__whatifReplayIntro === 'function') window.__whatifReplayIntro();
  });
}

function syncFromState() {
  var s = store.getState();
  pillEl.setAttribute('aria-pressed', s.enabled ? 'true' : 'false');
  bannerEl.hidden = !s.enabled;
  appEl.classList.toggle('is-whatif', s.enabled);

  if (s.enabled) {
    var n = s.swaps.length;
    if (counterEl) {
      counterEl.textContent = n === 0 ? '' : (n === 1 ? '1 swap active' : n + ' swaps active');
    }
    if (undoBtn) undoBtn.disabled = (n === 0);
    if (resetBtn) resetBtn.disabled = (n === 0);
    maybeRunIntro();
  }
}

export function mountWhatifMode() {
  pillEl = document.getElementById('draft-whatif-pill');
  bannerEl = document.getElementById('draft-whatif-banner');
  appEl = document.getElementById('draft-app');
  if (!pillEl || !bannerEl || !appEl) return;

  renderBannerContent();

  pillEl.addEventListener('click', function() {
    var s = store.getState();
    if (s.enabled) store.disable(); else store.enable();
  });

  store.subscribe(syncFromState);
  syncFromState();
}

var selected = null;
var currentSeasonRef = function() { return null; };

function clearSelectionUI() {
  document.querySelectorAll('.draft-row-selected').forEach(function(el) {
    el.classList.remove('draft-row-selected');
  });
  document.querySelectorAll('.draft-row-candidate').forEach(function(el) {
    el.classList.remove('draft-row-candidate');
  });
}

function paintCandidates() {
  if (!selected) return;
  var counterpartKind = selected.kind === 'slot' ? 'candidate' : 'slot';
  if (counterpartKind === 'candidate') {
    document.querySelectorAll('#draft-unpicked tbody tr[data-kind="candidate"]').forEach(function(tr) {
      tr.classList.add('draft-row-candidate');
    });
  } else {
    document.querySelectorAll('#draft-picks tbody tr.draft-row-swappable').forEach(function(tr) {
      if (tr.dataset.imdb !== selected.imdbId) tr.classList.add('draft-row-candidate');
    });
  }
  var selEl = document.querySelector('tr[data-imdb="' + selected.imdbId + '"]');
  if (selEl) selEl.classList.add('draft-row-selected');
}

function setSelection(kind, imdbId) {
  selected = { kind: kind, imdbId: imdbId };
  clearSelectionUI();
  paintCandidates();
}

function clearSelection() {
  selected = null;
  clearSelectionUI();
}

function rowFromEvent(e) {
  var tr = e.target.closest('tr[data-imdb]');
  if (!tr) return null;
  var inPicks = !!tr.closest('#draft-picks');
  var inUnpicked = !!tr.closest('#draft-unpicked');
  if (!inPicks && !inUnpicked) return null;
  return {
    el: tr,
    imdbId: tr.dataset.imdb,
    kind: inPicks ? 'slot' : 'candidate',
    owner: tr.dataset.owner || '',
    pickType: tr.dataset.pickType || ''
  };
}

function isLocked(row) {
  return row.kind === 'slot' && (row.pickType === 'hit' || row.pickType === 'bomb');
}

function fireSwap(slotRow, candidateRow) {
  store.pushSwap(slotRow.imdbId, candidateRow.imdbId, currentSeasonRef());
  selected = null;
}

function onAppClick(e) {
  if (!store.getState().enabled) return;
  var row = rowFromEvent(e);
  if (!row) {
    if (!e.target.closest('.draft-whatif-banner') && !e.target.closest('.draft-whatif-pill')) {
      clearSelection();
    }
    return;
  }
  if (isLocked(row)) return;

  if (!selected) {
    setSelection(row.kind, row.imdbId);
    return;
  }
  if (selected.imdbId === row.imdbId) {
    clearSelection();
    return;
  }
  if (selected.kind === 'slot' && row.kind === 'slot') {
    var selOwner = (document.querySelector('tr[data-imdb="' + selected.imdbId + '"]') || {}).dataset || {};
    if (!selOwner.owner || selOwner.owner === row.owner) {
      setSelection(row.kind, row.imdbId);
      return;
    }
    var slotA = { imdbId: selected.imdbId };
    var slotB = { imdbId: row.imdbId };
    fireSwap(slotA, slotB);
    return;
  }
  if (selected.kind === 'candidate' && row.kind === 'candidate') {
    setSelection(row.kind, row.imdbId);
    return;
  }
  var slot = selected.kind === 'slot' ? { imdbId: selected.imdbId } : { imdbId: row.imdbId };
  var cand = selected.kind === 'candidate' ? { imdbId: selected.imdbId } : { imdbId: row.imdbId };
  fireSwap(slot, cand);
}

function onKeydown(e) {
  if (!store.getState().enabled) return;
  if (e.key === 'Escape') clearSelection();
}

export function attachSelectionHandlers(getCurrentSeason) {
  currentSeasonRef = getCurrentSeason;
  document.addEventListener('click', onAppClick);
  document.addEventListener('keydown', onKeydown);
}

export function repaintSelectionAfterRender() {
  clearSelectionUI();
  paintCandidates();
}

export function clearSelectionOnTabChange() {
  clearSelection();
}

var lockedTooltipInstances = [];

function clearLockedTooltips() {
  lockedTooltipInstances.forEach(function(t) { try { t.dispose(); } catch (e) {} });
  lockedTooltipInstances = [];
}

export function refreshLockedTooltips() {
  clearLockedTooltips();
  if (!window.bootstrap || !window.bootstrap.Tooltip) return;
  document.querySelectorAll('#draft-picks tr.draft-row-locked').forEach(function(tr) {
    var pt = tr.dataset.pickType;
    var title = pt === 'hit' ? 'Hit picks are locked' : (pt === 'bomb' ? 'Bomb picks are locked' : 'Locked');
    tr.setAttribute('data-bs-toggle', 'tooltip');
    tr.setAttribute('title', title);
    var t = new window.bootstrap.Tooltip(tr, { trigger: 'hover', placement: 'top' });
    lockedTooltipInstances.push(t);
  });
}

var INTRO_KEY = 'mb_whatif_seen_intro';

function reducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function scrollAnchorIntoView(el) {
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
}

function showStep(anchor, title, body, onDismiss) {
  if (!anchor || !window.bootstrap || !window.bootstrap.Popover) { onDismiss(); return; }
  scrollAnchorIntoView(anchor);
  setTimeout(function() {
    var content = '<div class="draft-whatif-popover-body">' + body
      + '<div class="text-end mt-2"><button class="btn btn-sm btn-warning draft-whatif-gotit" type="button">Got it</button></div></div>';
    var pop = new window.bootstrap.Popover(anchor, {
      title: title,
      content: content,
      html: true,
      trigger: 'manual',
      placement: 'auto',
      sanitize: false
    });
    pop.show();
    function onClick(e) {
      if (e.target.classList.contains('draft-whatif-gotit')) {
        pop.dispose();
        document.removeEventListener('click', onClick, true);
        onDismiss();
      } else if (!anchor.contains(e.target) && !e.target.closest('.popover')) {
        pop.dispose();
        document.removeEventListener('click', onClick, true);
        onDismiss();
      }
    }
    setTimeout(function() { document.addEventListener('click', onClick, true); }, 50);
  }, reducedMotion() ? 0 : 350);
}

function runIntroSequence(onComplete) {
  var step1Anchor = document.getElementById('draft-whatif-banner');
  var step2Anchor = document.querySelector('#draft-picks tr.draft-row-swappable');
  var step3Anchor = document.querySelector('#draft-unpicked .draft-unpicked-released');
  showStep(step1Anchor,
    'What-if mode',
    "You're in what-if mode. Numbers and standings will update as you swap picks. Toggle off any time.",
    function() {
      showStep(step2Anchor,
        'Start a swap',
        'Click any drafted pick (seasonal or alt) or an unpicked movie to start a swap.',
        function() {
          showStep(step3Anchor,
            'Pick a target',
            'Then click a target. Both Released and Unreleased movies are valid swap targets.',
            onComplete);
        });
    });
}

function maybeRunIntro() {
  var seen = false;
  try { seen = localStorage.getItem(INTRO_KEY) === '1'; } catch (e) {}
  if (seen) return;
  runIntroSequence(function() {
    try { localStorage.setItem(INTRO_KEY, '1'); } catch (e) {}
  });
}

window.__whatifReplayIntro = function() { runIntroSequence(function() {}); };
