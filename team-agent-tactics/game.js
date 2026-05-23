// === Seeded PRNG (platform standard — copied from texas-holdem) ===

var internalSeededRandom = function (seed) {
  var s = (seed + 0x6d2b79f5) | 0;
  var t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
var internalAdvanceSeed = function (seed) {
  return (seed + 0x6d2b79f5) | 0;
};
var internalPickRandom = function (arr, seed) {
  var r = internalSeededRandom(seed);
  var idx = Math.floor(r * arr.length);
  return { picked: arr[idx], index: idx, newSeed: internalAdvanceSeed(seed) };
};

var internalApplyTraits = function (units, traits) {
  for (var unitIndex = 0; unitIndex < units.length; unitIndex++) {
    var u = units[unitIndex];
    if (u.trait === "warrior" && (traits.warrior || 0) >= 2) u.atk += 2;
    if (u.trait === "ranger" && (traits.ranger || 0) >= 2) u.atk += 3;
    if (u.trait === "guardian" && (traits.guardian || 0) >= 2) u.armor = 2;
    if (u.trait === "assassin" && (traits.assassin || 0) >= 2) u.leaps = true;
    if (u.trait === "mage" && (traits.mage || 0) >= 2) u.splashes = true;
  }
};

// === Unit Data ===

var UNITS = [
  // Tier 1 (cost 1)
  {
    unitId: "squire",
    name: "Squire",
    trait: "warrior",
    tier: 1,
    atk: 3,
    hp: 7,
  },
  {
    unitId: "brawler",
    name: "Brawler",
    trait: "warrior",
    tier: 1,
    atk: 4,
    hp: 6,
  },
  {
    unitId: "sentinel",
    name: "Sentinel",
    trait: "guardian",
    tier: 1,
    atk: 2,
    hp: 8,
  },
  {
    unitId: "bulwark",
    name: "Bulwark",
    trait: "guardian",
    tier: 1,
    atk: 1,
    hp: 9,
  },
  { unitId: "scout", name: "Scout", trait: "assassin", tier: 1, atk: 4, hp: 5 },
  {
    unitId: "cutpurse",
    name: "Cutpurse",
    trait: "assassin",
    tier: 1,
    atk: 5,
    hp: 4,
  },
  {
    unitId: "apprentice",
    name: "Apprentice",
    trait: "mage",
    tier: 1,
    atk: 3,
    hp: 6,
  },
  {
    unitId: "initiate",
    name: "Initiate",
    trait: "mage",
    tier: 1,
    atk: 4,
    hp: 5,
  },
  {
    unitId: "herbalist",
    name: "Herbalist",
    trait: "healer",
    tier: 1,
    atk: 2,
    hp: 7,
  },
  {
    unitId: "acolyte",
    name: "Acolyte",
    trait: "healer",
    tier: 1,
    atk: 3,
    hp: 6,
  },
  { unitId: "archer", name: "Archer", trait: "ranger", tier: 1, atk: 3, hp: 5 },
  {
    unitId: "tracker",
    name: "Tracker",
    trait: "ranger",
    tier: 1,
    atk: 2,
    hp: 7,
  },
  // Tier 2 (cost 2)
  {
    unitId: "knight",
    name: "Knight",
    trait: "warrior",
    tier: 2,
    atk: 6,
    hp: 10,
  },
  {
    unitId: "berserker",
    name: "Berserker",
    trait: "warrior",
    tier: 2,
    atk: 8,
    hp: 8,
  },
  {
    unitId: "ironclad",
    name: "Ironclad",
    trait: "guardian",
    tier: 2,
    atk: 3,
    hp: 14,
  },
  {
    unitId: "shadowblade",
    name: "Shadowblade",
    trait: "assassin",
    tier: 2,
    atk: 7,
    hp: 7,
  },
  {
    unitId: "sorcerer",
    name: "Sorcerer",
    trait: "mage",
    tier: 2,
    atk: 6,
    hp: 8,
  },
  {
    unitId: "cleric",
    name: "Cleric",
    trait: "healer",
    tier: 2,
    atk: 4,
    hp: 11,
  },
  { unitId: "druid", name: "Druid", trait: "healer", tier: 2, atk: 3, hp: 12 },
  {
    unitId: "marksman",
    name: "Marksman",
    trait: "ranger",
    tier: 2,
    atk: 5,
    hp: 8,
  },
  // Tier 3 (cost 3)
  {
    unitId: "warlord",
    name: "Warlord",
    trait: "warrior",
    tier: 3,
    atk: 10,
    hp: 14,
  },
  {
    unitId: "titan",
    name: "Titan",
    trait: "guardian",
    tier: 3,
    atk: 5,
    hp: 22,
  },
  {
    unitId: "phantom",
    name: "Phantom",
    trait: "assassin",
    tier: 3,
    atk: 12,
    hp: 9,
  },
  {
    unitId: "archmage",
    name: "Archmage",
    trait: "mage",
    tier: 3,
    atk: 10,
    hp: 11,
  },
  {
    unitId: "oracle",
    name: "Oracle",
    trait: "healer",
    tier: 3,
    atk: 6,
    hp: 16,
  },
  {
    unitId: "sniper",
    name: "Sniper",
    trait: "ranger",
    tier: 3,
    atk: 8,
    hp: 12,
  },
];

var UNIT_BY_ID = {};
for (var internalUi = 0; internalUi < UNITS.length; internalUi++) {
  UNIT_BY_ID[UNITS[internalUi].unitId] = UNITS[internalUi];
}

// === Pool & Tier Config (FFA — scales by player count) ===

var POOL_BASE = { 1: 8, 2: 5, 3: 3 };

var TIER_ODDS = {
  1: [1.0, 0.0, 0.0],
  2: [1.0, 0.0, 0.0],
  3: [0.6, 0.4, 0.0],
  4: [0.6, 0.4, 0.0],
  5: [0.3, 0.4, 0.3],
  6: [0.3, 0.4, 0.3],
  7: [0.2, 0.3, 0.5],
  8: [0.2, 0.3, 0.5],
  9: [0.1, 0.3, 0.6],
  10: [0.1, 0.3, 0.6],
};

// === Unified Combat Grid ===
// Each player's 4x2 board maps onto a 4x4 unified grid for combat targeting.
//   Unified row 0: Side A back row  (board cells 4-7)
//   Unified row 1: Side A front row (board cells 0-3)
//   -- battle line --
//   Unified row 2: Side B front row (board cells 0-3)
//   Unified row 3: Side B back row  (board cells 4-7)
var internalToUnified = function (cell, side) {
  var col = cell < 4 ? cell : cell - 4;
  var row;
  if (side === "a") {
    row = cell < 4 ? 1 : 0; // front=1, back=0
  } else {
    row = cell < 4 ? 2 : 3; // front=2, back=3
  }
  return { row: row, col: col };
};
var internalUnifiedDist = function (posA, posB) {
  return Math.abs(posA.row - posB.row) + Math.abs(posA.col - posB.col);
};

// === Helpers ===

// Unit ID counter is stored in state.nextUnitId to keep apply() pure.
// _makeUnit takes the counter value and returns { unit, nextId }.
var internalMakeUnit = function (unitId, nextId) {
  var base = UNIT_BY_ID[unitId];
  var id = nextId + 1;
  return {
    unit: {
      id: "u" + id,
      unitId: base.unitId,
      name: base.name,
      trait: base.trait,
      tier: base.tier,
      atk: base.atk,
      hp: base.hp,
      maxHp: base.hp,
      star: false,
    },
    nextId: id,
  };
};

var internalInitPool = function (playerCount) {
  var mult = Math.ceil(playerCount / 4);
  var pool = {};
  for (var i = 0; i < UNITS.length; i++) {
    pool[UNITS[i].unitId] = POOL_BASE[UNITS[i].tier] * mult;
  }
  return pool;
};

var internalGenerateShop = function (pool, round, seed, nextId) {
  var odds = TIER_ODDS[round] || TIER_ODDS[10];
  var shop = [];
  var newPool = {};
  for (var k in pool) newPool[k] = pool[k];
  var s = seed;
  var nid = nextId;

  for (var i = 0; i < 4; i++) {
    var r = internalSeededRandom(s);
    s = internalAdvanceSeed(s);
    var tier;
    if (r < odds[0]) tier = 1;
    else if (r < odds[0] + odds[1]) tier = 2;
    else tier = 3;

    var tierUnits = [];
    for (var uid in newPool) {
      if (newPool[uid] > 0 && UNIT_BY_ID[uid].tier === tier)
        tierUnits.push(uid);
    }
    if (tierUnits.length === 0) {
      tierUnits = [];
      for (var uid2 in newPool) {
        if (newPool[uid2] > 0) tierUnits.push(uid2);
      }
    }
    if (tierUnits.length === 0) break;

    var pick = internalPickRandom(tierUnits, s);
    s = pick.newSeed;
    var made = internalMakeUnit(pick.picked, nid);
    nid = made.nextId;
    newPool[pick.picked]--;
    shop.push(made.unit);
  }
  return { shop: shop, newSeed: s, newPool: newPool, nextId: nid };
};

var internalCountBoardUnits = function (board) {
  var c = 0;
  for (var i = 0; i < 8; i++) {
    if (board[i]) c++;
  }
  return c;
};

var internalDecisionOf = function (option) {
  if (option && typeof option === "object" && option.decision !== undefined)
    return option.decision;
  if (option && typeof option === "object" && option.action !== undefined)
    return option.action;
  return option;
};

var internalPlayerName = function (state, playerId) {
  return (
    (state && state.playerNames && state.playerNames[playerId]) || playerId
  );
};

var internalUnitText = function (unit) {
  if (!unit) return "empty";
  return (
    unit.name +
    (unit.star ? " star" : "") +
    " (tier " +
    unit.tier +
    ", " +
    unit.trait +
    ", " +
    unit.atk +
    " attack, " +
    unit.hp +
    "/" +
    unit.maxHp +
    " HP)"
  );
};

var internalCellName = function (cell) {
  var row = cell < 4 ? "front" : "back";
  var col = (cell % 4) + 1;
  return row + " row slot " + col + " (cell " + cell + ")";
};

var internalGetTraitCounts = function (board) {
  var counts = {};
  for (var i = 0; i < 8; i++) {
    if (board[i]) {
      var t = board[i].trait;
      counts[t] = (counts[t] || 0) + 1;
    }
  }
  return counts;
};

var internalCheckMerge = function (playerState) {
  var counts = {};
  var locations = {};
  for (var i = 0; i < 8; i++) {
    var u = playerState.board[i];
    if (u && !u.star) {
      counts[u.unitId] = (counts[u.unitId] || 0) + 1;
      if (!locations[u.unitId]) locations[u.unitId] = [];
      locations[u.unitId].push({ loc: "board", idx: i, unit: u });
    }
  }
  for (var j = 0; j < playerState.bench.length; j++) {
    var bu = playerState.bench[j];
    if (bu && !bu.star) {
      counts[bu.unitId] = (counts[bu.unitId] || 0) + 1;
      if (!locations[bu.unitId]) locations[bu.unitId] = [];
      locations[bu.unitId].push({ loc: "bench", idx: j, unit: bu });
    }
  }

  for (var uid in counts) {
    if (counts[uid] >= 3) {
      var locs = locations[uid];
      var base = UNIT_BY_ID[uid];
      var starUnit = {
        id: locs[0].unit.id,
        unitId: uid,
        name: base.name + "\u2605",
        trait: base.trait,
        tier: base.tier,
        atk: Math.ceil(base.atk * 1.5),
        hp: Math.ceil(base.hp * 1.5),
        maxHp: Math.ceil(base.hp * 1.5),
        star: true,
      };

      var boardLocs = locs.filter(function (l) {
        return l.loc === "board";
      });
      var newBoard = playerState.board.slice();
      var newBench = playerState.bench.slice();

      var removed = 0;
      for (var ri = 0; ri < locs.length && removed < 3; ri++) {
        if (locs[ri].loc === "board") {
          newBoard[locs[ri].idx] = null;
        } else {
          newBench[locs[ri].idx] = null;
        }
        removed++;
      }
      newBench = newBench.filter(function (b) {
        return b !== null;
      });

      if (boardLocs.length > 0) {
        newBoard[boardLocs[0].idx] = starUnit;
      } else {
        newBench.push(starUnit);
      }

      return Object.assign({}, playerState, {
        board: newBoard,
        bench: newBench,
      });
    }
  }
  return playerState;
};

// === Economy (FFA — no interest, win/loss streaks) ===

var internalCalcGoldIncome = function (round, streak, wonLastFight) {
  var base = 3 + round;
  var winBonus = wonLastFight ? 1 : 0;
  var absStreak = Math.abs(streak);
  var streakBonus = absStreak >= 5 ? 2 : absStreak >= 3 ? 1 : 0;
  return base + winBonus + streakBonus;
};

// === Fixed Matchups (1v1 or 2v2 lanes) ===
//
// 1v1: one matchup, same opponent every round.
// 2v2: two matchups (fixed lanes). Left column vs right column:
//   Lane 0: alpha[0] vs beta[0]
//   Lane 1: alpha[1] vs beta[1]
//
// No rotation, no ghost fights.

var internalBuildFixedMatchups = function (teams) {
  var matchups = [];
  for (var i = 0; i < teams.alpha.players.length; i++) {
    matchups.push([teams.alpha.players[i], teams.beta.players[i]]);
  }
  return matchups;
};

// === Damage Calculation (escalating by round) ===

var internalBaseDamage = function (round) {
  if (round <= 3) return 1;
  if (round <= 6) return 2;
  if (round <= 9) return 3;
  return 5;
};

var internalCalcDamage = function (round, survivors) {
  var dmg = internalBaseDamage(round);
  for (var i = 0; i < survivors.length; i++) {
    dmg += survivors[i].tier;
    if (survivors[i].star) dmg += 1;
  }
  return dmg;
};

// === Battle Resolution (1v1 / 2v2 — fixed lanes, team HP) ===

// Strip seed from battle result to avoid leaking PRNG state in view
var internalCleanResult = function (r) {
  return {
    winner: r.winner,
    rounds: r.rounds,
    log: r.log,
    survivors: r.survivors,
    loserDamage: r.loserDamage,
  };
};

var internalResolveRound = function (state) {
  var results = {};
  var s = state.seed;

  // Resolve each fixed-lane matchup
  for (var i = 0; i < state.matchups.length; i++) {
    var m = state.matchups[i];
    var r = internalResolveBattle(
      state.players[m[0]].board,
      state.players[m[1]].board,
      s,
    );
    s = r.seed;
    var clean = internalCleanResult(r);
    results[m[0]] = { opponent: m[1], result: clean, side: "a" };
    results[m[1]] = { opponent: m[0], result: clean, side: "b" };
  }

  // Apply damage to team HP + update per-player streaks
  var newPlayers = {};
  for (var pid in state.players) {
    newPlayers[pid] = Object.assign({}, state.players[pid]);
  }

  var newTeams = {
    alpha: Object.assign({}, state.teams.alpha),
    beta: Object.assign({}, state.teams.beta),
  };

  for (var rid in results) {
    var p = newPlayers[rid];
    var res = results[rid];
    var won =
      (res.side === "a" && res.result.winner === "a") ||
      (res.side === "b" && res.result.winner === "b");
    var lost =
      (res.side === "a" && res.result.winner === "b") ||
      (res.side === "b" && res.result.winner === "a");

    // Damage applied to team HP (independent per lane)
    if (lost) {
      var dmg = internalCalcDamage(state.round, res.result.survivors);
      var teamId = p.teamId;
      newTeams[teamId].hp = Math.max(0, newTeams[teamId].hp - dmg);
    }

    // Per-player streak
    if (won) {
      p.streak = p.streak > 0 ? p.streak + 1 : 1;
      p.lastFightWon = true;
    } else if (lost) {
      p.streak = p.streak < 0 ? p.streak - 1 : -1;
      p.lastFightWon = false;
    } else {
      p.streak = 0;
      p.lastFightWon = null;
    }
  }

  // Collect all battle logs
  var allLogs = [];
  var seenMatchups = {};
  for (var lid in results) {
    var matchKey =
      results[lid].opponent < lid
        ? results[lid].opponent + ":" + lid
        : lid + ":" + results[lid].opponent;
    if (!seenMatchups[matchKey]) {
      seenMatchups[matchKey] = true;
      allLogs = allLogs.concat(results[lid].result.log);
    }
  }

  return {
    players: newPlayers,
    teams: newTeams,
    seed: s,
    results: results,
    battleLog: allLogs,
  };
};

// === Phase Transition Helpers ===

var internalAllPlayersReady = function (state) {
  var ids = state.playerIds;
  for (var i = 0; i < ids.length; i++) {
    if (!state.players[ids[i]].ready) return false;
  }
  return true;
};

var internalResetReady = function (state) {
  var newPlayers = {};
  var ids = state.playerIds;
  for (var i = 0; i < ids.length; i++) {
    newPlayers[ids[i]] = Object.assign({}, state.players[ids[i]], {
      ready: false,
    });
  }
  return Object.assign({}, state, { players: newPlayers });
};

var internalAdvanceToShop = function (state) {
  var newRound = state.round + 1;

  // Game over: any team HP <= 0 or past round 10
  var alphaDown = state.teams.alpha.hp <= 0;
  var betaDown = state.teams.beta.hp <= 0;

  if (alphaDown || betaDown || newRound > 10) {
    // Determine winning team
    var winningTeam = null;
    if (alphaDown && betaDown) {
      // Both teams at 0: tiebreak by HP (less negative = better), then total units, gold, seeded random
      var s = state.seed;
      var internalTeamScore = function (teamId) {
        var team = state.teams[teamId];
        var totalUnits = 0;
        var totalGold = 0;
        for (var i = 0; i < team.players.length; i++) {
          var p = state.players[team.players[i]];
          totalUnits += internalCountBoardUnits(p.board);
          totalGold += p.gold;
        }
        return {
          hp: team.hp,
          units: totalUnits,
          gold: totalGold,
          rand: internalSeededRandom(s),
        };
      };
      var aScore = internalTeamScore("alpha");
      s = internalAdvanceSeed(s);
      var bScore = internalTeamScore("beta");
      if (aScore.hp !== bScore.hp)
        winningTeam = aScore.hp > bScore.hp ? "alpha" : "beta";
      else if (aScore.units !== bScore.units)
        winningTeam = aScore.units > bScore.units ? "alpha" : "beta";
      else if (aScore.gold !== bScore.gold)
        winningTeam = aScore.gold > bScore.gold ? "alpha" : "beta";
      else winningTeam = aScore.rand > bScore.rand ? "alpha" : "beta";
    } else if (alphaDown) {
      winningTeam = "beta";
    } else if (betaDown) {
      winningTeam = "alpha";
    } else {
      // Round 10 timeout: higher team HP wins
      if (state.teams.alpha.hp !== state.teams.beta.hp) {
        winningTeam =
          state.teams.alpha.hp > state.teams.beta.hp ? "alpha" : "beta";
      } else {
        // Tie at round 10: same tiebreak
        var s2 = state.seed;
        var internalTs = function (tid) {
          var t = state.teams[tid];
          var tu = 0,
            tg = 0;
          for (var j = 0; j < t.players.length; j++) {
            var pp = state.players[t.players[j]];
            tu += internalCountBoardUnits(pp.board);
            tg += pp.gold;
          }
          return { units: tu, gold: tg, rand: internalSeededRandom(s2) };
        };
        var as2 = internalTs("alpha");
        s2 = internalAdvanceSeed(s2);
        var bs2 = internalTs("beta");
        if (as2.units !== bs2.units)
          winningTeam = as2.units > bs2.units ? "alpha" : "beta";
        else if (as2.gold !== bs2.gold)
          winningTeam = as2.gold > bs2.gold ? "alpha" : "beta";
        else winningTeam = as2.rand > bs2.rand ? "alpha" : "beta";
      }
    }

    return Object.assign({}, state, {
      phase: "gameOver",
      winningTeam: winningTeam,
    });
  }

  // Generate new shops for all players + reset gift flags
  var newPlayers = {};
  var newPool = Object.assign({}, state.pool);
  var seed = state.seed;
  var nextId = state.nextUnitId;
  var ids = state.playerIds;

  for (var i = 0; i < ids.length; i++) {
    var pid = ids[i];
    var p = state.players[pid];
    var income = internalCalcGoldIncome(newRound, p.streak, p.lastFightWon);
    var shopResult = internalGenerateShop(newPool, newRound, seed, nextId);
    seed = shopResult.newSeed;
    newPool = shopResult.newPool;
    nextId = shopResult.nextId;
    newPlayers[pid] = Object.assign({}, p, {
      gold: p.gold + income,
      shop: shopResult.shop,
      ready: false,
      giftedUnitThisRound: false,
      giftedGoldThisRound: false,
    });
  }

  return Object.assign({}, state, {
    phase: "shop",
    round: newRound,
    seed: seed,
    nextUnitId: nextId,
    players: newPlayers,
    pool: newPool,
    battleLog: [],
    battleResults: null,
  });
};

// === Shop Action Handlers ===

var internalHandleBuy = function (state, playerId, action) {
  var p = state.players[playerId];
  var shopUnit = p.shop[action.shopIndex];
  if (!shopUnit || p.gold < shopUnit.tier) return state;

  var newShop = p.shop.slice();
  newShop[action.shopIndex] = null;
  var newP = Object.assign({}, p, {
    shop: newShop,
    bench: p.bench.concat([shopUnit]),
    gold: p.gold - shopUnit.tier,
  });
  newP = internalCheckMerge(newP);
  return Object.assign({}, state, {
    players: Object.assign({}, state.players, { [playerId]: newP }),
  });
};

var internalHandleSell = function (state, playerId, action) {
  var p = state.players[playerId];
  var sellUnit = p.bench[action.benchIndex];
  if (!sellUnit) return state;
  var newBench = p.bench.slice();
  newBench.splice(action.benchIndex, 1);
  var newPool = Object.assign({}, state.pool);
  if (!sellUnit.star) {
    newPool[sellUnit.unitId] = (newPool[sellUnit.unitId] || 0) + 1;
  } else {
    // Star unit returns 3 copies
    newPool[sellUnit.unitId] = (newPool[sellUnit.unitId] || 0) + 3;
  }
  var newP = Object.assign({}, p, {
    bench: newBench,
    gold: p.gold + sellUnit.tier,
  });
  return Object.assign({}, state, {
    players: Object.assign({}, state.players, { [playerId]: newP }),
    pool: newPool,
  });
};

var internalHandleReroll = function (state, playerId) {
  var p = state.players[playerId];
  if (p.gold < 2) return state;
  var newPool = Object.assign({}, state.pool);
  for (var i = 0; i < p.shop.length; i++) {
    if (p.shop[i]) {
      newPool[p.shop[i].unitId] = (newPool[p.shop[i].unitId] || 0) + 1;
    }
  }
  var result = internalGenerateShop(
    newPool,
    state.round,
    state.seed,
    state.nextUnitId,
  );
  var newP = Object.assign({}, p, { shop: result.shop, gold: p.gold - 2 });
  return Object.assign({}, state, {
    players: Object.assign({}, state.players, { [playerId]: newP }),
    pool: result.newPool,
    seed: result.newSeed,
    nextUnitId: result.nextId,
  });
};

var internalHandleReady = function (state, playerId) {
  var p = state.players[playerId];
  var newP = Object.assign({}, p, { ready: true });
  var newState = Object.assign({}, state, {
    players: Object.assign({}, state.players, { [playerId]: newP }),
  });
  if (internalAllPlayersReady(newState)) {
    return Object.assign({}, internalResetReady(newState), { phase: "battle" });
  }
  return newState;
};

// === Place Action Handlers ===

var internalHandleBenchToBoard = function (state, playerId, action) {
  var p = state.players[playerId];
  var unit = p.bench[action.benchIndex];
  if (!unit || p.board[action.cell] !== null) return state;
  if (internalCountBoardUnits(p.board) >= 5) return state;
  var newBoard = p.board.slice();
  newBoard[action.cell] = unit;
  var newBench = p.bench.slice();
  newBench.splice(action.benchIndex, 1);
  var newP = Object.assign({}, p, { board: newBoard, bench: newBench });
  return Object.assign({}, state, {
    players: Object.assign({}, state.players, { [playerId]: newP }),
  });
};

var internalHandleBoardToBench = function (state, playerId, action) {
  var p = state.players[playerId];
  var unit = p.board[action.cell];
  if (!unit) return state;
  var newBoard = p.board.slice();
  newBoard[action.cell] = null;
  var newP = Object.assign({}, p, {
    board: newBoard,
    bench: p.bench.concat([unit]),
  });
  return Object.assign({}, state, {
    players: Object.assign({}, state.players, { [playerId]: newP }),
  });
};

var internalHandleBoardToBoard = function (state, playerId, action) {
  var p = state.players[playerId];
  if (p.board[action.toCell] !== null || !p.board[action.fromCell])
    return state;
  var newBoard = p.board.slice();
  newBoard[action.toCell] = newBoard[action.fromCell];
  newBoard[action.fromCell] = null;
  var newP = Object.assign({}, p, { board: newBoard });
  return Object.assign({}, state, {
    players: Object.assign({}, state.players, { [playerId]: newP }),
  });
};

// === Gift Handlers (2v2 only) ===

var internalGetTeammate = function (state, playerId) {
  var teamId = state.players[playerId].teamId;
  var team = state.teams[teamId];
  for (var i = 0; i < team.players.length; i++) {
    if (team.players[i] !== playerId) return team.players[i];
  }
  return null;
};

// Add unit to player's bench and run merge check (shared by buy + gift)
var internalAddUnitToBench = function (playerState, unit) {
  var newP = Object.assign({}, playerState, {
    bench: playerState.bench.concat([unit]),
  });
  return internalCheckMerge(newP);
};

var internalHandleGiftUnit = function (state, playerId, action) {
  if (state.mode !== "2v2") return state;
  var p = state.players[playerId];
  if (p.giftedUnitThisRound) return state;
  var unit = p.bench[action.benchIndex];
  if (!unit) return state;
  var teammateId = internalGetTeammate(state, playerId);
  if (!teammateId) return state;
  var tm = state.players[teammateId];
  // Check capacity: bench not full OR merge would trigger.
  // Star units can't merge further, so they never bypass the bench cap.
  var wouldMerge = false;
  if (!unit.star) {
    var copyCount = 0;
    for (var bi = 0; bi < 8; bi++) {
      if (
        tm.board[bi] &&
        tm.board[bi].unitId === unit.unitId &&
        !tm.board[bi].star
      )
        copyCount++;
    }
    for (var bj = 0; bj < tm.bench.length; bj++) {
      if (
        tm.bench[bj] &&
        tm.bench[bj].unitId === unit.unitId &&
        !tm.bench[bj].star
      )
        copyCount++;
    }
    wouldMerge = copyCount >= 2;
  }
  if (tm.bench.length >= 4 && !wouldMerge) return state;
  // Remove from sender bench
  var newSenderBench = p.bench.slice();
  newSenderBench.splice(action.benchIndex, 1);
  var newSender = Object.assign({}, p, {
    bench: newSenderBench,
    giftedUnitThisRound: true,
  });
  // Add to recipient bench + merge check
  var newRecipient = internalAddUnitToBench(tm, unit);
  var newPlayers = Object.assign({}, state.players);
  newPlayers[playerId] = newSender;
  newPlayers[teammateId] = newRecipient;
  return Object.assign({}, state, { players: newPlayers });
};

var internalHandleGiftGold = function (state, playerId) {
  if (state.mode !== "2v2") return state;
  var p = state.players[playerId];
  if (p.giftedGoldThisRound) return state;
  if (p.gold < 2) return state;
  var teammateId = internalGetTeammate(state, playerId);
  if (!teammateId) return state;
  var tm = state.players[teammateId];
  var newSender = Object.assign({}, p, {
    gold: p.gold - 2,
    giftedGoldThisRound: true,
  });
  var newRecipient = Object.assign({}, tm, { gold: tm.gold + 1 });
  var newPlayers = Object.assign({}, state.players);
  newPlayers[playerId] = newSender;
  newPlayers[teammateId] = newRecipient;
  return Object.assign({}, state, { players: newPlayers });
};

var internalActionLabel = function (state, playerId, action) {
  var player = state.players[playerId];
  var teammateId = player ? internalGetTeammate(state, playerId) : null;
  var teammateName = teammateId
    ? internalPlayerName(state, teammateId)
    : "your teammate";
  var unit;

  if (!action) return "Take no action";
  if (action.type === "buy") {
    unit = player && player.shop ? player.shop[action.shopIndex] : null;
    return (
      "Buy " +
      internalUnitText(unit) +
      " from shop slot " +
      (action.shopIndex + 1) +
      " for " +
      (unit ? unit.tier : "?") +
      " gold"
    );
  }
  if (action.type === "sell") {
    unit = player && player.bench ? player.bench[action.benchIndex] : null;
    return (
      "Sell " +
      internalUnitText(unit) +
      " from bench slot " +
      (action.benchIndex + 1) +
      " for " +
      (unit ? unit.tier : "?") +
      " gold"
    );
  }
  if (action.type === "reroll") return "Spend 2 gold to reroll the shop";
  if (action.type === "benchToBoard") {
    unit = player && player.bench ? player.bench[action.benchIndex] : null;
    return (
      "Move " +
      internalUnitText(unit) +
      " from bench slot " +
      (action.benchIndex + 1) +
      " to " +
      internalCellName(action.cell)
    );
  }
  if (action.type === "boardToBench") {
    unit = player && player.board ? player.board[action.cell] : null;
    return (
      "Move " +
      internalUnitText(unit) +
      " from " +
      internalCellName(action.cell) +
      " to the bench"
    );
  }
  if (action.type === "boardToBoard") {
    unit = player && player.board ? player.board[action.fromCell] : null;
    return (
      "Move " +
      internalUnitText(unit) +
      " from " +
      internalCellName(action.fromCell) +
      " to " +
      internalCellName(action.toCell)
    );
  }
  if (action.type === "giftUnit") {
    unit = player && player.bench ? player.bench[action.benchIndex] : null;
    return (
      "Gift " +
      internalUnitText(unit) +
      " from bench slot " +
      (action.benchIndex + 1) +
      " to " +
      teammateName
    );
  }
  if (action.type === "giftGold")
    return "Spend 2 gold to gift 1 gold to " + teammateName;
  if (action.type === "ready")
    return (
      "Lock in " +
      internalPlayerName(state, playerId) +
      "'s shop phase and start battle when everyone is ready"
    );
  if (action.type === "resolve")
    return "Resolve the round " + state.round + " battles";
  if (action.type === "continue") return "Continue to the next shop phase";
  return "Take action " + action.type;
};

var internalActionOption = function (state, playerId, action) {
  return {
    decision: action,
    label: internalActionLabel(state, playerId, action),
  };
};

// === Combat Engine (preserved from v2 — unchanged) ===

var internalResolveBattle = function (boardA, boardB, seed) {
  var unitsA = [],
    unitsB = [];
  for (var i = 0; i < 8; i++) {
    if (boardA[i]) {
      var ua = Object.assign({}, boardA[i], {
        pos: internalToUnified(i, "a"),
        side: "a",
        armor: 0,
        leaps: false,
        splashes: false,
      });
      unitsA.push(ua);
    }
    if (boardB[i]) {
      var ub = Object.assign({}, boardB[i], {
        pos: internalToUnified(i, "b"),
        side: "b",
        armor: 0,
        leaps: false,
        splashes: false,
      });
      unitsB.push(ub);
    }
  }

  if (unitsA.length === 0 && unitsB.length === 0)
    return {
      winner: null,
      rounds: 0,
      log: [],
      survivors: [],
      loserDamage: 1,
      seed: seed,
    };
  if (unitsA.length === 0)
    return {
      winner: "b",
      rounds: 0,
      log: [],
      survivors: unitsB,
      loserDamage: 0,
      seed: seed,
    };
  if (unitsB.length === 0)
    return {
      winner: "a",
      rounds: 0,
      log: [],
      survivors: unitsA,
      loserDamage: 0,
      seed: seed,
    };

  var traitsA = {},
    traitsB = {};
  for (var ta = 0; ta < unitsA.length; ta++)
    traitsA[unitsA[ta].trait] = (traitsA[unitsA[ta].trait] || 0) + 1;
  for (var tb = 0; tb < unitsB.length; tb++)
    traitsB[unitsB[tb].trait] = (traitsB[unitsB[tb].trait] || 0) + 1;

  internalApplyTraits(unitsA, traitsA);
  internalApplyTraits(unitsB, traitsB);

  var s = seed;
  var log = [];
  for (var la = 0; la < unitsA.length; la++) {
    if (unitsA[la].leaps) {
      var origRowA = unitsA[la].pos.row;
      var emptyBack = [];
      for (var c = 0; c < 4; c++) {
        var occupied = false;
        for (var check = 0; check < unitsB.length; check++) {
          if (unitsB[check].pos.row === 3 && unitsB[check].pos.col === c) {
            occupied = true;
            break;
          }
        }
        for (var checkA = 0; checkA < unitsA.length; checkA++) {
          if (unitsA[checkA].pos.row === 3 && unitsA[checkA].pos.col === c) {
            occupied = true;
            break;
          }
        }
        if (!occupied) emptyBack.push(c);
      }
      if (emptyBack.length > 0) {
        var pick = internalPickRandom(emptyBack, s);
        s = pick.newSeed;
        unitsA[la].pos = { row: 3, col: pick.picked };
        log.push({
          type: "leap",
          unitId: unitsA[la].id,
          fromRow: origRowA,
          toRow: 3,
          round: 0,
        });
      }
    }
  }
  for (var lb = 0; lb < unitsB.length; lb++) {
    if (unitsB[lb].leaps) {
      var origRowB = unitsB[lb].pos.row;
      var emptyBackB = [];
      for (var c2 = 0; c2 < 4; c2++) {
        var occ = false;
        for (var chk = 0; chk < unitsA.length; chk++) {
          if (unitsA[chk].pos.row === 0 && unitsA[chk].pos.col === c2) {
            occ = true;
            break;
          }
        }
        for (var chkB = 0; chkB < unitsB.length; chkB++) {
          if (unitsB[chkB].pos.row === 0 && unitsB[chkB].pos.col === c2) {
            occ = true;
            break;
          }
        }
        if (!occ) emptyBackB.push(c2);
      }
      if (emptyBackB.length > 0) {
        var pickB = internalPickRandom(emptyBackB, s);
        s = pickB.newSeed;
        unitsB[lb].pos = { row: 0, col: pickB.picked };
        log.push({
          type: "leap",
          unitId: unitsB[lb].id,
          fromRow: origRowB,
          toRow: 0,
          round: 0,
        });
      }
    }
  }

  var hasHealerA = (traitsA.healer || 0) >= 2;
  var hasHealerB = (traitsB.healer || 0) >= 2;

  var combatRounds = 0;
  for (var round = 0; round < 15; round++) {
    if (unitsA.length === 0 || unitsB.length === 0) break;
    combatRounds = round + 1;

    if (hasHealerA && unitsA.length > 0) {
      var lowestA = unitsA[0];
      for (var ha = 1; ha < unitsA.length; ha++) {
        if (unitsA[ha].hp < lowestA.hp) lowestA = unitsA[ha];
      }
      var healA = Math.min(3, lowestA.maxHp - lowestA.hp);
      if (healA > 0) {
        lowestA.hp += healA;
        log.push({
          type: "heal",
          unitId: lowestA.id,
          amount: healA,
          round: round,
        });
      }
    }
    if (hasHealerB && unitsB.length > 0) {
      var lowestB = unitsB[0];
      for (var hb = 1; hb < unitsB.length; hb++) {
        if (unitsB[hb].hp < lowestB.hp) lowestB = unitsB[hb];
      }
      var healB = Math.min(3, lowestB.maxHp - lowestB.hp);
      if (healB > 0) {
        lowestB.hp += healB;
        log.push({
          type: "heal",
          unitId: lowestB.id,
          amount: healB,
          round: round,
        });
      }
    }

    var damageMap = {};

    var internalFindTarget = function (attacker, enemies) {
      var best = null,
        bestDist = 999;
      for (var enemyIndex = 0; enemyIndex < enemies.length; enemyIndex++) {
        var d = internalUnifiedDist(attacker.pos, enemies[enemyIndex].pos);
        if (
          d < bestDist ||
          (d === bestDist &&
            best !== null &&
            enemies[enemyIndex].pos.col < best.pos.col)
        ) {
          bestDist = d;
          best = enemies[enemyIndex];
        }
      }
      return best;
    };

    for (var ai = 0; ai < unitsA.length; ai++) {
      var att = unitsA[ai];
      var tgt = internalFindTarget(att, unitsB);
      if (!tgt) continue;
      var dmg = att.atk;
      if (att.leaps && round === 0) dmg = Math.ceil(att.atk * 1.5);
      if (tgt.armor) dmg = Math.max(dmg - tgt.armor, 1);
      damageMap[tgt.id] = (damageMap[tgt.id] || 0) + dmg;
      log.push({
        type: "attack",
        attackerId: att.id,
        targetId: tgt.id,
        damage: dmg,
        round: round,
      });

      if (att.splashes) {
        for (var si = 0; si < unitsB.length; si++) {
          var su = unitsB[si];
          if (
            su.id !== tgt.id &&
            su.pos.row === tgt.pos.row &&
            Math.abs(su.pos.col - tgt.pos.col) === 1
          ) {
            damageMap[su.id] = (damageMap[su.id] || 0) + 2;
            log.push({
              type: "splash",
              attackerId: att.id,
              targetId: su.id,
              damage: 2,
              round: round,
            });
          }
        }
      }
    }

    for (var bi2 = 0; bi2 < unitsB.length; bi2++) {
      var attB = unitsB[bi2];
      var tgtA = internalFindTarget(attB, unitsA);
      if (!tgtA) continue;
      var dmgB = attB.atk;
      if (attB.leaps && round === 0) dmgB = Math.ceil(attB.atk * 1.5);
      if (tgtA.armor) dmgB = Math.max(dmgB - tgtA.armor, 1);
      damageMap[tgtA.id] = (damageMap[tgtA.id] || 0) + dmgB;
      log.push({
        type: "attack",
        attackerId: attB.id,
        targetId: tgtA.id,
        damage: dmgB,
        round: round,
      });

      if (attB.splashes) {
        for (var si2 = 0; si2 < unitsA.length; si2++) {
          var suA = unitsA[si2];
          if (
            suA.id !== tgtA.id &&
            suA.pos.row === tgtA.pos.row &&
            Math.abs(suA.pos.col - tgtA.pos.col) === 1
          ) {
            damageMap[suA.id] = (damageMap[suA.id] || 0) + 2;
            log.push({
              type: "splash",
              attackerId: attB.id,
              targetId: suA.id,
              damage: 2,
              round: round,
            });
          }
        }
      }
    }

    var allUnits = unitsA.concat(unitsB);
    for (var di = 0; di < allUnits.length; di++) {
      if (damageMap[allUnits[di].id])
        allUnits[di].hp -= damageMap[allUnits[di].id];
    }
    unitsA = unitsA.filter(function (u) {
      return u.hp > 0;
    });
    unitsB = unitsB.filter(function (u) {
      return u.hp > 0;
    });
  }

  var winner = null;
  if (unitsA.length > 0 && unitsB.length === 0) winner = "a";
  else if (unitsB.length > 0 && unitsA.length === 0) winner = "b";
  else if (unitsA.length > 0 && unitsB.length > 0) {
    var hpA = 0,
      hpB = 0;
    for (var h1 = 0; h1 < unitsA.length; h1++) hpA += unitsA[h1].hp;
    for (var h2 = 0; h2 < unitsB.length; h2++) hpB += unitsB[h2].hp;
    if (hpA > hpB) winner = "a";
    else if (hpB > hpA) winner = "b";
  }

  var survivors = winner === "a" ? unitsA : winner === "b" ? unitsB : [];
  var loserDmg = 0;
  for (var ld = 0; ld < survivors.length; ld++) loserDmg += survivors[ld].tier;

  return {
    winner: winner,
    rounds: combatRounds,
    log: log,
    survivors: survivors,
    loserDamage: loserDmg,
    seed: s,
  };
};

// === GameLogic (1v1 + 2v2) ===
//
// 2 players = 1v1: each player is a solo team with 50 HP.
// 4 players = 2v2: two teams of 2, shared 50 HP per team.
//   Fixed lanes: alpha[0] vs beta[0], alpha[1] vs beta[1].
//   Gift unit + gift gold available in 2v2 only.
// 3 players = rejected (gameOver immediately).

var GameLogic = {
  rules: {
    visibility: "viewer-specific",
    spectator: "god-view",
    seats: { eliminated: "player-view", disconnected: "player-view" },
  },

  setup: function (ctx) {
    var ids = ctx.players.map(function (p) {
      return p.id;
    });
    var playerNames = {};
    for (var ni = 0; ni < ctx.players.length; ni++) {
      playerNames[ctx.players[ni].id] =
        ctx.players[ni].name || ctx.players[ni].id;
    }

    // Reject invalid player counts (only 2 or 4 allowed)
    if (ids.length !== 2 && ids.length !== 4) {
      var stubPlayers = {};
      for (var si = 0; si < ids.length; si++) {
        stubPlayers[ids[si]] = {
          gold: 0,
          board: [null, null, null, null, null, null, null, null],
          bench: [],
          shop: [],
          ready: true,
          streak: 0,
          lastFightWon: null,
          teamId: "alpha",
          giftedUnitThisRound: false,
          giftedGoldThisRound: false,
        };
      }
      return {
        phase: "gameOver",
        round: 0,
        seed: 0,
        nextUnitId: 0,
        players: stubPlayers,
        pool: {},
        playerIds: ids,
        mode: "invalid",
        teams: { alpha: { hp: 0, players: ids }, beta: { hp: 0, players: [] } },
        matchups: [],
        battleLog: [],
        battleResults: null,
        playerNames: playerNames,
        winningTeam: null,
      };
    }

    var mode = ids.length === 2 ? "1v1" : "2v2";
    var seed = Math.floor(ctx.random.next() * 2147483647);
    var pool = internalInitPool(ids.length);
    var nextId = 0;

    // Build teams
    // 1v1: alpha=[p0], beta=[p1]
    // 2v2: alpha=[p0,p1], beta=[p2,p3]
    var teams;
    if (mode === "1v1") {
      teams = {
        alpha: { hp: 50, players: [ids[0]] },
        beta: { hp: 50, players: [ids[1]] },
      };
    } else {
      teams = {
        alpha: { hp: 50, players: [ids[0], ids[1]] },
        beta: { hp: 50, players: [ids[2], ids[3]] },
      };
    }

    var players = {};
    for (var i = 0; i < ids.length; i++) {
      var shopResult = internalGenerateShop(pool, 1, seed, nextId);
      seed = shopResult.newSeed;
      pool = shopResult.newPool;
      nextId = shopResult.nextId;

      // Determine which team this player belongs to
      var teamId = "beta";
      for (var ai = 0; ai < teams.alpha.players.length; ai++) {
        if (teams.alpha.players[ai] === ids[i]) {
          teamId = "alpha";
          break;
        }
      }

      players[ids[i]] = {
        gold: 4,
        board: [null, null, null, null, null, null, null, null],
        bench: [],
        shop: shopResult.shop,
        ready: false,
        streak: 0,
        lastFightWon: null,
        teamId: teamId,
        giftedUnitThisRound: false,
        giftedGoldThisRound: false,
      };
    }

    var matchups = internalBuildFixedMatchups(teams);

    return {
      phase: "shop",
      round: 1,
      seed: seed,
      nextUnitId: nextId,
      players: players,
      pool: pool,
      playerIds: ids,
      mode: mode,
      teams: teams,
      matchups: matchups,
      battleLog: [],
      battleResults: null,
      playerNames: playerNames,
      winningTeam: null,
    };
  },

  actions: function (state, playerId) {
    if (state.phase === "gameOver") return [];
    if (state.phase === "battle" || state.phase === "battleResult") return [];
    if (!state.players[playerId]) return [];
    var p = state.players[playerId];
    if (p.ready) return [];

    var results = [];
    var boardCount = internalCountBoardUnits(p.board);
    var totalUnits = boardCount + p.bench.length;
    var benchFull = p.bench.length >= 4;

    if (state.phase === "shop") {
      // Buy from shop
      for (var i = 0; i < p.shop.length; i++) {
        if (p.shop[i] && p.gold >= p.shop[i].tier) {
          var copyCount = 0;
          for (var bi = 0; bi < 8; bi++) {
            if (
              p.board[bi] &&
              p.board[bi].unitId === p.shop[i].unitId &&
              !p.board[bi].star
            )
              copyCount++;
          }
          for (var bj = 0; bj < p.bench.length; bj++) {
            if (
              p.bench[bj] &&
              p.bench[bj].unitId === p.shop[i].unitId &&
              !p.bench[bj].star
            )
              copyCount++;
          }
          var wouldMerge = copyCount >= 2;
          if ((!benchFull || wouldMerge) && totalUnits < 9) {
            results.push({ type: "buy", shopIndex: i });
          }
        }
      }
      // Sell from bench
      for (var si = 0; si < p.bench.length; si++) {
        results.push({ type: "sell", benchIndex: si });
      }
      // Reroll (costs 2g)
      if (p.gold >= 2) results.push({ type: "reroll" });
      // Place units
      if (boardCount < 5) {
        for (var pbi = 0; pbi < p.bench.length; pbi++) {
          for (var ci = 0; ci < 8; ci++) {
            if (!p.board[ci])
              results.push({ type: "benchToBoard", benchIndex: pbi, cell: ci });
          }
        }
      }
      for (var bti = 0; bti < 8; bti++) {
        if (p.board[bti]) results.push({ type: "boardToBench", cell: bti });
      }
      for (var fi = 0; fi < 8; fi++) {
        if (p.board[fi]) {
          for (var ti = 0; ti < 8; ti++) {
            if (fi !== ti && !p.board[ti])
              results.push({ type: "boardToBoard", fromCell: fi, toCell: ti });
          }
        }
      }

      // Gift actions (2v2 only)
      if (state.mode === "2v2") {
        var teammateId = internalGetTeammate(state, playerId);
        if (teammateId) {
          var tm = state.players[teammateId];
          // Gift unit: if not gifted this round, have bench units, teammate can receive
          if (!p.giftedUnitThisRound && p.bench.length > 0) {
            for (var gi = 0; gi < p.bench.length; gi++) {
              // Check if teammate can receive (bench not full OR non-star merge triggers)
              var gUnit = p.bench[gi];
              var gWouldMerge = false;
              if (!gUnit.star) {
                var gCopies = 0;
                for (var gbi = 0; gbi < 8; gbi++) {
                  if (
                    tm.board[gbi] &&
                    tm.board[gbi].unitId === gUnit.unitId &&
                    !tm.board[gbi].star
                  )
                    gCopies++;
                }
                for (var gbj = 0; gbj < tm.bench.length; gbj++) {
                  if (
                    tm.bench[gbj] &&
                    tm.bench[gbj].unitId === gUnit.unitId &&
                    !tm.bench[gbj].star
                  )
                    gCopies++;
                }
                gWouldMerge = gCopies >= 2;
              }
              if (tm.bench.length < 4 || gWouldMerge) {
                results.push({ type: "giftUnit", benchIndex: gi });
              }
            }
          }
          // Gift gold: costs 2g, gives teammate 1g, once per round
          if (!p.giftedGoldThisRound && p.gold >= 2) {
            results.push({ type: "giftGold" });
          }
        }
      }

      results.push({ type: "ready" });
    }

    return results;
  },

  apply: function (state, playerId, action) {
    action = internalDecisionOf(action);
    if (!action) return state;

    // === System actions FIRST (CRITICAL: before any player guard) ===
    if (playerId === "__system__") {
      if (action.type === "ready") {
        // System timeout: ready all players
        var readyAll = {};
        var ids = state.playerIds;
        for (var i = 0; i < ids.length; i++) {
          readyAll[ids[i]] = Object.assign({}, state.players[ids[i]], {
            ready: true,
          });
        }
        var sysState = Object.assign({}, state, { players: readyAll });
        if (state.phase === "shop")
          return Object.assign({}, internalResetReady(sysState), {
            phase: "battle",
          });
        return sysState;
      }
      if (action.type === "resolve")
        return GameLogic.internalResolveRound(state);
      if (action.type === "continue") return internalAdvanceToShop(state);
      if (action.type === "player_left") return state;
      return state;
    }

    // === Player actions ===
    if (!state.players[playerId]) return state;
    var p = state.players[playerId];
    if (p.ready) return state;

    if (state.phase === "shop") {
      if (action.type === "buy")
        return internalHandleBuy(state, playerId, action);
      if (action.type === "sell")
        return internalHandleSell(state, playerId, action);
      if (action.type === "reroll")
        return internalHandleReroll(state, playerId);
      if (action.type === "benchToBoard")
        return internalHandleBenchToBoard(state, playerId, action);
      if (action.type === "boardToBench")
        return internalHandleBoardToBench(state, playerId, action);
      if (action.type === "boardToBoard")
        return internalHandleBoardToBoard(state, playerId, action);
      if (action.type === "giftUnit")
        return internalHandleGiftUnit(state, playerId, action);
      if (action.type === "giftGold")
        return internalHandleGiftGold(state, playerId);
      if (action.type === "ready") return internalHandleReady(state, playerId);
    }
    return state;
  },

  internalResolveRound: function (state) {
    var result = internalResolveRound(state);

    return Object.assign({}, state, {
      phase: "battleResult",
      players: result.players,
      teams: result.teams,
      seed: result.seed,
      battleResults: result.results,
      battleLog: result.battleLog,
    });
  },

  view: function (state, playerId) {
    var ids = state.playerIds;
    var isPlayer = playerId && state.players[playerId];
    var myPlayer = isPlayer ? state.players[playerId] : null;

    // Active traits only for boards visible to this viewer.
    var activeTraits = {};

    // Spectator follows first alpha player
    var spectateId = null;
    if (!isPlayer && ids.length > 0) {
      spectateId = ids[0];
    }

    // Determine myMatchup
    var myMatchup = null;
    var viewId = isPlayer ? playerId : spectateId;
    if (viewId) {
      for (var mi = 0; mi < state.matchups.length; mi++) {
        if (state.matchups[mi][0] === viewId) {
          myMatchup = state.matchups[mi][1];
          break;
        }
        if (state.matchups[mi][1] === viewId) {
          myMatchup = state.matchups[mi][0];
          break;
        }
      }
    }

    // Build per-viewer battle result (own fight only)
    var myBattleResult = null;
    if (state.battleResults && viewId && state.battleResults[viewId]) {
      var br = state.battleResults[viewId];
      var brWon =
        (br.side === "a" && br.result.winner === "a") ||
        (br.side === "b" && br.result.winner === "b");
      var brLost =
        (br.side === "a" && br.result.winner === "b") ||
        (br.side === "b" && br.result.winner === "a");
      var brDmg = 0;
      if (brLost && br.result.survivors) {
        brDmg = internalCalcDamage(state.round, br.result.survivors);
      }
      myBattleResult = {
        opponent: br.opponent,
        won: brWon,
        lost: brLost,
        draw: br.result.winner === null,
        damage: brDmg,
        rounds: br.result.rounds,
      };
    }

    var base = {
      phase: state.phase,
      round: state.round,
      mode: state.mode,
      teams: {
        alpha: { hp: state.teams.alpha.hp, players: state.teams.alpha.players },
        beta: { hp: state.teams.beta.hp, players: state.teams.beta.players },
      },
      matchups: state.matchups,
      battleLog: state.battleLog,
      battleResult: myBattleResult,
      activeTraits: activeTraits,
      playerIds: ids,
      myMatchup: myMatchup,
      winningTeam: state.winningTeam,
    };

    var playersView = {};
    for (var pi = 0; pi < ids.length; pi++) {
      var pid = ids[pi];
      var p = state.players[pid];
      var pv = {
        teamId: p.teamId,
        streak: p.streak,
      };

      // Board visibility: show your own + teammate always.
      // Opponents: hidden during shop, visible during battle/battleResult/gameOver.
      var isTeammate = isPlayer && myPlayer && p.teamId === myPlayer.teamId;
      var showBoard = !isPlayer || isTeammate || state.phase !== "shop";
      if (showBoard) {
        pv.board = p.board;
        activeTraits[pid] = internalGetTraitCounts(p.board);
      }

      if (pid === playerId) {
        // Own data: full visibility
        pv.bench = p.bench;
        pv.gold = p.gold;
        pv.shop = p.shop;
        pv.ready = p.ready;
        pv.giftedUnitThisRound = p.giftedUnitThisRound;
        pv.giftedGoldThisRound = p.giftedGoldThisRound;
      } else if (isTeammate) {
        // Teammate: show bench during shop (for gift decisions)
        pv.bench = p.bench;
        pv.gold = p.gold;
        pv.ready = p.ready;
      } else if (!isPlayer) {
        // Spectator: see all boards, followed player gets full data
        pv.board = p.board;
        if (pid === spectateId) {
          pv.bench = p.bench;
          pv.gold = p.gold;
          pv.shop = p.shop;
          pv.ready = p.ready;
        }
      }

      playersView[pid] = pv;
    }
    base.players = playersView;
    base.playerNames = state.playerNames;
    return base;
  },

  outcome: function (state) {
    if (state.phase !== "gameOver") return null;

    // Winners = all players on winning team
    var winners = [];
    if (state.winningTeam && state.teams[state.winningTeam]) {
      winners = state.teams[state.winningTeam].players.slice();
    }

    var losingTeam = state.winningTeam === "alpha" ? "beta" : "alpha";
    var summary = state.winningTeam
      ? "Team " +
        state.winningTeam +
        " wins! (" +
        state.teams[state.winningTeam].hp +
        " HP vs " +
        state.teams[losingTeam].hp +
        " HP)"
      : "Game over!";

    return {
      type: winners.length > 0 ? "winners" : "draw",
      playerIds: winners,
      summary: summary,
    };
  },

  internalAgentUnitText: function (unit) {
    if (!unit) return ".";
    return (
      unit.name +
      (unit.star ? "*" : "") +
      "(T" +
      unit.tier +
      " " +
      unit.trait +
      " " +
      unit.atk +
      "/" +
      unit.hp +
      ")"
    );
  },

  internalAgentUnitList: function (units) {
    if (!units || units.length === 0) return "empty";
    var parts = [];
    for (var i = 0; i < units.length; i++)
      parts.push(i + ":" + this.internalAgentUnitText(units[i]));
    return parts.join(", ");
  },

  internalAgentBoardText: function (board) {
    if (!board) return "hidden";
    var front = [];
    var back = [];
    for (var i = 0; i < 4; i++)
      front.push(i + ":" + this.internalAgentUnitText(board[i]));
    for (var j = 4; j < 8; j++)
      back.push(j + ":" + this.internalAgentUnitText(board[j]));
    return "front[" + front.join(", ") + "] back[" + back.join(", ") + "]";
  },

  agentView: function (state, playerId, view) {
    var rows = [];
    var ids = state.playerIds;
    var alphaNames = state.teams.alpha.players.map(function (pid) {
      return internalPlayerName(state, pid);
    });
    var betaNames = state.teams.beta.players.map(function (pid) {
      return internalPlayerName(state, pid);
    });
    rows.push(
      "Phase: " +
        state.phase +
        " | Round: " +
        state.round +
        " | Mode: " +
        state.mode,
    );
    rows.push(
      "Teams: alpha HP " +
        state.teams.alpha.hp +
        " (" +
        alphaNames.join(", ") +
        ") vs beta HP " +
        state.teams.beta.hp +
        " (" +
        betaNames.join(", ") +
        ")",
    );
    if (view.myMatchup)
      rows.push(
        "Your lane opponent: " + internalPlayerName(state, view.myMatchup),
      );
    for (var i = 0; i < ids.length; i++) {
      var pid = ids[i];
      var pv = view.players[pid] || {};
      var label = state.playerNames[pid] || pid;
      rows.push(
        label +
          " team=" +
          pv.teamId +
          " streak=" +
          pv.streak +
          (pv.ready ? " ready" : ""),
      );
      if (pv.gold !== undefined) rows.push("  gold=" + pv.gold);
      if (pv.shop) rows.push("  shop: " + this.internalAgentUnitList(pv.shop));
      if (pv.bench)
        rows.push("  bench: " + this.internalAgentUnitList(pv.bench));
      rows.push("  board: " + this.internalAgentBoardText(pv.board));
      if (pv.board && view.activeTraits?.[pid])
        rows.push("  traits: " + JSON.stringify(view.activeTraits[pid]));
    }
    if (view.battleResult)
      rows.push("Battle result: " + JSON.stringify(view.battleResult));
    if (view.battleLog?.length)
      rows.push(
        "Recent battle: " +
          view.battleLog
            .slice(Math.max(0, view.battleLog.length - 6))
            .join(" | "),
      );
    return rows.join("\n");
  },

  project: function (state, playerId) {
    var view = GameLogic.view(state, playerId);
    return {
      view: view,
      agentView: GameLogic.agentView(state, playerId, view),
    };
  },

  opportunities: function (state, actorId) {
    var rawActions;
    var options;
    var prompt;
    var chatChannels;
    var opportunity;

    if (state.phase === "gameOver") return [];

    if (actorId === "__system__") {
      if (state.phase === "battle") {
        return [
          {
            id: "resolve-battle",
            kind: "system",
            prompt:
              "Resolve the automatic combat for round " + state.round + ".",
            deadline: {
              id: "battle:" + state.round,
              timeoutMs: 2000,
              onExpire: { type: "resolve" },
            },
            decision: {
              type: "choose",
              options: [
                internalActionOption(state, state.playerIds[0], {
                  type: "resolve",
                }),
              ],
            },
          },
        ];
      }
      if (state.phase === "battleResult") {
        return [
          {
            id: "continue-shop",
            kind: "system",
            prompt: "Advance from battle results to the next shop phase.",
            deadline: {
              id: "battleResult:" + state.round,
              timeoutMs: 8000,
              onExpire: { type: "continue" },
            },
            decision: {
              type: "choose",
              options: [
                internalActionOption(state, state.playerIds[0], {
                  type: "continue",
                }),
              ],
            },
          },
        ];
      }
      return [];
    }

    if (!state.players[actorId]) return [];
    chatChannels =
      state.eliminated &&
      state.eliminated.indexOf &&
      state.eliminated.indexOf(actorId) !== -1
        ? ["eliminated"]
        : ["room", "whisper", "spectator"];
    if (state.phase !== "shop" || state.players[actorId].ready) {
      return chatChannels.map(function (channel) {
        return {
          id: "chat:" + channel,
          kind: "chat",
          prompt:
            channel === "eliminated"
              ? "Chat with eliminated players."
              : "Chat in " + channel + ".",
          decision: { type: "none" },
          chat: {
            channels: [channel],
            defaultChannel: channel,
            canSend: true,
            memberships: channel === "eliminated" ? ["eliminated"] : [],
          },
          submitPolicy: "multiple",
        };
      });
    }
    rawActions = GameLogic.actions(state, actorId);
    if (rawActions.length === 0) {
      return chatChannels.map(function (channel) {
        return {
          id: "chat:" + channel,
          kind: "chat",
          prompt:
            channel === "eliminated"
              ? "Chat with eliminated players."
              : "Chat in " + channel + ".",
          decision: { type: "none" },
          chat: {
            channels: [channel],
            defaultChannel: channel,
            canSend: true,
            memberships: channel === "eliminated" ? ["eliminated"] : [],
          },
          submitPolicy: "multiple",
        };
      });
    }
    options = rawActions.map(function (action) {
      return internalActionOption(state, actorId, action);
    });
    prompt =
      internalPlayerName(state, actorId) +
      ", manage your shop, position your board, or ready up for round " +
      state.round +
      ".";
    /** @type {Object} */
    opportunity = {
      id: "shop:" + actorId,
      kind: "turn",
      prompt: prompt,
      deadline: {
        id: "shop:" + state.round + ":" + actorId,
        timeoutMs: 120000,
        onExpire: { type: "ready" },
      },
      decision: { type: "choose", options: options },
      chat: {
        channels: chatChannels,
        defaultChannel: chatChannels[0] || null,
        canSend: true,
        memberships: chatChannels[0] === "eliminated" ? ["eliminated"] : [],
      },
    };
    return /** @type {Object[]} */ ([opportunity]).concat(
      chatChannels.slice(1).map(function (channel) {
        return {
          id: "chat:" + channel,
          kind: "chat",
          prompt: "Chat in " + channel + ".",
          decision: { type: "none" },
          chat: {
            channels: [channel],
            defaultChannel: channel,
            canSend: true,
            memberships: channel === "eliminated" ? ["eliminated"] : [],
          },
          submitPolicy: "multiple",
        };
      }),
    );
  },

  validate: function () {
    return { ok: true };
  },
};
export default GameLogic;
