import * as store from './whatif-store.js';

var pillEl = null;
var bannerEl = null;
var appEl = null;
var counterEl = null;
var undoBtn = null;
var resetBtn = null;
var exitBtn = null;
var helpBtn = null;
var hideLockedBtn = null;
var dateInputEl = null;
var settingsBtn = null;
var settingsPanelEl = null;

function renderBannerContent() {
  bannerEl.innerHTML = ''
    + '<div class="draft-whatif-banner-info">'
    +   '<span class="draft-whatif-banner-label">WHAT-IF MODE</span>'
    +   '<span class="draft-whatif-banner-counter" id="draft-whatif-counter"></span>'
    + '</div>'
    + '<div class="draft-whatif-banner-actions">'
    +   '<button id="draft-whatif-settings" class="btn btn-sm btn-whatif-secondary draft-whatif-icon-btn" type="button" aria-label="What-if settings" aria-expanded="false" aria-controls="draft-whatif-settings-panel" title="Settings">'
    +     '<span aria-hidden="true">⚙</span>'
    +   '</button>'
    +   '<button id="draft-whatif-exit" class="btn btn-sm btn-whatif-exit" type="button">Exit</button>'
    + '</div>'
    + '<div id="draft-whatif-settings-panel" class="draft-whatif-settings-panel" role="menu" hidden>'
    +   '<label class="draft-whatif-settings-row draft-whatif-date-group" for="draft-whatif-date-input">'
    +     '<span class="draft-whatif-date-label">Draft date</span>'
    +     '<input type="date" id="draft-whatif-date-input" class="draft-whatif-date-input" />'
    +   '</label>'
    +   '<div class="draft-whatif-settings-divider" role="separator"></div>'
    +   '<button id="draft-whatif-undo" class="draft-whatif-settings-item" type="button">'
    +     '<span class="draft-whatif-settings-icon" aria-hidden="true">↶</span>'
    +     '<span>Undo last swap</span>'
    +   '</button>'
    +   '<button id="draft-whatif-reset" class="draft-whatif-settings-item" type="button">'
    +     '<span class="draft-whatif-settings-icon" aria-hidden="true">↻</span>'
    +     '<span>Reset all swaps</span>'
    +   '</button>'
    +   '<button id="draft-whatif-hide-locked" class="draft-whatif-settings-item" type="button" aria-pressed="false">'
    +     '<span class="draft-whatif-settings-icon" aria-hidden="true">👁</span>'
    +     '<span class="draft-whatif-hide-locked-label">Hide locked picks</span>'
    +   '</button>'
    +   '<div class="draft-whatif-settings-divider" role="separator"></div>'
    +   '<button id="draft-whatif-help" class="draft-whatif-settings-item" type="button">'
    +     '<span class="draft-whatif-settings-icon" aria-hidden="true">?</span>'
    +     '<span>Show intro</span>'
    +   '</button>'
    + '</div>';

  counterEl = document.getElementById('draft-whatif-counter');
  undoBtn = document.getElementById('draft-whatif-undo');
  resetBtn = document.getElementById('draft-whatif-reset');
  exitBtn = document.getElementById('draft-whatif-exit');
  helpBtn = document.getElementById('draft-whatif-help');
  hideLockedBtn = document.getElementById('draft-whatif-hide-locked');
  dateInputEl = document.getElementById('draft-whatif-date-input');
  settingsBtn = document.getElementById('draft-whatif-settings');
  settingsPanelEl = document.getElementById('draft-whatif-settings-panel');

  undoBtn.addEventListener('click', function() { store.undo(); closeSettingsPanel(); });
  resetBtn.addEventListener('click', function() { store.reset(); closeSettingsPanel(); });
  exitBtn.addEventListener('click', function() { store.disable(); });
  helpBtn.addEventListener('click', function() {
    closeSettingsPanel();
    if (typeof window.__whatifReplayIntro === 'function') window.__whatifReplayIntro();
  });
  hideLockedBtn.addEventListener('click', function() {
    store.setHideLocked(!store.getState().hideLocked);
  });
  dateInputEl.addEventListener('change', function() {
    var season = currentSeasonRef ? currentSeasonRef() : null;
    if (!season) return;
    store.setDraftDate(season, dateInputEl.value || null);
  });
  settingsBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleSettingsPanel();
  });
  settingsPanelEl.addEventListener('click', function(e) {
    e.stopPropagation();
  });
}

