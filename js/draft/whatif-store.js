var ENABLED_KEY = 'mb_whatif_enabled';
var SWAPS_KEY = 'mb_whatif_swaps';

var state = {
  enabled: false,
  swaps: []
};

var listeners = [];

function notify() {
  listeners.forEach(function(fn) { try { fn(); } catch (e) { console.error(e); } });
}

function persist() {
  try {
    localStorage.setItem(ENABLED_KEY, state.enabled ? '1' : '0');
    localStorage.setItem(SWAPS_KEY, JSON.stringify(state.swaps));
  } catch (e) {
    console.warn('whatif-store: persist failed', e);
  }
}

export function hydrate() {
  try {
    state.enabled = localStorage.getItem(ENABLED_KEY) === '1';
    var raw = localStorage.getItem(SWAPS_KEY);
    state.swaps = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(state.swaps)) state.swaps = [];
  } catch (e) {
    state.enabled = false;
    state.swaps = [];
  }
}

export function getState() {
  return { enabled: state.enabled, swaps: state.swaps.slice() };
}

export function enable() {
  if (state.enabled) return;
  state.enabled = true;
  persist();
  notify();
}

export function disable() {
  if (!state.enabled && state.swaps.length === 0) return;
  state.enabled = false;
  state.swaps = [];
  persist();
  notify();
}

export function pushSwap(slotImdbId, replacementImdbId, season) {
  if (!slotImdbId || !replacementImdbId || slotImdbId === replacementImdbId) return;
  state.swaps.push({ slotImdbId: slotImdbId, replacementImdbId: replacementImdbId, season: season });
  persist();
  notify();
}

export function undo() {
  if (state.swaps.length === 0) return;
  state.swaps.pop();
  persist();
  notify();
}

export function reset() {
  if (state.swaps.length === 0) return;
  state.swaps = [];
  persist();
  notify();
}

export function subscribe(fn) {
  listeners.push(fn);
  return function() {
    var i = listeners.indexOf(fn);
    if (i !== -1) listeners.splice(i, 1);
  };
}
