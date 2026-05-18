var ENABLED_KEY = 'mb_whatif_enabled';
var SWAPS_KEY = 'mb_whatif_swaps';
var HIDE_LOCKED_KEY = 'mb_whatif_hide_locked';
var DRAFT_DATES_KEY = 'mb_whatif_draft_dates';

var state = {
  enabled: false,
  swaps: [],
  hideLocked: false,
  draftDates: {}
};

var lastOp = null;

var listeners = [];

function notify() {
  listeners.forEach(function(fn) { try { fn(); } catch (e) { console.error(e); } });
}

function persist() {
  try {
    localStorage.setItem(ENABLED_KEY, state.enabled ? '1' : '0');
    localStorage.setItem(SWAPS_KEY, JSON.stringify(state.swaps));
    localStorage.setItem(HIDE_LOCKED_KEY, state.hideLocked ? '1' : '0');
    localStorage.setItem(DRAFT_DATES_KEY, JSON.stringify(state.draftDates));
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
    state.hideLocked = localStorage.getItem(HIDE_LOCKED_KEY) === '1';
    var rawDates = localStorage.getItem(DRAFT_DATES_KEY);
    if (rawDates === null) {
      state.draftDates = { WINTER: '2026-01-31' };
      try { localStorage.setItem(DRAFT_DATES_KEY, JSON.stringify(state.draftDates)); } catch (e) {}
    } else {
      var parsed = JSON.parse(rawDates);
      state.draftDates = (parsed && typeof parsed === 'object') ? parsed : {};
    }
  } catch (e) {
    state.enabled = false;
    state.swaps = [];
    state.hideLocked = false;
    state.draftDates = {};
  }
}

export function getState() {
  return { enabled: state.enabled, swaps: state.swaps.slice(), hideLocked: state.hideLocked };
}

export function setHideLocked(val) {
  var next = !!val;
  if (state.hideLocked === next) return;
  state.hideLocked = next;
  lastOp = 'hideLocked';
  persist();
  notify();
}

export function getDraftDate(season) {
  if (!season) return null;
  return state.draftDates[season] || null;
}

export function setDraftDate(season, isoDate) {
  if (!season) return;
  var next = isoDate || null;
  if ((state.draftDates[season] || null) === next) return;
  if (next === null) {
    delete state.draftDates[season];
  } else {
    state.draftDates[season] = next;
  }
  lastOp = 'draftDate';
  persist();
  notify();
}

export function enable() {
  if (state.enabled) return;
  state.enabled = true;
  lastOp = 'enable';
  persist();
  notify();
}

export function disable() {
  if (!state.enabled && state.swaps.length === 0) return;
  state.enabled = false;
  state.swaps = [];
  lastOp = 'disable';
  persist();
  notify();
}

export function pushSwap(slotImdbId, replacementImdbId, season) {
  if (!slotImdbId || !replacementImdbId || slotImdbId === replacementImdbId) return;
  state.swaps.push({ slotImdbId: slotImdbId, replacementImdbId: replacementImdbId, season: season });
  lastOp = 'swap';
  persist();
  notify();
}

export function pushClear(slotImdbId, season) {
  if (!slotImdbId) return;
  state.swaps.push({ slotImdbId: slotImdbId, replacementImdbId: null, season: season });
  lastOp = 'clear';
  persist();
  notify();
}

export function pushFill(clearedImdbId, originalSlot, replacementImdbId, season) {
  if (!originalSlot || !replacementImdbId) return;
  state.swaps.push({
    kind: 'fill',
    clearedImdbId: clearedImdbId || null,
    replacementImdbId: replacementImdbId,
    season: season,
    originalSlot: {
      owner: originalSlot.owner,
      pick_type: originalSlot.pick_type,
      draft_pick: originalSlot.draft_pick
    }
  });
  lastOp = 'fill';
  persist();
  notify();
}

export function undo() {
  if (state.swaps.length === 0) return;
  state.swaps.pop();
  lastOp = 'undo';
  persist();
  notify();
}

export function reset() {
  if (state.swaps.length === 0) return;
  state.swaps = [];
  lastOp = 'reset';
  persist();
  notify();
}

export function getLastOp() { return lastOp; }

export function subscribe(fn) {
  listeners.push(fn);
  return function() {
    var i = listeners.indexOf(fn);
    if (i !== -1) listeners.splice(i, 1);
  };
}

export function getAffectedImdbIds() {
  var ids = {};
  state.swaps.forEach(function(s) {
    if (s.slotImdbId) ids[s.slotImdbId] = true;
    if (s.replacementImdbId) ids[s.replacementImdbId] = true;
  });
  return ids;
}

export function applyToData(rawData) {
  if (!rawData || !rawData.movies) return rawData;
  if (state.swaps.length === 0) return rawData;

  var newMovies = {};
  Object.keys(rawData.movies).forEach(function(id) {
    newMovies[id] = rawData.movies[id];
  });

  var ghostSlots = [];

  state.swaps.forEach(function(entry) {
    if (entry.kind === 'fill') {
      var m = newMovies[entry.replacementImdbId];
      if (!m) {
        console.warn('whatif-store: fill skipped, missing replacement', entry);
        return;
      }
      var mClone = Object.assign({}, m);
      mClone.owner = entry.originalSlot.owner;
      mClone.pick_type = entry.originalSlot.pick_type;
      mClone.draft_pick = entry.originalSlot.draft_pick;
      newMovies[entry.replacementImdbId] = mClone;
      ghostSlots = ghostSlots.filter(function(g) {
        return !(g.owner === entry.originalSlot.owner
          && g.pick_type === entry.originalSlot.pick_type
          && g.draft_pick === entry.originalSlot.draft_pick);
      });
      return;
    }
    var a = newMovies[entry.slotImdbId];
    if (!a) {
      console.warn('whatif-store: entry skipped, missing slot movie', entry);
      return;
    }
    if (!entry.replacementImdbId) {
      if (a.owner && a.owner !== 'none' && a.pick_type != null) {
        ghostSlots.push({
          owner: a.owner,
          pick_type: a.pick_type,
          draft_pick: a.draft_pick,
          season: a.season,
          clearedImdbId: entry.slotImdbId,
          clearedTitle: a.movie_title
        });
      }
      var aClone = Object.assign({}, a);
      aClone.owner = 'none';
      aClone.pick_type = null;
      aClone.draft_pick = null;
      newMovies[entry.slotImdbId] = aClone;
      return;
    }
    var b = newMovies[entry.replacementImdbId];
    if (!b) {
      console.warn('whatif-store: swap skipped, missing replacement', entry);
      return;
    }
    var aSwap = Object.assign({}, a);
    var bSwap = Object.assign({}, b);
    var tmpOwner = aSwap.owner;
    var tmpPickType = aSwap.pick_type;
    var tmpDraftPick = aSwap.draft_pick;
    aSwap.owner = bSwap.owner;
    aSwap.pick_type = bSwap.pick_type;
    aSwap.draft_pick = bSwap.draft_pick;
    bSwap.owner = tmpOwner;
    bSwap.pick_type = tmpPickType;
    bSwap.draft_pick = tmpDraftPick;
    newMovies[entry.slotImdbId] = aSwap;
    newMovies[entry.replacementImdbId] = bSwap;
  });

  return Object.assign({}, rawData, { movies: newMovies, ghostSlots: ghostSlots });
}