function openSettingsPanel() {
  if (!settingsPanelEl || !settingsBtn) return;
  settingsPanelEl.hidden = false;
  settingsBtn.setAttribute('aria-expanded', 'true');
  document.addEventListener('click', onDocumentClickForPanel, true);
  document.addEventListener('keydown', onKeydownForPanel, true);
}

function closeSettingsPanel() {
  if (!settingsPanelEl || !settingsBtn) return;
  if (settingsPanelEl.hidden) return;
  settingsPanelEl.hidden = true;
  settingsBtn.setAttribute('aria-expanded', 'false');
  document.removeEventListener('click', onDocumentClickForPanel, true);
  document.removeEventListener('keydown', onKeydownForPanel, true);
}

function toggleSettingsPanel() {
  if (!settingsPanelEl) return;
  if (settingsPanelEl.hidden) openSettingsPanel(); else closeSettingsPanel();
}

function onDocumentClickForPanel(e) {
  if (!settingsPanelEl || settingsPanelEl.hidden) return;
  if (settingsPanelEl.contains(e.target)) return;
  if (settingsBtn && settingsBtn.contains(e.target)) return;
  closeSettingsPanel();
}

function onKeydownForPanel(e) {
  if (e.key === 'Escape' || e.key === 'Esc') {
    closeSettingsPanel();
    if (settingsBtn) settingsBtn.focus();
  }
}

export function updateBannerForSeason(season) {
  if (!dateInputEl) return;
  dateInputEl.value = store.getDraftDate(season) || '';
}

