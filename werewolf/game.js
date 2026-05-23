// @ts-nocheck - vanilla JS for VM sandbox, not meant for type checking
// === Helpers ===

function getRoleList(playerCount) {
  var wolfCount = Math.floor(playerCount / 3);
  var roles = [];
  for (var i = 0; i < wolfCount; i++) roles.push("werewolf");
  roles.push("seer");
  roles.push("doctor");
  while (roles.length < playerCount) roles.push("villager");
  return roles;
}

function seededRandom(seed) {
  var s = (seed + 0x6d2b79f5) | 0;
  var t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function advanceSeed(seed) {
  return (seed + 0x6d2b79f5) | 0;
}

function deterministicPick(items, seed) {
  var r = seededRandom(seed);
  var idx = Math.floor(r * items.length);
  return { picked: items[idx], newSeed: advanceSeed(seed) };
}

function buildChatOpportunities(channels) {
  return channels.map(function (channel) {
    return {
      id: "chat:" + channel,
      kind: "chat",
      prompt:
        channel === "eliminated"
          ? "Chat with eliminated players."
          : "Chat in " + channel + ".",
      visibility: "private",
      priority: 0,
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

function checkWinCondition(state) {
  var aliveWolves = state.players.filter(function (p) {
    return state.alive[p] && state.roles[p] === "werewolf";
  }).length;
  var aliveNonWolves = state.players.filter(function (p) {
    return state.alive[p] && state.roles[p] !== "werewolf";
  }).length;

  if (aliveWolves === 0) {
    return {
      winners: state.players.filter(function (p) {
        return state.roles[p] !== "werewolf";
      }),
      summary: "The village wins! All werewolves have been eliminated.",
    };
  }
  if (aliveWolves >= aliveNonWolves) {
    return {
      winners: state.players.filter(function (p) {
        return state.roles[p] === "werewolf";
      }),
      summary: "The werewolves win! They outnumber the villagers.",
    };
  }
  return null;
}

function livingPlayers(state) {
  return state.players.filter(function (p) {
    return state.alive[p];
  });
}

function livingWolves(state) {
  return state.players.filter(function (p) {
    return state.alive[p] && state.roles[p] === "werewolf";
  });
}

function decisionOf(option) {
  if (option && typeof option === "object" && option.decision !== undefined)
    return option.decision;
  if (option && typeof option === "object" && option.action !== undefined)
    return option.action;
  return option;
}

function playerName(state, playerId) {
  return (
    (state && state.playerNames && state.playerNames[playerId]) || playerId
  );
}

function viewPlayerName(view, playerId) {
  return (view && view.playerNames && view.playerNames[playerId]) || playerId;
}

function pendingNightActors(state) {
  var pending = 0;
  var wolves = livingWolves(state);
  pending += wolves.filter(function (w) {
    return state.werewolfVotes[w] === undefined;
  }).length;
  var seer = state.players.find(function (p) {
    return state.alive[p] && state.roles[p] === "seer";
  });
  if (seer && state.seerTarget === null) pending++;
  var doctor = state.players.find(function (p) {
    return state.alive[p] && state.roles[p] === "doctor";
  });
  if (doctor && state.doctorTarget === null) pending++;
  return pending;
}

function resolveNight(state) {
  var wolves = livingWolves(state);
  var wolfTarget = null;

  if (wolves.length > 0) {
    var voteCounts = {};
    for (var i = 0; i < wolves.length; i++) {
      var target = state.werewolfVotes[wolves[i]];
      if (target) voteCounts[target] = (voteCounts[target] || 0) + 1;
    }
    var maxVotes = 0;
    var counts = Object.values(voteCounts);
    for (var j = 0; j < counts.length; j++) {
      if (counts[j] > maxVotes) maxVotes = counts[j];
    }
    var topTargets = Object.keys(voteCounts).filter(function (t) {
      return voteCounts[t] === maxVotes;
    });
    if (topTargets.length === 1) {
      wolfTarget = topTargets[0];
    } else if (topTargets.length > 1) {
      var pick = deterministicPick(topTargets.toSorted(), state.nextSeed);
      wolfTarget = pick.picked;
      state = Object.assign({}, state, { nextSeed: pick.newSeed });
    }
  }

  var saved = wolfTarget !== null && wolfTarget === state.doctorTarget;
  var nightKill = saved ? null : wolfTarget;

  var newAlive = Object.assign({}, state.alive);
  if (nightKill) {
    newAlive = Object.assign({}, newAlive, { [nightKill]: false });
  }

  var newSeerHistory = state.seerHistory;
  if (state.seerTarget !== null && state.seerResult !== null) {
    newSeerHistory = state.seerHistory.concat([
      {
        target: state.seerTarget,
        role: state.seerResult,
      },
    ]);
  }

  return Object.assign({}, state, {
    phase: "night_result",
    alive: newAlive,
    nightKill: nightKill,
    seerHistory: newSeerHistory,
    lastDoctorTarget: state.doctorTarget,
  });
}

function resolveDayVote(state) {
  var voteCounts = {};
  var voteValues = Object.values(state.votes);
  for (var i = 0; i < voteValues.length; i++) {
    var target = voteValues[i];
    if (target !== "skip") {
      voteCounts[target] = (voteCounts[target] || 0) + 1;
    }
  }

  var maxVotes = 0;
  var counts = Object.values(voteCounts);
  for (var j = 0; j < counts.length; j++) {
    if (counts[j] > maxVotes) maxVotes = counts[j];
  }

  var eliminated = null;
  if (maxVotes > 0) {
    var topTargets = Object.keys(voteCounts).filter(function (t) {
      return voteCounts[t] === maxVotes;
    });
    if (topTargets.length === 1) {
      eliminated = topTargets[0];
    }
  }

  var newAlive = state.alive;
  if (eliminated) {
    newAlive = Object.assign({}, state.alive, { [eliminated]: false });
  }

  var newVoteHistory = state.voteHistory.concat([
    {
      round: state.round,
      votes: Object.assign({}, state.votes),
      eliminated: eliminated,
    },
  ]);

  return Object.assign({}, state, {
    phase: "day_result",
    alive: newAlive,
    eliminated: eliminated,
    voteHistory: newVoteHistory,
  });
}

// === Action Handlers ===

function handleAdvancePhase(state, timerId) {
  if (timerId === "roleReveal" && state.phase === "roleReveal") {
    return Object.assign({}, state, {
      phase: "day_discussion",
    });
  }

  if (timerId === "day_discussion" && state.phase === "day_discussion") {
    return Object.assign({}, state, {
      phase: "day_vote",
      votes: {},
    });
  }

  if (timerId === "day_vote" && state.phase === "day_vote") {
    var newVotes = Object.assign({}, state.votes);
    var live = livingPlayers(state);
    for (var i = 0; i < live.length; i++) {
      if (newVotes[live[i]] === undefined) {
        newVotes[live[i]] = "skip";
      }
    }
    var stateWithVotes = Object.assign({}, state, { votes: newVotes });
    return resolveDayVote(stateWithVotes);
  }

  if (timerId === "day_result" && state.phase === "day_result") {
    var dayWin = checkWinCondition(state);
    if (dayWin) {
      return Object.assign({}, state, {
        phase: "gameOver",
        internalPendingWinner: dayWin,
      });
    }
    return Object.assign({}, state, {
      phase: "night",
      werewolfVotes: {},
      seerTarget: null,
      seerResult: null,
      doctorTarget: null,
      nightKill: null,
    });
  }

  if (timerId === "night" && state.phase === "night") {
    var s = state;
    var wolves = livingWolves(s);
    for (var wi = 0; wi < wolves.length; wi++) {
      var w = wolves[wi];
      if (s.werewolfVotes[w] === undefined) {
        var targets = s.players.filter(function (p) {
          return s.alive[p] && s.roles[p] !== "werewolf";
        });
        if (targets.length > 0) {
          var pick = deterministicPick(targets, s.nextSeed);
          s = Object.assign({}, s, {
            werewolfVotes: Object.assign({}, s.werewolfVotes, {
              [w]: pick.picked,
            }),
            nextSeed: pick.newSeed,
          });
        }
      }
    }
    var seer = s.players.find(function (p) {
      return s.alive[p] && s.roles[p] === "seer";
    });
    if (seer && s.seerTarget === null) {
      var seerTargets = s.players.filter(function (p) {
        return s.alive[p] && p !== seer;
      });
      if (seerTargets.length > 0) {
        var seerPick = deterministicPick(seerTargets, s.nextSeed);
        s = Object.assign({}, s, {
          seerTarget: seerPick.picked,
          seerResult: s.roles[seerPick.picked],
          nextSeed: seerPick.newSeed,
        });
      }
    }
    var doctor = s.players.find(function (p) {
      return s.alive[p] && s.roles[p] === "doctor";
    });
    if (doctor && s.doctorTarget === null) {
      var docTargets = s.players.filter(function (p) {
        return s.alive[p] && p !== s.lastDoctorTarget;
      });
      if (docTargets.length > 0) {
        var docPick = deterministicPick(docTargets, s.nextSeed);
        s = Object.assign({}, s, {
          doctorTarget: docPick.picked,
          nextSeed: docPick.newSeed,
        });
      }
    }
    return resolveNight(s);
  }

  if (timerId === "night_result" && state.phase === "night_result") {
    var nightWin = checkWinCondition(state);
    if (nightWin) {
      return Object.assign({}, state, {
        phase: "gameOver",
        internalPendingWinner: nightWin,
      });
    }
    return Object.assign({}, state, {
      phase: "day_discussion",
      round: state.round + 1,
      votes: {},
      eliminated: null,
      werewolfVotes: {},
      seerTarget: null,
      seerResult: null,
      doctorTarget: null,
      nightKill: null,
    });
  }

  if (timerId === "gameOver" && state.phase === "gameOver") {
    return Object.assign({}, state, {
      phase: "finished",
      gameWinner: state.internalPendingWinner,
    });
  }

  return state;
}

function handleDayVote(state, playerId, target) {
  if (state.phase !== "day_vote") return state;
  if (!state.alive[playerId]) return state;
  if (state.votes[playerId] !== undefined) return state;
  if (
    target !== "skip" &&
    (!state.alive[target] || !state.players.includes(target))
  )
    return state;

  var newVotes = Object.assign({}, state.votes, { [playerId]: target });

  var allVoted = livingPlayers(state).every(function (p) {
    return newVotes[p] !== undefined;
  });
  if (allVoted) {
    return resolveDayVote(Object.assign({}, state, { votes: newVotes }));
  }

  return Object.assign({}, state, { votes: newVotes });
}

function handleWerewolfKill(state, playerId, target) {
  if (state.phase !== "night") return state;
  if (state.roles[playerId] !== "werewolf") return state;
  if (!state.alive[playerId]) return state;
  if (state.werewolfVotes[playerId] !== undefined) return state;
  if (state.roles[target] === "werewolf" || !state.alive[target]) return state;

  var newVotes = Object.assign({}, state.werewolfVotes, { [playerId]: target });
  var newState = Object.assign({}, state, { werewolfVotes: newVotes });

  if (pendingNightActors(newState) === 0) {
    return resolveNight(newState);
  }
  return newState;
}

function handleSeerInvestigate(state, playerId, target) {
  if (state.phase !== "night") return state;
  if (state.roles[playerId] !== "seer") return state;
  if (!state.alive[playerId]) return state;
  if (state.seerTarget !== null) return state;
  if (target === playerId || !state.alive[target]) return state;

  var newState = Object.assign({}, state, {
    seerTarget: target,
    seerResult: state.roles[target],
  });

  if (pendingNightActors(newState) === 0) {
    return resolveNight(newState);
  }
  return newState;
}

function handleDoctorProtect(state, playerId, target) {
  if (state.phase !== "night") return state;
  if (state.roles[playerId] !== "doctor") return state;
  if (!state.alive[playerId]) return state;
  if (state.doctorTarget !== null) return state;
  if (target === state.lastDoctorTarget) return state;
  if (!state.alive[target]) return state;

  var newState = Object.assign({}, state, { doctorTarget: target });

  if (pendingNightActors(newState) === 0) {
    return resolveNight(newState);
  }
  return newState;
}

function handlePlayerLeft(state, leftPlayerId) {
  if (!state.alive[leftPlayerId]) return state;

  var newAlive = Object.assign({}, state.alive, { [leftPlayerId]: false });
  var newState = Object.assign({}, state, { alive: newAlive });

  if (state.phase === "night") {
    if (pendingNightActors(newState) === 0) {
      return resolveNight(newState);
    }
  }

  if (state.phase === "day_vote") {
    var allVoted = livingPlayers(newState).every(function (p) {
      return newState.votes[p] !== undefined;
    });
    if (allVoted) {
      return resolveDayVote(newState);
    }
  }

  return newState;
}

function phaseTimerOpportunity(timerId, timeoutMs, prompt) {
  return {
    id: "phase:" + timerId,
    kind: "phase",
    prompt: prompt,
    visibility: "public",
    priority: 0,
    decision: { type: "none" },
    deadline: {
      id: timerId,
      timeoutMs: timeoutMs,
      onExpire: { type: "advance_phase", timerId: timerId },
    },
    submitPolicy: "once",
  };
}

function dayVoteOptions(state) {
  var options = livingPlayers(state).map(function (target) {
    return {
      decision: { type: "day_vote", target: target },
      label: "Vote to eliminate " + playerName(state, target),
    };
  });
  options.push({
    decision: { type: "day_vote", target: "skip" },
    label: "Skip the elimination vote today",
  });
  return options;
}

function nightOptionsForActor(state, actorId) {
  if (!state.alive[actorId]) return [];
  var role = state.roles[actorId];
  if (role === "werewolf") {
    if (state.werewolfVotes[actorId] !== undefined) return [];
    return state.players
      .filter(function (target) {
        return state.alive[target] && state.roles[target] !== "werewolf";
      })
      .map(function (target) {
        return {
          decision: { type: "werewolf_kill", target: target },
          label:
            "As a werewolf, choose " +
            playerName(state, target) +
            " as the night kill target",
        };
      });
  }
  if (role === "seer") {
    if (state.seerTarget !== null) return [];
    return state.players
      .filter(function (target) {
        return state.alive[target] && target !== actorId;
      })
      .map(function (target) {
        return {
          decision: { type: "seer_investigate", target: target },
          label:
            "As the seer, investigate " + playerName(state, target) + "'s role",
        };
      });
  }
  if (role === "doctor") {
    if (state.doctorTarget !== null) return [];
    return state.players
      .filter(function (target) {
        return state.alive[target] && target !== state.lastDoctorTarget;
      })
      .map(function (target) {
        var repeatNote =
          target === actorId ? " yourself" : " " + playerName(state, target);
        return {
          decision: { type: "doctor_protect", target: target },
          label: "As the doctor, protect" + repeatNote + " tonight",
        };
      });
  }
  return [];
}

// === Game Definition (v2 contract) ===

var PHASE_TIMEOUTS = {
  roleReveal: 5000,
  day_discussion: 90000,
  day_vote: 60000,
  day_result: 8000,
  night: 45000,
  night_result: 8000,
  gameOver: 8000,
};

function mapSummary(map) {
  if (!map) return "none";
  var keys = Object.keys(map);
  var parts = [];
  for (var i = 0; i < keys.length; i++) {
    if (map[keys[i]] !== undefined && map[keys[i]] !== null) {
      parts.push(keys[i] + "=" + map[keys[i]]);
    }
  }
  return parts.length ? parts.join(", ") : "none";
}

function namedValue(value, names) {
  if (value === "skip") return "skip";
  if (value === true || value === false) return String(value);
  if (value === undefined || value === null) return String(value);
  return names[value] || value;
}

function namedMapSummary(map, names) {
  if (!map) return "none";
  var keys = Object.keys(map);
  var parts = [];
  for (var i = 0; i < keys.length; i++) {
    if (map[keys[i]] !== undefined && map[keys[i]] !== null) {
      parts.push(
        (names[keys[i]] || keys[i]) + "=" + namedValue(map[keys[i]], names),
      );
    }
  }
  return parts.length ? parts.join(", ") : "none";
}

function namedList(ids, names) {
  if (!ids || !ids.length) return "none";
  return ids
    .map(function (id) {
      return names[id] || id;
    })
    .join(", ");
}

function buildWerewolfAgentView(view) {
  var lines = [];
  var alive = [];
  var dead = [];
  var i, p;
  var names = view.playerNames || {};
  lines.push(
    "Phase: " +
      view.phase +
      " | Round: " +
      view.round +
      " | TimeoutMs: " +
      (view.phaseTimeoutMs || "-"),
  );
  for (i = 0; i < view.players.length; i++) {
    p = view.players[i];
    if (view.alive[p]) alive.push(viewPlayerName(view, p));
    else dead.push(viewPlayerName(view, p));
  }
  lines.push("Alive: " + (alive.length ? alive.join(", ") : "none"));
  lines.push("Dead: " + (dead.length ? dead.join(", ") : "none"));
  if (view.myRole) lines.push("Your role: " + view.myRole);
  if (view.roles)
    lines.push("Known roles: " + namedMapSummary(view.roles, names));
  if (view.werewolves)
    lines.push("Known werewolves: " + namedList(view.werewolves, names));
  if (view.voted)
    lines.push("Day vote progress: " + namedMapSummary(view.voted, names));
  if (view.myVote) lines.push("Your vote: " + namedValue(view.myVote, names));
  if (view.votes)
    lines.push("Revealed day votes: " + namedMapSummary(view.votes, names));
  if (view.werewolfVotes)
    lines.push("Wolf votes: " + namedMapSummary(view.werewolfVotes, names));
  if (view.myWolfVote)
    lines.push("Your wolf vote: " + namedValue(view.myWolfVote, names));
  if (view.seerHistory && view.seerHistory.length) {
    var seerParts = view.seerHistory.map(function (entry) {
      return viewPlayerName(view, entry.target) + "=" + entry.role;
    });
    lines.push("Seer history: " + seerParts.join(", "));
  }
  if (view.seerTarget)
    lines.push(
      "Current seer result: " +
        viewPlayerName(view, view.seerTarget) +
        "=" +
        view.seerResult,
    );
  if (view.lastDoctorTarget)
    lines.push(
      "Doctor cannot repeat: " + viewPlayerName(view, view.lastDoctorTarget),
    );
  if (view.eliminated !== undefined)
    lines.push(
      "Day elimination: " +
        (view.eliminated ? viewPlayerName(view, view.eliminated) : "none") +
        (view.eliminatedRole ? " role=" + view.eliminatedRole : ""),
    );
  if (view.nightKill !== undefined)
    lines.push(
      "Night kill: " +
        (view.nightKill ? viewPlayerName(view, view.nightKill) : "none") +
        (view.killedRole ? " role=" + view.killedRole : ""),
    );
  if (view.gameWinner) lines.push("Winner: " + JSON.stringify(view.gameWinner));
  return lines.join("\n");
}

var GameLogic = {
  rules: {
    visibility: "viewer-specific",
    spectator: "god-view",
    seats: { eliminated: "player-view", disconnected: "player-view" },
  },

  manifest: {
    slug: "werewolf",
    name: "Werewolf",
    description:
      "A village plagued by werewolves. Find them by day, survive by night. Lying is mandatory.",
    minPlayers: 5,
    maxPlayers: 10,
  },

  setup: function (ctx) {
    var playerIds = ctx.players.map(function (p) {
      return p.id;
    });
    var playerNames = {};
    var roleList = getRoleList(playerIds.length);
    var shuffledRoles = ctx.random.shuffle(roleList.slice());

    var roles = {};
    var alive = {};
    for (var i = 0; i < playerIds.length; i++) {
      roles[playerIds[i]] = shuffledRoles[i];
      alive[playerIds[i]] = true;
      playerNames[playerIds[i]] = ctx.players[i].name || playerIds[i];
    }

    return {
      phase: "roleReveal",
      round: 0,
      players: playerIds,
      roles: roles,
      alive: alive,
      votes: {},
      eliminated: null,
      werewolfVotes: {},
      seerTarget: null,
      seerResult: null,
      doctorTarget: null,
      lastDoctorTarget: null,
      nightKill: null,
      seerHistory: [],
      voteHistory: [],
      nextSeed: Math.floor(ctx.random.next() * 2147483647),
      playerNames: playerNames,
    };
  },

  apply: function (state, playerId, action) {
    action = decisionOf(action);
    if (!action) return state;

    if (playerId === "__system__") {
      if (action.type === "advance_phase") {
        return handleAdvancePhase(state, action.timerId);
      }
      if (action.type === "player_left") {
        return handlePlayerLeft(state, action.playerId);
      }
      return state;
    }

    if (action.type === "day_vote") {
      return handleDayVote(state, playerId, action.target);
    }
    if (action.type === "werewolf_kill") {
      return handleWerewolfKill(state, playerId, action.target);
    }
    if (action.type === "seer_investigate") {
      return handleSeerInvestigate(state, playerId, action.target);
    }
    if (action.type === "doctor_protect") {
      return handleDoctorProtect(state, playerId, action.target);
    }

    return state;
  },

  project: function (state, playerId) {
    var isDead =
      playerId !== null &&
      state.players.indexOf(playerId) !== -1 &&
      !state.alive[playerId];
    var isSpectator = !playerId || state.players.indexOf(playerId) === -1;
    var isGameOver = state.phase === "gameOver" || state.phase === "finished";
    var myRole = playerId ? state.roles[playerId] : null;

    // --- View ---
    var view = {
      phase: state.phase,
      round: state.round,
      players: state.players,
      playerNames: Object.assign({}, state.playerNames),
      alive: Object.assign({}, state.alive),
      voteHistory: state.voteHistory,
      phaseTimeoutMs: PHASE_TIMEOUTS[state.phase] || null,
      handNumber: state.round + 1,
    };

    if (isDead || isSpectator || isGameOver) {
      // God view: reveal everything
      Object.assign(view, {
        roles: Object.assign({}, state.roles),
        myRole: null,
        werewolfVotes: Object.assign({}, state.werewolfVotes),
        seerTarget: state.seerTarget,
        seerResult: state.seerResult,
        seerHistory: state.seerHistory.slice(),
        doctorTarget: state.doctorTarget,
        nightKill: state.nightKill,
        eliminated: state.eliminated,
        eliminatedRole: state.eliminated ? state.roles[state.eliminated] : null,
        votes: Object.assign({}, state.votes),
        voteTallied:
          state.phase === "day_result" ||
          state.phase === "night" ||
          state.phase === "night_result",
      });
    } else {
      view.myRole = myRole;

      if (state.phase === "roleReveal") {
        if (myRole === "werewolf") {
          view.werewolves = state.players.filter(function (p) {
            return state.roles[p] === "werewolf";
          });
        }
      } else {
        if (myRole === "werewolf") {
          view.werewolves = state.players.filter(function (p) {
            return state.roles[p] === "werewolf";
          });
        }
        if (myRole === "seer") {
          view.seerHistory = state.seerHistory.slice();
          if (state.phase === "night" && state.seerTarget !== null) {
            view.seerTarget = state.seerTarget;
            view.seerResult = state.seerResult;
          }
        }
        if (state.phase === "day_vote") {
          var voted = {};
          for (var i = 0; i < state.players.length; i++) {
            var p = state.players[i];
            if (state.alive[p]) {
              voted[p] = state.votes[p] !== undefined;
            }
          }
          view.voted = voted;
          view.myVote = state.votes[playerId];
        }
        if (state.phase === "day_result") {
          view.eliminated = state.eliminated;
          view.eliminatedRole = state.eliminated
            ? state.roles[state.eliminated]
            : null;
          view.votes = Object.assign({}, state.votes);
        }
        if (state.phase === "night") {
          if (myRole === "werewolf") {
            view.werewolfVotes = Object.assign({}, state.werewolfVotes);
            view.myWolfVote = state.werewolfVotes[playerId];
          }
          if (myRole === "doctor") {
            view.lastDoctorTarget = state.lastDoctorTarget;
          }
        }
        if (state.phase === "night_result") {
          view.nightKill = state.nightKill;
          view.killedRole = state.nightKill
            ? state.roles[state.nightKill]
            : null;
        }
      }
    }

    var projection = {
      view: view,
      agentView: buildWerewolfAgentView(view),
    };
    var agentIntent = this.agentIntent(
      state,
      playerId,
      isDead,
      isSpectator,
      isGameOver,
    );
    if (agentIntent !== undefined) projection.agent = agentIntent;
    return projection;
  },

  opportunities: function (state, actorId) {
    var chatChannels, chatOpportunities;
    if (actorId === "__system__") {
      if (state.phase === "roleReveal")
        return [phaseTimerOpportunity("roleReveal", 5000, "Reveal roles.")];
      if (state.phase === "day_discussion")
        return [
          phaseTimerOpportunity(
            "day_discussion",
            90000,
            "Discuss before the vote.",
          ),
        ];
      if (state.phase === "night")
        return [
          phaseTimerOpportunity(
            "night",
            45000,
            "Resolve any missing night actions.",
          ),
        ];
      if (state.phase === "day_result")
        return [
          phaseTimerOpportunity("day_result", 8000, "Show the vote result."),
        ];
      if (state.phase === "night_result")
        return [
          phaseTimerOpportunity("night_result", 8000, "Show the night result."),
        ];
      if (state.phase === "gameOver")
        return [
          phaseTimerOpportunity("gameOver", 8000, "Show the winning team."),
        ];
      return [];
    }

    if (state.players.indexOf(actorId) === -1) return [];

    if (!state.alive[actorId]) {
      return buildChatOpportunities(["eliminated"]);
    }

    chatChannels = ["room", "whisper", "spectator"];
    chatOpportunities = buildChatOpportunities(chatChannels);

    if (state.phase === "day_vote") {
      if (state.votes[actorId] !== undefined) return chatOpportunities;
      return [
        {
          id: "day_vote:" + actorId,
          kind: "turn",
          prompt:
            playerName(state, actorId) +
            ", vote to eliminate a living player by username or skip the vote.",
          visibility: "private",
          priority: 0,
          decision: { type: "choose", options: dayVoteOptions(state) },
          deadline: {
            id: "day_vote:" + actorId,
            timeoutMs: 60000,
            onExpire: { type: "day_vote", target: "skip" },
          },
          chat: {
            channels: chatChannels,
            defaultChannel: "room",
            canSend: true,
          },
          submitPolicy: "once",
        },
      ].concat(chatOpportunities.slice(1));
    }

    if (state.phase === "night") {
      var options = nightOptionsForActor(state, actorId);
      if (options.length === 0) return chatOpportunities;
      return [
        {
          id: "night:" + actorId,
          kind: "turn",
          prompt:
            playerName(state, actorId) +
            ", submit your " +
            state.roles[actorId] +
            " night action using the labeled player targets.",
          visibility: "private",
          priority: 0,
          decision: { type: "choose", options: options },
          chat: {
            channels: chatChannels,
            defaultChannel: "room",
            canSend: true,
          },
          submitPolicy: "once",
        },
      ].concat(chatOpportunities.slice(1));
    }

    return chatOpportunities;
  },

  outcome: function (state) {
    var winner =
      state.gameWinner ||
      (state.phase === "gameOver" ? state.internalPendingWinner : null);
    if (!winner) return null;
    return {
      type: "winners",
      playerIds: winner.winners,
      summary: winner.summary,
    };
  },

  agentIntent: function (state, playerId, isDead, isSpectator, isGameOver) {
    return undefined;
  },

  // === Micro-Predictions (optional, separate from project) ===

  predictions: function (state) {
    if (state.phase !== "day_discussion") return null;

    var alive = livingPlayers(state);
    if (alive.length < 3) return null;

    return alive.map(function (p) {
      return {
        id: "vote_target_" + p,
        question: "Will {0} be eliminated today?",
        targetPlayer: p,
      };
    });
  },

  resolve: function (state, predictionId, baselineState) {
    if (predictionId.indexOf("vote_target_") !== 0) return null;
    var targetId = predictionId.slice("vote_target_".length);

    if (
      state.phase === "day_result" ||
      state.phase === "night" ||
      state.phase === "night_result" ||
      state.phase === "gameOver" ||
      state.phase === "finished"
    ) {
      return state.eliminated === targetId;
    }

    if (state.round > baselineState.round) {
      return false;
    }

    return null;
  },

  validate: function () {
    return { ok: true };
  },
};

// Export for tests — the platform loader strips this
export default GameLogic;
