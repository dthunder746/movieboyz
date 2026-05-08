var KNOWN_OWNERS = ['Chris', 'Connie', 'Emerson', 'Marcus', 'Matt'];

function effectiveDraftSeason(m) {
  var pt = (m.pick_type || '').toLowerCase();
  if (pt === 'hit' || pt === 'bomb') return 'WINTER';
  return m.season;
}

export function picksForDraft(data, season) {
  return Object.entries(data.movies)
    .filter(function(entry) {
      var m = entry[1];
      if (m.draft_pick == null) return false;
      return effectiveDraftSeason(m) === season;
    })
    .map(function(entry) {
      var pick = Object.assign({}, entry[1]);
      pick.imdb_id = entry[0];
      return pick;
    })
    .sort(function(a, b) { return a.draft_pick - b.draft_pick; });
}

function isSeasonalOrAlt(m) {
  var pt = (m.pick_type || '').toLowerCase();
  return pt === 'seasonal' || pt === 'alt';
}

export function leaderboardForDraft(data, season) {
  var picks = picksForDraft(data, season).filter(isSeasonalOrAlt);
  var byOwner = {};
  KNOWN_OWNERS.forEach(function(o) { byOwner[o] = { owner: o, total: 0, picks: [] }; });
  picks.forEach(function(m) {
    if (!byOwner[m.owner]) byOwner[m.owner] = { owner: m.owner, total: 0, picks: [] };
    byOwner[m.owner].picks.push(m);
    if (m.profit_td != null) byOwner[m.owner].total += m.profit_td;
  });
  Object.keys(byOwner).forEach(function(o) {
    byOwner[o].picks.sort(function(a, b) { return a.draft_pick - b.draft_pick; });
  });
  return Object.values(byOwner).sort(function(a, b) {
    if (b.total !== a.total) return b.total - a.total;
    return a.owner.localeCompare(b.owner);
  });
}

export function unpickedForDraft(data, season) {
  return Object.entries(data.movies)
    .filter(function(entry) {
      var m = entry[1];
      return m.season === season && m.owner === 'none' && m.profit_td != null;
    })
    .map(function(entry) {
      var movie = Object.assign({}, entry[1]);
      movie.imdb_id = entry[0];
      return movie;
    })
    .sort(function(a, b) { return b.profit_td - a.profit_td; });
}

export function profitRanksForSeason(data, season) {
  var entries = Object.entries(data.movies)
    .filter(function(entry) {
      var m = entry[1];
      return m.season === season && m.profit_td != null;
    })
    .sort(function(a, b) { return b[1].profit_td - a[1].profit_td; });
  var ranks = {};
  var lastProfit = null;
  var lastRank = 0;
  entries.forEach(function(entry, i) {
    var p = entry[1].profit_td;
    if (p === lastProfit) {
      ranks[entry[0]] = lastRank;
    } else {
      lastRank = i + 1;
      lastProfit = p;
      ranks[entry[0]] = lastRank;
    }
  });
  return ranks;
}

export function highlightsForDraft(data, season) {
  var picks = picksForDraft(data, season).filter(isSeasonalOrAlt);
  var ranks = profitRanksForSeason(data, season);

  var picksWithRank = picks.filter(function(m) {
    return m.profit_td != null && ranks[m.imdb_id] != null;
  });

  var steal = null;
  var bust = null;
  if (picksWithRank.length >= 2) {
    var sortedBySteal = picksWithRank.slice().sort(function(a, b) {
      return (b.draft_pick - ranks[b.imdb_id]) - (a.draft_pick - ranks[a.imdb_id]);
    });
    var top = sortedBySteal[0];
    var bot = sortedBySteal[sortedBySteal.length - 1];
    steal = { movie: top.movie_title, owner: top.owner, draftPick: top.draft_pick, profitRank: ranks[top.imdb_id] };
    bust  = { movie: bot.movie_title, owner: bot.owner, draftPick: bot.draft_pick, profitRank: ranks[bot.imdb_id] };
  }

  var roi = null;
  var roiCandidates = picks.filter(function(m) {
    return m.profit_td != null && m.breakeven != null && m.breakeven > 0;
  });
  if (roiCandidates.length) {
    var sortedRoi = roiCandidates.slice().sort(function(a, b) {
      return (b.profit_td / b.breakeven) - (a.profit_td / a.breakeven);
    });
    roi = { movie: sortedRoi[0].movie_title, owner: sortedRoi[0].owner, ratio: sortedRoi[0].profit_td / sortedRoi[0].breakeven };
  }

  var profitCandidates = picks.filter(function(m) { return m.profit_td != null; });
  var biggestWinner = null;
  var biggestLoser = null;
  if (profitCandidates.length) {
    var byProfitDesc = profitCandidates.slice().sort(function(a, b) { return b.profit_td - a.profit_td; });
    var w = byProfitDesc[0];
    var l = byProfitDesc[byProfitDesc.length - 1];
    biggestWinner = { movie: w.movie_title, owner: w.owner, profit: w.profit_td };
    biggestLoser  = { movie: l.movie_title, owner: l.owner, profit: l.profit_td };
  }

  var board = leaderboardForDraft(data, season).filter(function(row) { return row.picks.length > 0; });
  var mostConsistent = null;
  var consistentCandidates = board.filter(function(row) {
    return row.picks.filter(function(p) { return p.profit_td != null; }).length >= 2;
  }).map(function(row) {
    var profits = row.picks.filter(function(p) { return p.profit_td != null; }).map(function(p) { return p.profit_td; });
    return { owner: row.owner, range: Math.max.apply(null, profits) - Math.min.apply(null, profits) };
  });
  if (consistentCandidates.length) {
    consistentCandidates.sort(function(a, b) { return a.range - b.range; });
    mostConsistent = consistentCandidates[0];
  }

  return {
    steal: steal,
    bust: bust,
    roi: roi,
    mostConsistent: mostConsistent,
    biggestWinner: biggestWinner,
    biggestLoser: biggestLoser,
  };
}

export function seasonFromIsoDate(iso) {
  if (!iso) return 'WINTER';
  var month = parseInt(iso.split('-')[1], 10);
  if (month <= 4) return 'WINTER';
  if (month <= 8) return 'SUMMER';
  return 'FALL';
}
