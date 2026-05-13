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
