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
    cancelIntro();
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

// === Intro (first-time guided tour) ===
var INTRO_KEY = 'mb_whatif_seen_intro';

var currentIntroStep = 0;            // 0 = idle, 1..4 = step number
var currentIntroPopover = null;
var currentIntroDocClick = null;
var currentIntroSelectionHandler = null;
var currentIntroStoreUnsub = null;
var currentIntroBaselineSwapCount = 0;
var currentStep4Anchor = null;

function reducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function scrollAnchorIntoView(el) {
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
}

function clearIntroPulses() {
  document.querySelectorAll('.draft-row-intro-pulse').forEach(function(el) {
    el.classList.remove('draft-row-intro-pulse');
  });
  document.querySelectorAll('.draft-intro-pulse-btn').forEach(function(el) {
    el.classList.remove('draft-intro-pulse-btn');
  });
}

function applyStep2Pulses() {
  document.querySelectorAll('#draft-picks tbody tr.draft-row-swappable:not(.draft-row-ghost):not(.draft-row-pre-draft)').forEach(function(tr) {
    tr.classList.add('draft-row-intro-pulse');
  });
  document.querySelectorAll('#draft-unpicked tbody tr[data-kind="candidate"]:not(.draft-row-pre-draft)').forEach(function(tr) {
    tr.classList.add('draft-row-intro-pulse');
  });
}

function applyStep3Pulses() {
  document.querySelectorAll('.draft-row-candidate').forEach(function(tr) {
    tr.classList.add('draft-row-intro-pulse');
  });
}

function disposeCurrentPopover() {
  if (currentIntroPopover) {
    try { currentIntroPopover.dispose(); } catch (e) {}
    currentIntroPopover = null;
  }
  if (currentIntroDocClick) {
    document.removeEventListener('click', currentIntroDocClick, true);
    currentIntroDocClick = null;
  }
}

function teardownStepHandlers() {
  if (currentIntroSelectionHandler && appEl) {
    appEl.removeEventListener('whatif:selection-changed', currentIntroSelectionHandler);
    currentIntroSelectionHandler = null;
  }
  if (currentIntroStoreUnsub) {
    try { currentIntroStoreUnsub(); } catch (e) {}
    currentIntroStoreUnsub = null;
  }
}

export function cancelIntro() {
  if (currentIntroStep === 0) return;
  disposeCurrentPopover();
  teardownStepHandlers();
  clearIntroPulses();
  if (currentStep4Anchor) {
    currentStep4Anchor.classList.remove('draft-intro-pulse-btn');
    currentStep4Anchor = null;
  }
  if (currentIntroStep === 4) closeSettingsPanel();
  currentIntroStep = 0;
}

function finishIntro() {
  disposeCurrentPopover();
  teardownStepHandlers();
  clearIntroPulses();
  if (currentStep4Anchor) {
    currentStep4Anchor.classList.remove('draft-intro-pulse-btn');
    currentStep4Anchor = null;
  }
  closeSettingsPanel();
  currentIntroStep = 0;
  try { localStorage.setItem(INTRO_KEY, '1'); } catch (e) {}
}

function skipIntro() {
  finishIntro();
}

// showStep — options-object signature.
// opts: { anchor, title, body, skip, gotIt, onSkip, onAdvance, placement }
function showStep(opts) {
  var anchor = opts.anchor;
  if (!anchor || !window.bootstrap || !window.bootstrap.Popover) {
    // Bootstrap missing or no anchor — silently complete the intro.
    finishIntro();
    return;
  }
  scrollAnchorIntoView(anchor);
  setTimeout(function() {
    var footerHtml = '<div class="draft-whatif-popover-footer">';
    footerHtml += opts.skip
      ? '<button class="draft-whatif-skip btn btn-sm btn-link" type="button">Skip intro</button>'
      : '<span></span>';
    footerHtml += opts.gotIt
      ? '<button class="draft-whatif-gotit btn btn-sm btn-warning" type="button">Got it</button>'
      : '<span></span>';
    footerHtml += '</div>';

    var content = '<div class="draft-whatif-popover-body"><p class="mb-0">'
      + opts.body + '</p>' + footerHtml + '</div>';

    var pop = new window.bootstrap.Popover(anchor, {
      title: opts.title,
      content: content,
      html: true,
      trigger: 'manual',
      placement: opts.placement || 'auto',
      sanitize: false
    });
    pop.show();
    currentIntroPopover = pop;

    function onClick(e) {
      if (e.target.classList.contains('draft-whatif-gotit')) {
        if (opts.onAdvance) opts.onAdvance();
      } else if (e.target.classList.contains('draft-whatif-skip')) {
        if (opts.onSkip) opts.onSkip();
      }
      // Outside clicks (anywhere else) do not dismiss during the guided flow.
    }
    currentIntroDocClick = onClick;
    setTimeout(function() { document.addEventListener('click', onClick, true); }, 50);
  }, reducedMotion() ? 0 : 350);
}

