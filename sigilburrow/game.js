var GameLogic = {
  rules: {
    visibility: "viewer-specific",
    spectator: "god-view",
    seats: { eliminated: "player-view", disconnected: "player-view" }
  },

  internalConstants: {
    maxRounds: 6,
    startPopulation: 5,
    startMorale: 3,
    scrollMaxChars: 240,
    bfMaxSteps: 6000,
    bfMaxOutput: 64,
    bfTapeSize: 32
  },

  internalDirectiveNames: [
    "Dig",
    "Plant",
    "Harvest",
    "Build",
    "Forge",
    "Scout",
    "Pray",
    "Sleep"
  ],

  internalStockpileFields: [
    "stone",
    "grain",
    "wall",
    "weapon",
    "intel",
    "stamina"
  ],

  internalBiomes: [
    {
      name: "Hailspire Bluff",
      threatName: "Frostgale",
      directiveIdx: 3,
      directiveName: "Build",
      threshold: 3,
      blurb: "Frost shears the cliff. Walls or nothing.",
      tideHints: [200, 17, 220, 9, 41],
      boons: [
        { id: "ice-lens", label: "Ice lens — +3 wall", apply: { wall: 3 } },
        { id: "glacial-cache", label: "Glacial cache — +4 stone", apply: { stone: 4 } },
        { id: "frost-bound-monk", label: "Frost-bound monk — +1 population", apply: { population: 1 } }
      ]
    },
    {
      name: "Cinder Fen",
      threatName: "Wretchhowl",
      directiveIdx: 4,
      directiveName: "Forge",
      threshold: 3,
      blurb: "Ashlings hunt the fen. Iron answers.",
      tideHints: [12, 99, 7, 220, 33],
      boons: [
        { id: "ember-haft", label: "Ember haft — +3 weapon", apply: { weapon: 3 } },
        { id: "red-iron", label: "Red iron seam — +5 stone", apply: { stone: 5 } },
        { id: "war-hymn", label: "War hymn — +2 morale, +2 score", apply: { morale: 2, score: 2 } }
      ]
    },
    {
      name: "Spore Hollow",
      threatName: "Locustcloud",
      directiveIdx: 2,
      directiveName: "Harvest",
      threshold: 3,
      blurb: "Spore-locusts strip the racks. Harvest first or lose stores.",
      tideHints: [80, 4, 250, 60, 15],
      boons: [
        { id: "glow-truffle", label: "Glow truffle — +4 grain", apply: { grain: 4 } },
        { id: "spore-mask", label: "Spore mask — shrug off next penalty", apply: { shield: 1 } },
        { id: "mycelium-cap", label: "Mycelium cap — +2 score", apply: { score: 2 } }
      ]
    },
    {
      name: "Static Reef",
      threatName: "Plaguemist",
      directiveIdx: 6,
      directiveName: "Pray",
      threshold: 3,
      blurb: "Reef hums with sick light. Chant or sicken.",
      tideHints: [50, 100, 50, 100, 200],
      boons: [
        { id: "signal-coral", label: "Signal coral — +3 morale", apply: { morale: 3 } },
        { id: "tidewatch", label: "Tidewatch — +2 intel", apply: { intel: 2 } },
        { id: "brine-censer", label: "Brine censer — +2 score", apply: { score: 2 } }
      ]
    },
    {
      name: "Saltglass Rim",
      threatName: "Quakespite",
      directiveIdx: 0,
      directiveName: "Dig",
      threshold: 3,
      blurb: "The rim cracks. Sink shafts or be swallowed.",
      tideHints: [3, 30, 90, 11, 64],
      boons: [
        { id: "shard-quarry", label: "Shard quarry — +5 stone", apply: { stone: 5 } },
        { id: "bedrock-pact", label: "Bedrock pact — shield against next threat", apply: { shield: 1 } },
        { id: "salt-sextant", label: "Salt sextant — +1 intel, +1 score", apply: { intel: 1, score: 1 } }
      ]
    },
    {
      name: "Ember Peak",
      threatName: "Famine Drought",
      directiveIdx: 1,
      directiveName: "Plant",
      threshold: 3,
      blurb: "Soil cracks under volcanic sun. Plant in cracks or starve.",
      tideHints: [22, 8, 130, 44, 7],
      boons: [
        { id: "terrace-seed", label: "Terrace seed — +4 grain", apply: { grain: 4 } },
        { id: "heat-shroud", label: "Heat shroud — +3 morale", apply: { morale: 3 } },
        { id: "eternal-forge", label: "Eternal forge — +2 weapon, +2 score", apply: { weapon: 2, score: 2 } }
      ]
    }
  ],

  internalIsPrime: function (n) {
    if (n < 2) return false;
    if (n < 4) return true;
    if (n % 2 === 0) return false;
    var i;
    for (i = 3; i * i <= n; i += 2) {
      if (n % i === 0) return false;
    }
    return true;
  },

  internalLcg: function (seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s;
    };
  },

  internalHashString: function (str) {
    var h = 2166136261;
    var i;
    for (i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  },

  internalMakeBoonSeed: function (chaosOrb, round, playerId) {
    var key = chaosOrb + ":" + round + ":" + playerId;
    return this.internalHashString(key);
  },

  internalPickBoon: function (boons, chaosOrb, round, playerId) {
    var seed = this.internalMakeBoonSeed(chaosOrb, round, playerId);
    var rnd = this.internalLcg(seed);
    var pick = boons[rnd() % boons.length];
    return pick;
  },

  internalRunScroll: function (program, tide) {
    var C = this.internalConstants;
    var tape = [];
    var i;
    for (i = 0; i < C.bfTapeSize; i++) tape.push(0);
    var dataPtr = 0;
    var pc = 0;
    var inputPos = 0;
    var output = [];
    var steps = 0;
    var brackets = {};
    var stack = [];
    for (i = 0; i < program.length; i++) {
      if (program.charAt(i) === "[") {
        stack.push(i);
      } else if (program.charAt(i) === "]") {
        if (stack.length === 0) {
          return {
            output: [],
            steps: 0,
            halted: false,
            error: "unmatched ]"
          };
        }
        var open = stack.pop();
        brackets[open] = i;
        brackets[i] = open;
      }
    }
    if (stack.length > 0) {
      return { output: [], steps: 0, halted: false, error: "unmatched [" };
    }
    while (pc < program.length && steps < C.bfMaxSteps) {
      var op = program.charAt(pc);
      if (op === ">") dataPtr = (dataPtr + 1) % C.bfTapeSize;
      else if (op === "<") dataPtr = (dataPtr - 1 + C.bfTapeSize) % C.bfTapeSize;
      else if (op === "+") tape[dataPtr] = (tape[dataPtr] + 1) & 0xff;
      else if (op === "-") tape[dataPtr] = (tape[dataPtr] - 1 + 256) & 0xff;
      else if (op === ".") {
        if (output.length < C.bfMaxOutput) output.push(tape[dataPtr]);
      } else if (op === ",") {
        tape[dataPtr] = inputPos < tide.length ? tide[inputPos++] & 0xff : 0;
      } else if (op === "[") {
        if (tape[dataPtr] === 0) pc = brackets[pc];
      } else if (op === "]") {
        if (tape[dataPtr] !== 0) pc = brackets[pc];
      }
      pc++;
      steps++;
    }
    return {
      output: output,
      steps: steps,
      halted: pc >= program.length,
      error: null
    };
  },

  internalCountDirectives: function (output) {
    var counts = [0, 0, 0, 0, 0, 0, 0, 0];
    var i;
    for (i = 0; i < output.length; i++) {
      counts[output[i] % 8]++;
    }
    return counts;
  },

  internalEmptyColony: function () {
    return {
      population: 0,
      morale: 0,
      score: 0,
      stoneStock: 0,
      grainStock: 0,
      wallStock: 0,
      weaponStock: 0,
      intelStock: 0,
      staminaStock: 0,
      shield: 0
    };
  },

  internalApplyDirectives: function (colony, counts) {
    var next = this.internalCloneColony(colony);
    next.stoneStock += counts[0];
    next.grainStock += counts[1] + counts[2];
    next.wallStock += counts[3];
    next.weaponStock += counts[4];
    next.intelStock += counts[5];
    next.staminaStock += counts[7];
    return next;
  },

  internalCloneColony: function (colony) {
    return {
      population: colony.population,
      morale: colony.morale,
      score: colony.score,
      stoneStock: colony.stoneStock,
      grainStock: colony.grainStock,
      wallStock: colony.wallStock,
      weaponStock: colony.weaponStock,
      intelStock: colony.intelStock,
      staminaStock: colony.staminaStock,
      shield: colony.shield
    };
  },

  internalApplyBoon: function (colony, boon) {
    var next = this.internalCloneColony(colony);
    var a = boon.apply || {};
    if (a.population) next.population += a.population;
    if (a.morale) next.morale += a.morale;
    if (a.score) next.score += a.score;
    if (a.shield) next.shield = Math.max(next.shield, a.shield);
    if (a.stone) next.stoneStock += a.stone;
    if (a.grain) next.grainStock += a.grain;
    if (a.wall) next.wallStock += a.wall;
    if (a.weapon) next.weaponStock += a.weapon;
    if (a.intel) next.intelStock += a.intel;
    if (a.stamina) next.staminaStock += a.stamina;
    return next;
  },

  internalCountInstructions: function (program) {
    var ops = "><+-.,[]";
    var n = 0;
    var i;
    for (i = 0; i < program.length; i++) {
      if (ops.indexOf(program.charAt(i)) >= 0) n++;
    }
    return n;
  },

  internalBracketsBalanced: function (program) {
    var depth = 0;
    var i;
    for (i = 0; i < program.length; i++) {
      if (program.charAt(i) === "[") depth++;
      else if (program.charAt(i) === "]") {
        depth--;
        if (depth < 0) return false;
      }
    }
    return depth === 0;
  },

  internalDecisionOf: function (option) {
    if (option && typeof option === "object" && option.decision !== undefined) {
      return option.decision;
    }
    return option;
  },

  internalSelectBiomes: function (chaosOrb) {
    var pool = this.internalBiomes;
    var rnd = this.internalLcg(chaosOrb);
    var idxs = [];
    var i;
    for (i = 0; i < pool.length; i++) idxs.push(i);
    for (i = idxs.length - 1; i > 0; i--) {
      var j = rnd() % (i + 1);
      var tmp = idxs[i];
      idxs[i] = idxs[j];
      idxs[j] = tmp;
    }
    var rounds = [];
    for (i = 0; i < this.internalConstants.maxRounds; i++) {
      var biome = pool[idxs[i % idxs.length]];
      var tide = [];
      var tideRnd = this.internalLcg(chaosOrb + (i + 1) * 7919);
      var k;
      for (k = 0; k < biome.tideHints.length; k++) {
        var base = biome.tideHints[k];
        var jitter = tideRnd() % 32;
        tide.push((base + jitter) & 0xff);
      }
      rounds.push({
        name: biome.name,
        threatName: biome.threatName,
        directiveIdx: biome.directiveIdx,
        directiveName: biome.directiveName,
        threshold: biome.threshold,
        blurb: biome.blurb,
        tide: tide,
        boons: biome.boons
      });
    }
    return rounds;
  },

  internalPlayerName: function (state, playerId) {
    return (state.playerNames && state.playerNames[playerId]) || playerId;
  },

  internalResolveRound: function (state) {
    var roundIdx = state.round - 1;
    var biome = state.rounds[roundIdx];
    var reveals = [];
    var nextColonyByPid = {};
    var nextAlive = {};
    var i;
    for (i = 0; i < state.players.length; i++) {
      var pid = state.players[i];
      var colony = this.internalReadColony(state, pid);
      var submission = state.pendingSubmissions[pid];
      if (!state.alive[pid]) {
        nextColonyByPid[pid] = colony;
        nextAlive[pid] = false;
        continue;
      }
      var program = submission && submission.program ? submission.program : "";
      var charLen = program.length;
      var instructionCount = this.internalCountInstructions(program);
      var bracketsOk = this.internalBracketsBalanced(program);
      var runResult = bracketsOk
        ? this.internalRunScroll(program, biome.tide)
        : { output: [], steps: 0, halted: false, error: "unbalanced brackets" };
      var counts = this.internalCountDirectives(runResult.output);
      var directiveCount = counts[biome.directiveIdx];
      var threatMet = directiveCount >= biome.threshold;
      var nextColony = this.internalApplyDirectives(colony, counts);
      var scoreDelta = 0;
      var penaltyApplied = false;
      var shieldUsed = false;
      if (threatMet) {
        scoreDelta += 3;
      } else if (nextColony.shield > 0) {
        nextColony.shield -= 1;
        shieldUsed = true;
      } else {
        nextColony.morale -= 1;
        penaltyApplied = true;
        if (nextColony.morale < 0) {
          nextColony.morale = 0;
          nextColony.population -= 1;
        }
      }
      var totalDirectives =
        counts[0] +
        counts[1] +
        counts[2] +
        counts[3] +
        counts[4] +
        counts[5] +
        counts[6] +
        counts[7];
      if (totalDirectives >= 8) {
        scoreDelta += 1;
      }
      if (totalDirectives >= 16) {
        scoreDelta += 1;
      }
      var isPrime = this.internalIsPrime(charLen);
      var boon = null;
      if (isPrime && charLen > 0) {
        boon = this.internalPickBoon(
          biome.boons,
          state.chaosOrb,
          state.round,
          pid
        );
        if (boon && boon.apply && boon.apply.score) {
          scoreDelta += boon.apply.score;
        }
        nextColony = this.internalApplyBoon(nextColony, {
          apply: {
            population: boon && boon.apply ? boon.apply.population : 0,
            morale: boon && boon.apply ? boon.apply.morale : 0,
            shield: boon && boon.apply ? boon.apply.shield : 0,
            stone: boon && boon.apply ? boon.apply.stone : 0,
            grain: boon && boon.apply ? boon.apply.grain : 0,
            wall: boon && boon.apply ? boon.apply.wall : 0,
            weapon: boon && boon.apply ? boon.apply.weapon : 0,
            intel: boon && boon.apply ? boon.apply.intel : 0,
            stamina: boon && boon.apply ? boon.apply.stamina : 0
          }
        });
      }
      nextColony.score += scoreDelta;
      if (nextColony.population < 0) nextColony.population = 0;
      nextColonyByPid[pid] = nextColony;
      nextAlive[pid] = nextColony.population > 0;
      reveals.push({
        playerId: pid,
        playerName: this.internalPlayerName(state, pid),
        program: program,
        charLen: charLen,
        instructionCount: instructionCount,
        isPrime: isPrime,
        bracketsOk: bracketsOk,
        runError: runResult.error,
        steps: runResult.steps,
        output: runResult.output.slice(),
        directiveCounts: counts,
        threatMet: threatMet,
        shieldUsed: shieldUsed,
        penaltyApplied: penaltyApplied,
        scoreDelta: scoreDelta,
        boon: boon
          ? { id: boon.id, label: boon.label, apply: boon.apply }
          : null
      });
    }
    var nextHistory = state.history.slice();
    nextHistory.push({
      round: state.round,
      name: biome.name,
      threatName: biome.threatName,
      directiveName: biome.directiveName,
      threshold: biome.threshold,
      tide: biome.tide.slice(),
      reveals: reveals
    });
    var clearedPending = {};
    for (i = 0; i < state.players.length; i++) {
      clearedPending[state.players[i]] = null;
    }
    var nextRound = state.round + 1;
    var aliveCount = 0;
    for (i = 0; i < state.players.length; i++) {
      if (nextAlive[state.players[i]]) aliveCount++;
    }
    var ended = nextRound > state.maxRounds || aliveCount <= 0;
    if (state.players.length >= 2 && aliveCount <= 1 && state.maxRounds >= 1) {
      ended = true;
    }
    var result = {
      players: state.players,
      playerNames: state.playerNames,
      phase: ended ? "ended" : "draft",
      round: ended ? state.round : nextRound,
      maxRounds: state.maxRounds,
      rounds: state.rounds,
      pendingSubmissions: clearedPending,
      alive: nextAlive,
      history: nextHistory,
      chaosOrb: state.chaosOrb,
      lastResolvedRound: state.round
    };
    this.internalWriteColonies(result, state.players, nextColonyByPid);
    return result;
  },

  internalReadColony: function (state, pid) {
    return {
      population: state.population[pid] || 0,
      morale: state.morale[pid] || 0,
      score: state.scores[pid] || 0,
      stoneStock: state.stoneStock[pid] || 0,
      grainStock: state.grainStock[pid] || 0,
      wallStock: state.wallStock[pid] || 0,
      weaponStock: state.weaponStock[pid] || 0,
      intelStock: state.intelStock[pid] || 0,
      staminaStock: state.staminaStock[pid] || 0,
      shield: state.shield[pid] || 0
    };
  },

  internalWriteColonies: function (target, players, colonyByPid) {
    target.population = {};
    target.morale = {};
    target.scores = {};
    target.shield = {};
    target.stoneStock = {};
    target.grainStock = {};
    target.wallStock = {};
    target.weaponStock = {};
    target.intelStock = {};
    target.staminaStock = {};
    var i;
    for (i = 0; i < players.length; i++) {
      var pid = players[i];
      var c = colonyByPid[pid] || this.internalEmptyColony();
      target.population[pid] = c.population;
      target.morale[pid] = c.morale;
      target.scores[pid] = c.score;
      target.shield[pid] = c.shield;
      target.stoneStock[pid] = c.stoneStock;
      target.grainStock[pid] = c.grainStock;
      target.wallStock[pid] = c.wallStock;
      target.weaponStock[pid] = c.weaponStock;
      target.intelStock[pid] = c.intelStock;
      target.staminaStock[pid] = c.staminaStock;
    }
  },

  setup: function (ctx) {
    var i;
    var players = [];
    var playerNames = {};
    for (i = 0; i < ctx.players.length; i++) {
      players.push(ctx.players[i].id);
      playerNames[ctx.players[i].id] =
        ctx.players[i].name || ctx.players[i].id;
    }
    var chaosOrb = (ctx.random.integer(1, 2147483646) >>> 0) || 12345;
    var rounds = this.internalSelectBiomes(chaosOrb);
    var alive = {};
    var pendingSubmissions = {};
    var colonyByPid = {};
    for (i = 0; i < players.length; i++) {
      var pid = players[i];
      var c = this.internalEmptyColony();
      c.population = this.internalConstants.startPopulation;
      c.morale = this.internalConstants.startMorale;
      colonyByPid[pid] = c;
      alive[pid] = true;
      pendingSubmissions[pid] = null;
    }
    var result = {
      players: players,
      playerNames: playerNames,
      phase: "draft",
      round: 1,
      maxRounds: this.internalConstants.maxRounds,
      rounds: rounds,
      pendingSubmissions: pendingSubmissions,
      alive: alive,
      history: [],
      chaosOrb: chaosOrb,
      lastResolvedRound: 0
    };
    this.internalWriteColonies(result, players, colonyByPid);
    return result;
  },

  apply: function (state, actorId, action) {
    var act = this.internalDecisionOf(action);
    if (!act || typeof act !== "object") return state;

    if (act.type === "resolve_round") {
      if (actorId !== "__system__") return state;
      if (state.phase !== "draft") return state;
      var allIn = true;
      var k;
      for (k = 0; k < state.players.length; k++) {
        var pidCheck = state.players[k];
        if (!state.alive[pidCheck]) continue;
        if (
          state.pendingSubmissions[pidCheck] === null ||
          state.pendingSubmissions[pidCheck] === undefined
        ) {
          allIn = false;
          break;
        }
      }
      if (!allIn) return state;
      return this.internalResolveRound(state);
    }

    if (act.type === "submit") {
      if (state.phase !== "draft") return state;
      if (state.players.indexOf(actorId) === -1) return state;
      if (!state.alive[actorId]) return state;
      if (
        state.pendingSubmissions[actorId] !== null &&
        state.pendingSubmissions[actorId] !== undefined
      ) {
        return state;
      }
      var program = typeof act.program === "string" ? act.program : "";
      if (program.length > this.internalConstants.scrollMaxChars) {
        program = program.slice(0, this.internalConstants.scrollMaxChars);
      }
      var nextPending = {};
      var j;
      for (j = 0; j < state.players.length; j++) {
        nextPending[state.players[j]] = state.pendingSubmissions[state.players[j]];
      }
      nextPending[actorId] = { program: program };
      var result = {
        players: state.players,
        playerNames: state.playerNames,
        phase: state.phase,
        round: state.round,
        maxRounds: state.maxRounds,
        rounds: state.rounds,
        pendingSubmissions: nextPending,
        alive: state.alive,
        history: state.history,
        chaosOrb: state.chaosOrb,
        lastResolvedRound: state.lastResolvedRound,
        population: state.population,
        morale: state.morale,
        scores: state.scores,
        shield: state.shield,
        stoneStock: state.stoneStock,
        grainStock: state.grainStock,
        wallStock: state.wallStock,
        weaponStock: state.weaponStock,
        intelStock: state.intelStock,
        staminaStock: state.staminaStock
      };
      return result;
    }
    return state;
  },

  project: function (state, viewerId) {
    var i;
    var biome = state.phase === "ended" ? null : state.rounds[state.round - 1];
    var population = {};
    var morale = {};
    var scores = {};
    var shield = {};
    var stoneStock = {};
    var grainStock = {};
    var wallStock = {};
    var weaponStock = {};
    var intelStock = {};
    var staminaStock = {};
    for (i = 0; i < state.players.length; i++) {
      var pid = state.players[i];
      population[pid] = state.population[pid] || 0;
      morale[pid] = state.morale[pid] || 0;
      scores[pid] = state.scores[pid] || 0;
      shield[pid] = state.shield[pid] || 0;
      stoneStock[pid] = state.stoneStock[pid] || 0;
      grainStock[pid] = state.grainStock[pid] || 0;
      wallStock[pid] = state.wallStock[pid] || 0;
      weaponStock[pid] = state.weaponStock[pid] || 0;
      intelStock[pid] = state.intelStock[pid] || 0;
      staminaStock[pid] = state.staminaStock[pid] || 0;
    }
    var submissionStatus = {};
    for (i = 0; i < state.players.length; i++) {
      var sid = state.players[i];
      var sub = state.pendingSubmissions[sid];
      submissionStatus[sid] = !!(sub && typeof sub.program === "string");
    }
    var mySubmission = null;
    if (
      viewerId &&
      state.players.indexOf(viewerId) >= 0 &&
      state.pendingSubmissions[viewerId] &&
      typeof state.pendingSubmissions[viewerId].program === "string"
    ) {
      mySubmission = {
        program: state.pendingSubmissions[viewerId].program,
        charLen: state.pendingSubmissions[viewerId].program.length,
        isPrime: this.internalIsPrime(
          state.pendingSubmissions[viewerId].program.length
        )
      };
    }
    var view = {
      players: state.players.slice(),
      playerNames: state.playerNames,
      phase: state.phase,
      round: state.round,
      maxRounds: state.maxRounds,
      population: population,
      morale: morale,
      scores: scores,
      shield: shield,
      stoneStock: stoneStock,
      grainStock: grainStock,
      wallStock: wallStock,
      weaponStock: weaponStock,
      intelStock: intelStock,
      staminaStock: staminaStock,
      alive: state.alive,
      submissionStatus: submissionStatus,
      history: state.history,
      mySubmission: mySubmission,
      biome: biome
        ? {
            name: biome.name,
            threatName: biome.threatName,
            directiveName: biome.directiveName,
            directiveIdx: biome.directiveIdx,
            threshold: biome.threshold,
            blurb: biome.blurb,
            tide: biome.tide.slice(),
            boons: biome.boons.map(function (b) {
              return { id: b.id, label: b.label };
            })
          }
        : null,
      directiveNames: this.internalDirectiveNames.slice(),
      scrollMaxChars: this.internalConstants.scrollMaxChars
    };
    var agentLines = [];
    agentLines.push(
      "PHASE: " +
        state.phase +
        " | ROUND " +
        state.round +
        "/" +
        state.maxRounds
    );
    if (biome) {
      agentLines.push(
        "BIOME: " +
          biome.name +
          " | THREAT: " +
          biome.threatName +
          " (need " +
          biome.threshold +
          "+ " +
          biome.directiveName +
          ")"
      );
      agentLines.push("BLURB: " + biome.blurb);
      agentLines.push("TIDE BYTES: " + biome.tide.join(", "));
      var boonNames = [];
      var b;
      for (b = 0; b < biome.boons.length; b++) {
        boonNames.push(biome.boons[b].label);
      }
      agentLines.push(
        "PRIME-LENGTH BOON POOL: " + boonNames.join(" | ")
      );
    }
    var nameLines = [];
    for (i = 0; i < state.players.length; i++) {
      var p = state.players[i];
      var submittedTag = submissionStatus[p] ? " [submitted]" : "";
      var aliveTag = state.alive[p] ? "" : " [eliminated]";
      nameLines.push(
        this.internalPlayerName(state, p) +
          " (" +
          p +
          "): pop=" +
          population[p] +
          " morale=" +
          morale[p] +
          " score=" +
          scores[p] +
          " shield=" +
          shield[p] +
          " stock={stone:" +
          stoneStock[p] +
          " grain:" +
          grainStock[p] +
          " wall:" +
          wallStock[p] +
          " weapon:" +
          weaponStock[p] +
          " intel:" +
          intelStock[p] +
          " stamina:" +
          staminaStock[p] +
          "}" +
          submittedTag +
          aliveTag
      );
    }
    agentLines.push("COLONIES:\n  " + nameLines.join("\n  "));
    if (mySubmission) {
      agentLines.push(
        "YOUR PENDING SCROLL (" +
          mySubmission.charLen +
          " chars, prime=" +
          mySubmission.isPrime +
          "): " +
          mySubmission.program
      );
    }
    if (state.history.length > 0) {
      var lastHist = state.history[state.history.length - 1];
      var revLines = [];
      var r;
      for (r = 0; r < lastHist.reveals.length; r++) {
        var rev = lastHist.reveals[r];
        revLines.push(
          rev.playerName +
            ": chars=" +
            rev.charLen +
            (rev.isPrime ? "(PRIME)" : "") +
            " " +
            this.internalDirectiveNames[
              lastHist.directiveName === "Dig"
                ? 0
                : lastHist.directiveName === "Plant"
                  ? 1
                  : lastHist.directiveName === "Harvest"
                    ? 2
                    : lastHist.directiveName === "Build"
                      ? 3
                      : lastHist.directiveName === "Forge"
                        ? 4
                        : lastHist.directiveName === "Scout"
                          ? 5
                          : lastHist.directiveName === "Pray"
                            ? 6
                            : 7
            ] +
            "=" +
            rev.directiveCounts[
              lastHist.directiveName === "Dig"
                ? 0
                : lastHist.directiveName === "Plant"
                  ? 1
                  : lastHist.directiveName === "Harvest"
                    ? 2
                    : lastHist.directiveName === "Build"
                      ? 3
                      : lastHist.directiveName === "Forge"
                        ? 4
                        : lastHist.directiveName === "Scout"
                          ? 5
                          : lastHist.directiveName === "Pray"
                            ? 6
                            : 7
            ] +
            (rev.threatMet ? " (met)" : " (missed)") +
            " score+=" +
            rev.scoreDelta +
            (rev.boon ? " boon=" + rev.boon.label : "")
        );
      }
      agentLines.push(
        "LAST ROUND (" + lastHist.name + "):\n  " + revLines.join("\n  ")
      );
    }
    if (state.phase === "ended") {
      agentLines.push("GAME OVER");
    }
    return {
      view: view,
      agentView: agentLines.join("\n")
    };
  },

  internalSamplePrograms: function (state, viewerId) {
    var biome = state.rounds[state.round - 1];
    var directive = biome.directiveIdx;
    var threshold = biome.threshold;
    var directiveName = biome.directiveName;
    var make = function (program, prose) {
      return {
        decision: { type: "submit", program: program },
        label: prose + " — " + program.length + " chars"
      };
    };
    var presets = [];
    var loopBody = "";
    var i;
    for (i = 0; i < directive; i++) loopBody += "+";
    var primer = "++++++++[>" + loopBody + "<-]>";
    var firePattern = primer + ".";
    for (i = 1; i < threshold; i++) firePattern += ".";
    presets.push(
      make(
        firePattern,
        "Lockstep — fire " +
          threshold +
          " " +
          directiveName +
          " directives via a counted loop"
      )
    );
    var floodLoop = "++++++++++[>";
    var direct = "";
    for (i = 0; i < directive; i++) direct += "+";
    floodLoop += direct + ".";
    floodLoop += "<-]";
    presets.push(
      make(
        floodLoop,
        "Floodgate — loop ten times pumping " +
          directiveName +
          " directives, no prime"
      )
    );
    var primeStub = primer + ".";
    for (i = 1; i < threshold + 1; i++) primeStub += ".";
    while (!this.internalIsPrime(primeStub.length) && primeStub.length < 60) {
      primeStub += " ";
    }
    presets.push(
      make(
        primeStub,
        "Whisper-tuned — " +
          (threshold + 1) +
          " " +
          directiveName +
          " directives, padded to a prime char count for a boon shot"
      )
    );
    var tideEater = ",>,>,>,>,>";
    var emitters = "";
    var spread = (directive + 1) % 8;
    var quantity = threshold + 1;
    var k;
    var seedBuild = "";
    for (k = 0; k < spread; k++) seedBuild += "+";
    var emitter = "<" + seedBuild + ".";
    emitters += emitter;
    for (k = 1; k < quantity; k++) emitters += ".";
    presets.push(
      make(
        tideEater + emitters,
        "Tide-reader — chew the biome tide bytes, then emit " +
          quantity +
          " " +
          directiveName +
          " directives"
      )
    );
    var smallPrimer = "+++++++[>+++<-]>";
    var stab = smallPrimer;
    for (i = 0; i < threshold; i++) stab += ".";
    presets.push(
      make(stab, "Quick stab — minimal scroll firing " + threshold + " directives")
    );
    presets.push(
      make("", "Silent burrow — submit an empty scroll (no directives, no risk of bracket errors)")
    );
    presets.push({
      decision: { type: "submit", program: "" },
      schema: {
        type: "object",
        properties: {
          type: { type: "string", const: "submit" },
          program: {
            type: "string",
            maxLength: this.internalConstants.scrollMaxChars,
            description:
              "Loopglyph scroll. The 8 instructions are > < + - . , [ ]. Every '.' emits one directive based on cell value mod 8 (" +
              this.internalDirectiveNames.join(", ") +
              "). The biome this round needs " +
              threshold +
              "+ " +
              directiveName +
              " directives (cell-value mod 8 == " +
              directive +
              "). Brackets must match. Total scroll character length being prime triggers a biome boon."
          }
        },
        required: ["type", "program"]
      },
      required: true,
      label:
        "Compose your own — write a Loopglyph scroll. Target " +
        threshold +
        "+ " +
        directiveName +
        " directives (cell mod 8 == " +
        directive +
        "). Match brackets. A prime-length scroll catches the biome's eye for a rare boon."
    });
    return presets;
  },

  opportunities: function (state, actorId) {
    if (this.outcome(state) !== null) return [];
    if (state.phase !== "draft") return [];
    if (actorId === "__system__") {
      var allIn = true;
      var living = 0;
      var k;
      for (k = 0; k < state.players.length; k++) {
        var pidCheck = state.players[k];
        if (!state.alive[pidCheck]) continue;
        living++;
        if (
          state.pendingSubmissions[pidCheck] === null ||
          state.pendingSubmissions[pidCheck] === undefined
        ) {
          allIn = false;
          break;
        }
      }
      if (living === 0) return [];
      if (!allIn) return [];
      return [
        {
          id: "system:resolve:" + state.round,
          kind: "system",
          prompt: "All scrolls submitted; the biome resolves this round.",
          decision: {
            type: "choose",
            options: [{ decision: { type: "resolve_round" }, label: "Resolve round " + state.round }]
          },
          deadline: {
            id: "system:resolve:" + state.round,
            timeoutMs: 1,
            onExpire: { type: "resolve_round" }
          },
          visibility: "system",
          submitPolicy: "once"
        }
      ];
    }
    if (state.players.indexOf(actorId) === -1) return [];
    if (!state.alive[actorId]) {
      return [
        {
          id: "chat:eliminated:" + actorId,
          kind: "chat",
          prompt:
            "Your colony fell. Watch the surviving burrows finish out the run.",
          decision: { type: "none" },
          chat: {
            channels: ["eliminated"],
            defaultChannel: "eliminated",
            canSend: true,
            memberships: ["eliminated"]
          },
          submitPolicy: "multiple"
        }
      ];
    }
    var sub = state.pendingSubmissions[actorId];
    if (sub && typeof sub.program === "string") {
      return [
        {
          id: "chat:waiting:" + actorId,
          kind: "chat",
          prompt: "Scroll sealed. Wait for the rest of the burrows.",
          decision: { type: "none" },
          chat: {
            channels: ["room", "whisper", "spectator"],
            defaultChannel: "room",
            canSend: true,
            memberships: []
          },
          submitPolicy: "multiple"
        }
      ];
    }
    var options = this.internalSamplePrograms(state, actorId);
    var biome = state.rounds[state.round - 1];
    return [
      {
        id: "submit:" + actorId + ":r" + state.round,
        kind: "turn",
        prompt:
          this.internalPlayerName(state, actorId) +
          ": pick a preset Loopglyph scroll or compose your own. The biome (" +
          biome.name +
          ") wants " +
          biome.threshold +
          "+ " +
          biome.directiveName +
          " directives this round.",
        decision: { type: "choose", options: options },
        deadline: {
          id: "submit:" + actorId + ":r" + state.round,
          timeoutMs: 60000,
          onExpire: { type: "submit", program: "" }
        },
        chat: {
          channels: ["room", "whisper", "spectator"],
          defaultChannel: "room",
          canSend: true,
          memberships: []
        },
        submitPolicy: "once"
      }
    ];
  },

  validate: function (state, actorId, decision) {
    var act = this.internalDecisionOf(decision);
    if (!act || typeof act !== "object")
      return { ok: false, error: "decision must be an object", code: "shape" };
    if (act.type === "submit") {
      if (state.phase !== "draft")
        return { ok: false, error: "not in draft phase", code: "phase" };
      if (state.players.indexOf(actorId) === -1)
        return { ok: false, error: "not a player", code: "actor" };
      if (!state.alive[actorId])
        return {
          ok: false,
          error: "eliminated colonies cannot submit",
          code: "eliminated"
        };
      if (
        state.pendingSubmissions[actorId] !== null &&
        state.pendingSubmissions[actorId] !== undefined
      ) {
        return {
          ok: false,
          error: "scroll already submitted this round",
          code: "duplicate"
        };
      }
      var program = typeof act.program === "string" ? act.program : "";
      if (program.length > this.internalConstants.scrollMaxChars) {
        return {
          ok: false,
          error:
            "scroll exceeds " +
            this.internalConstants.scrollMaxChars +
            " characters",
          code: "too_long"
        };
      }
      return { ok: true };
    }
    if (act.type === "resolve_round") {
      if (actorId !== "__system__")
        return {
          ok: false,
          error: "only system can resolve",
          code: "actor"
        };
      return { ok: true };
    }
    return { ok: false, error: "unknown decision type", code: "type" };
  },

  outcome: function (state) {
    if (state.phase !== "ended") return null;
    var i;
    var entries = [];
    for (i = 0; i < state.players.length; i++) {
      var pid = state.players[i];
      entries.push({
        id: pid,
        score: state.scores[pid] || 0,
        population: state.population[pid] || 0,
        morale: state.morale[pid] || 0,
        alive: state.alive[pid]
      });
    }
    entries.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (b.population !== a.population) return b.population - a.population;
      if (b.morale !== a.morale) return b.morale - a.morale;
      return 0;
    });
    var top = entries[0];
    var leaders = entries.filter(function (e) {
      return (
        e.score === top.score &&
        e.population === top.population &&
        e.morale === top.morale
      );
    });
    var summaryParts = entries.map(function (e) {
      return (
        (state.playerNames[e.id] || e.id) +
        ": " +
        e.score +
        " pts, pop " +
        e.population
      );
    });
    var summary = "Final tally — " + summaryParts.join("; ");
    if (leaders.length === 1) {
      return {
        type: "winners",
        playerIds: [leaders[0].id],
        summary:
          (state.playerNames[leaders[0].id] || leaders[0].id) +
          " keeps Sigilburrow. " +
          summary
      };
    }
    return {
      type: "draw",
      playerIds: leaders.map(function (e) {
        return e.id;
      }),
      summary: "Stalemate at the gate. " + summary
    };
  }
};

if (typeof module !== "undefined") {
  module.exports = GameLogic;
}