function syncFromState() {
  var s = store.getState();
  pillEl.setAttribute('aria-pressed', s.enabled ? 'true' : 'false');
  bannerEl.classList.toggle('is-shown', s.enabled);
  appEl.classList.toggle('is-whatif', s.enabled);
  appEl.classList.toggle('hide-locked', s.enabled && s.hideLocked);
  if (hideLockedBtn) {
    hideLockedBtn.setAttribute('aria-pressed', s.hideLocked ? 'true' : 'false');
    var hideLockedLabel = hideLockedBtn.querySelector('.draft-whatif-hide-locked-label');
    if (hideLockedLabel) {
      hideLockedLabel.textContent = s.hideLocked ? 'Show locked picks' : 'Hide locked picks';
    }
  }

  if (s.enabled) {
    var n = s.swaps.length;
    if (counterEl) {
      counterEl.textContent = n === 0 ? '' : n + ' active';
    }
    if (undoBtn) undoBtn.disabled = (n === 0);
    if (resetBtn) resetBtn.disabled = (n === 0);
    maybeRunIntro();
  } else {
    closeSettingsPanel();
    clearLockedTooltips();
    clearPreDraftTooltips();
    clearSelection();
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

function dispatchSelectionChanged() {
  if (!appEl) return;
  appEl.dispatchEvent(new CustomEvent('whatif:selection-changed', { detail: { selected: selected } }));
}

function paintCandidates() {
  if (!selected) return;
  if (selected.kind === 'slot-ghost') {
    document.querySelectorAll('#draft-unpicked tbody tr[data-kind="candidate"]').forEach(function(tr) {
      if (tr.dataset.preDraft !== '1') tr.classList.add('draft-row-candidate');
    });
  } else {
    document.querySelectorAll('#draft-picks tbody tr.draft-row-swappable:not(.draft-row-ghost)').forEach(function(tr) {
      if (tr.dataset.imdb !== selected.imdbId && tr.dataset.preDraft !== '1') tr.classList.add('draft-row-candidate');
    });
    document.querySelectorAll('#draft-unpicked tbody tr[data-kind="candidate"]').forEach(function(tr) {
      if (tr.dataset.imdb !== selected.imdbId && tr.dataset.preDraft !== '1') tr.classList.add('draft-row-candidate');
    });
    if (selected.kind === 'candidate') {
      document.querySelectorAll('#draft-picks tbody tr.draft-row-ghost').forEach(function(tr) {
        tr.classList.add('draft-row-candidate');
      });
    }
  }
  var selEl = null;
  if (selected.kind === 'slot-ghost') {
    if (selected.clearedImdbId) {
      selEl = document.querySelector('tr.draft-row-ghost[data-cleared-imdb="' + selected.clearedImdbId + '"]');
    }
  } else if (selected.imdbId) {
    selEl = document.querySelector('tr[data-imdb="' + selected.imdbId + '"]');
  }
  if (selEl) selEl.classList.add('draft-row-selected');
}

function setSelectionFromRow(row) {
  if (row.kind === 'slot-ghost') {
    selected = {
      kind: 'slot-ghost',
      imdbId: null,
      clearedImdbId: row.clearedImdbId,
      ghostOwner: row.owner,
      ghostPickType: row.pickType,
      ghostDraftPick: row.draftPick
    };
  } else {
    selected = { kind: row.kind, imdbId: row.imdbId };
  }
  clearSelectionUI();
  paintCandidates();
  dispatchSelectionChanged();
}

function setSelection(kind, imdbId) {
  selected = { kind: kind, imdbId: imdbId };
  clearSelectionUI();
  paintCandidates();
  dispatchSelectionChanged();
}

function clearSelection() {
  selected = null;
  clearSelectionUI();
  dispatchSelectionChanged();
}

function rowFromEvent(e) {
  var tr = e.target.closest('tr[data-imdb], tr[data-kind="slot-ghost"]');
  if (!tr) return null;
  var inPicks = !!tr.closest('#draft-picks');
  var inUnpicked = !!tr.closest('#draft-unpicked');
  if (!inPicks && !inUnpicked) return null;
  if (tr.dataset.kind === 'slot-ghost') {
    return {
      el: tr,
      kind: 'slot-ghost',
      imdbId: null,
      clearedImdbId: tr.dataset.clearedImdb || null,
      owner: tr.dataset.owner || '',
      pickType: tr.dataset.pickType || '',
      draftPick: parseInt(tr.dataset.draftPick, 10) || null
    };
  }
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

function isPreDraft(row) {
  return row.el && row.el.dataset && row.el.dataset.preDraft === '1';
}

function fireSwap(slotRow, candidateRow) {
  selected = null;
  clearSelectionUI();
  store.pushSwap(slotRow.imdbId, candidateRow.imdbId, currentSeasonRef());
}

function fireFill(ghostSel, candidateImdbId) {
  selected = null;
  clearSelectionUI();
  store.pushFill(
    ghostSel.clearedImdbId,
    { owner: ghostSel.ghostOwner, pick_type: ghostSel.ghostPickType, draft_pick: ghostSel.ghostDraftPick },
    candidateImdbId,
    currentSeasonRef ? currentSeasonRef() : null
  );
}

function onAppClick(e) {
  if (!store.getState().enabled) return;
  var clearBtn = e.target.closest('.draft-clear-pick');
  if (clearBtn) {
    var clearRow = clearBtn.closest('tr[data-imdb]');
    if (clearRow && clearRow.dataset.imdb) {
      e.preventDefault();
      e.stopPropagation();
      selected = null;
      clearSelectionUI();
      store.pushClear(clearRow.dataset.imdb, currentSeasonRef ? currentSeasonRef() : null);
    }
    return;
  }
  var row = rowFromEvent(e);
  if (!row) {
    if (!e.target.closest('.draft-whatif-banner') && !e.target.closest('.draft-whatif-pill')) {
      clearSelection();
    }
    return;
  }
  if (isLocked(row)) return;
  if (isPreDraft(row)) return;

  if (!selected) {
    setSelectionFromRow(row);
    return;
  }

  if (selected.kind === 'slot-ghost') {
    if (row.kind === 'candidate') {
      fireFill(selected, row.imdbId);
      return;
    }
    setSelectionFromRow(row);
    return;
  }

  if (row.kind === 'slot-ghost') {
    if (selected.kind === 'candidate') {
      fireFill(
        {
          clearedImdbId: row.clearedImdbId,
          ghostOwner: row.owner,
          ghostPickType: row.pickType,
          ghostDraftPick: row.draftPick
        },
        selected.imdbId
      );
      return;
    }
    setSelectionFromRow(row);
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
  if (e.key === 'Escape') { clearSelection(); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (!selected || selected.kind !== 'slot') return;
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    var tr = document.querySelector('tr[data-imdb="' + selected.imdbId + '"]');
    if (!tr || tr.classList.contains('draft-row-locked')) return;
    e.preventDefault();
    var imdb = selected.imdbId;
    selected = null;
    clearSelectionUI();
    store.pushClear(imdb, currentSeasonRef ? currentSeasonRef() : null);
  }
}

export function attachSelectionHandlers(getCurrentSeason) {
  currentSeasonRef = getCurrentSeason;
  document.addEventListener('click', onAppClick);
  document.addEventListener('keydown', onKeydown);
}

export function repaintSelectionAfterRender() {
  if (!store.getState().enabled) {
    selected = null;
    clearSelectionUI();
    paintSwappedRows();
    return;
  }
  clearSelectionUI();
  paintCandidates();
  paintSwappedRows();
}

function paintSwappedRows() {
  var affected = store.getAffectedImdbIds();
  document.querySelectorAll('#draft-picks tr[data-imdb], #draft-unpicked tr[data-imdb]').forEach(function(tr) {
    if (affected[tr.dataset.imdb]) {
      tr.setAttribute('data-swapped', '1');
    } else {
      tr.removeAttribute('data-swapped');
    }
  });
}

export function clearSelectionOnTabChange() {
  clearSelection();
}

var lockedTooltipInstances = [];
var preDraftTooltipInstances = [];

var SEASON_LABEL = { WINTER: 'Winter', SUMMER: 'Summer', FALL: 'Fall' };

function clearLockedTooltips() {
  lockedTooltipInstances.forEach(function(t) { try { t.dispose(); } catch (e) {} });
  lockedTooltipInstances = [];
}

function clearPreDraftTooltips() {
  preDraftTooltipInstances.forEach(function(t) { try { t.dispose(); } catch (e) {} });
  preDraftTooltipInstances = [];
}

export function refreshLockedTooltips() {
  clearLockedTooltips();
  if (!store.getState().enabled) return;
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

export function refreshPreDraftTooltips() {
  clearPreDraftTooltips();
  if (!store.getState().enabled) return;
  if (!window.bootstrap || !window.bootstrap.Tooltip) return;
  var season = currentSeasonRef ? currentSeasonRef() : null;
  var seasonLabel = (season && SEASON_LABEL[season]) || 'this season';
  var title = 'Movie was released before ' + seasonLabel + ' draft day, unavailable for selection.';
  document.querySelectorAll('#draft-unpicked tr.draft-row-pre-draft').forEach(function(tr) {
    tr.setAttribute('data-bs-toggle', 'tooltip');
    tr.setAttribute('title', title);
    var t = new window.bootstrap.Tooltip(tr, { trigger: 'hover', placement: 'top' });
    preDraftTooltipInstances.push(t);
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