function startStep1() {
  currentIntroStep = 1;
  var anchor = document.getElementById('draft-whatif-banner');
  showStep({
    anchor: anchor,
    title: 'What-if mode',
    body: 'Numbers and standings update as you swap picks. Toggle off any time.',
    skip: true,
    gotIt: true,
    placement: 'bottom',
    onAdvance: function() { disposeCurrentPopover(); startStep2(); },
    onSkip: skipIntro
  });
}

function startStep2() {
  currentIntroStep = 2;
  applyStep2Pulses();

  var anchor = document.querySelector('#draft-picks tbody tr.draft-row-swappable:not(.draft-row-ghost):not(.draft-row-pre-draft)')
            || document.querySelector('#draft-unpicked tbody tr[data-kind="candidate"]:not(.draft-row-pre-draft)');

  if (!anchor) { finishIntro(); return; }

  function handleSelection(e) {
    if (!e.detail || !e.detail.selected) return;
    appEl.removeEventListener('whatif:selection-changed', handleSelection);
    currentIntroSelectionHandler = null;
    disposeCurrentPopover();
    clearIntroPulses();
    startStep3();
  }
  currentIntroSelectionHandler = handleSelection;
  appEl.addEventListener('whatif:selection-changed', handleSelection);

  showStep({
    anchor: anchor,
    title: 'Try a swap',
    body: 'Click any of the highlighted picks to start a swap.',
    skip: true,
    gotIt: false,
    onSkip: skipIntro
  });
}

function startStep3() {
  currentIntroStep = 3;
  currentIntroBaselineSwapCount = store.getState().swaps.length;

  function showStep3Popover() {
    applyStep3Pulses();
    var anchor = document.querySelector('tr.draft-row-candidate');
    if (!anchor) return; // no candidates rendered — wait for next selection
    showStep({
      anchor: anchor,
      title: 'Pick a target',
      body: 'Now pick a target — any highlighted row works.',
      skip: true,
      gotIt: false,
      onSkip: skipIntro
    });
  }

  function handleSelection(e) {
    // Selection changed during step 3: the anchored candidate row may be gone.
    // Dispose, then re-show if there's a new selection (candidates re-painted).
    disposeCurrentPopover();
    clearIntroPulses();
    if (e.detail && e.detail.selected) {
      showStep3Popover();
    }
    // If selection is null, leave popover hidden until user re-selects.
  }
  currentIntroSelectionHandler = handleSelection;
  appEl.addEventListener('whatif:selection-changed', handleSelection);

  function handleStore() {
    var s = store.getState();
    var op = store.getLastOp();
    if ((op === 'swap' || op === 'fill') && s.swaps.length > currentIntroBaselineSwapCount) {
      teardownStepHandlers();
      disposeCurrentPopover();
      clearIntroPulses();
      // page.js's store subscriber re-renders picks/unpicked synchronously after us;
      // defer step 4 to the next tick so the banner's undo button is in its post-render state.
      setTimeout(startStep4, 0);
    }
  }
  currentIntroStoreUnsub = store.subscribe(handleStore);

  showStep3Popover();
}

function startStep4() {
  currentIntroStep = 4;
  openSettingsPanel();
  var anchor = document.getElementById('draft-whatif-undo');
  if (!anchor) { finishIntro(); return; }
  currentStep4Anchor = anchor;
  anchor.classList.add('draft-intro-pulse-btn');
  showStep({
    anchor: anchor,
    title: 'Recover any time',
    body: 'Undo reverts this swap. Reset clears them all.',
    skip: false,
    gotIt: true,
    placement: 'left',
    onAdvance: finishIntro
  });
}

function runIntroSequence() {
  if (currentIntroStep !== 0) cancelIntro();
  startStep1();
}

function maybeRunIntro() {
  var seen = false;
  try { seen = localStorage.getItem(INTRO_KEY) === '1'; } catch (e) {}
  if (seen) return;
  if (currentIntroStep !== 0) return; // already running
  runIntroSequence();
}

window.__whatifReplayIntro = function() {
  // Replay always runs, regardless of the localStorage flag.
  runIntroSequence();
};

