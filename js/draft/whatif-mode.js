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
