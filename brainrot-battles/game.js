var GameLogic = {
  rules: {
    visibility: "viewer-specific",
    spectator: "god-view",
    seats: { eliminated: "player-view", disconnected: "player-view" },
  },

  internalTEAM_SIZE: 3,

  internalBRAINROTS: [
    {
      id: "tralalero",
      name: "Tralalero Tralala",
      emoji: "🦈",
      color: "#3b82f6",
      maxHp: 110,
      attacks: [
        { name: "Nike Swoosh", min: 16, max: 24, heal: 0 },
        { name: "Shark Bite", min: 22, max: 32, heal: 0 },
        { name: "Skate Kick", min: 18, max: 28, heal: 0 },
        { name: "Tralala Song", min: 26, max: 38, heal: 0 },
      ],
    },
    {
      id: "bombardiro",
      name: "Bombardiro Crocodilo",
      emoji: "🐊",
      color: "#16a34a",
      maxHp: 120,
      attacks: [
        { name: "Drop Bomb", min: 24, max: 40, heal: 0 },
        { name: "Croc Chomp", min: 15, max: 22, heal: 5 },
        { name: "Air Strike", min: 30, max: 46, heal: 0 },
        { name: "Engine Roar", min: 10, max: 18, heal: 12 },
      ],
    },
    {
      id: "tungtung",
      name: "Tung Tung Tung Sahur",
      emoji: "🪵",
      color: "#a16207",
      maxHp: 115,
      attacks: [
        { name: "Bat Smack", min: 20, max: 30, heal: 0 },
        { name: "Sahur Chant", min: 14, max: 22, heal: 10 },
        { name: "Wooden Slam", min: 22, max: 32, heal: 0 },
        { name: "Midnight Strike", min: 28, max: 40, heal: 0 },
      ],
    },
    {
      id: "lirili",
      name: "Lirili Larila",
      emoji: "🌵",
      color: "#84cc16",
      maxHp: 125,
      attacks: [
        { name: "Cactus Stab", min: 20, max: 28, heal: 0 },
        { name: "Trunk Slap", min: 18, max: 26, heal: 0 },
        { name: "Desert Dance", min: 14, max: 22, heal: 15 },
        { name: "Sandstorm", min: 25, max: 36, heal: 0 },
      ],
    },
    {
      id: "chimpanzini",
      name: "Chimpanzini Bananini",
      emoji: "🍌",
      color: "#eab308",
      maxHp: 105,
      attacks: [
        { name: "Banana Peel", min: 18, max: 26, heal: 0 },
        { name: "Monkey Screech", min: 20, max: 28, heal: 0 },
        { name: "Fruit Throw", min: 22, max: 32, heal: 0 },
        { name: "Bananini Slam", min: 28, max: 40, heal: 0 },
      ],
    },
    {
      id: "ballerina",
      name: "Ballerina Cappuccina",
      emoji: "☕",
      color: "#a855f7",
      maxHp: 100,
      attacks: [
        { name: "Pirouette Kick", min: 18, max: 28, heal: 0 },
        { name: "Coffee Splash", min: 22, max: 30, heal: 0 },
        { name: "Grand Jeté", min: 28, max: 42, heal: 0 },
        { name: "Espresso Shot", min: 14, max: 20, heal: 12 },
      ],
    },
  ],

  internalRng: function (seed) {
    var s = seed | 0;
    if (s <= 0) s = s + 2147483647 || 1;
    return function () {
      s = (s * 16807) % 2147483647;
      if (s <= 0) s += 2147483647;
      return s / 2147483647;
    };
  },

  internalGetBrainrot: function (id) {
    for (var i = 0; i < this.internalBRAINROTS.length; i++) {
      if (this.internalBRAINROTS[i].id === id) return this.internalBRAINROTS[i];
    }
    return null;
  },

  internalRosterView: function () {
    return this.internalBRAINROTS.map(function (b) {
      return {
        id: b.id,
        name: b.name,
        emoji: b.emoji,
        color: b.color,
        maxHp: b.maxHp,
        attacks: b.attacks.map(function (a) {
          return { name: a.name, min: a.min, max: a.max, heal: a.heal };
        }),
      };
    });
  },

  internalTeamsView: function (state) {
    var self = this;
    return state.teams.map(function (team) {
      return team.map(function (m) {
        var br = self.internalGetBrainrot(m.id);
        return {
          id: m.id,
          name: br.name,
          emoji: br.emoji,
          color: br.color,
          hp: m.hp,
          maxHp: m.maxHp,
          fainted: m.hp <= 0,
          attacks: br.attacks.map(function (a) {
            return { name: a.name, min: a.min, max: a.max, heal: a.heal };
          }),
        };
      });
    });
  },

  internalCloneTeams: function (teams) {
    return teams.map(function (team) {
      return team.map(function (m) {
        return { id: m.id, hp: m.hp, maxHp: m.maxHp };
      });
    });
  },

  internalBuildTeams: function (drafts) {
    var self = this;
    return drafts.map(function (draft) {
      return draft.map(function (id) {
        var br = self.internalGetBrainrot(id);
        return { id: id, hp: br.maxHp, maxHp: br.maxHp };
      });
    });
  },

  _firstAvailablePick: function (draft) {
    for (var i = 0; i < this.internalBRAINROTS.length; i++) {
      if (draft.indexOf(this.internalBRAINROTS[i].id) === -1)
        return this.internalBRAINROTS[i].id;
    }
    return null;
  },

  _firstSwitchIdx: function (team, currentIdx) {
    for (var i = 0; i < team.length; i++) {
      if (team[i].hp > 0 && i !== currentIdx) return i;
    }
    return -1;
  },

  internalDecisionOf: function (option) {
    if (option && typeof option === "object" && option.decision !== undefined)
      return option.decision;
    return option;
  },

  internalPlayerName: function (state, playerId) {
    return (state.playerNames && state.playerNames[playerId]) || playerId;
  },

  internalAttackText: function (attack) {
    if (!attack) return "unknown attack";
    return (
      attack.name +
      " " +
      attack.min +
      "-" +
      attack.max +
      " damage" +
      (attack.heal ? ", heals " + attack.heal : "")
    );
  },

  internalActionOption: function (state, playerId, action) {
    var pIdx = state.players.indexOf(playerId);
    var br, team, mon, active, attack;
    if (!action || !action.type) return action;
    if (action.type === "pick") {
      br = this.internalGetBrainrot(action.id);
      return {
        decision: action,
        label:
          "Draft " +
          (br ? br.name : action.id) +
          (br
            ? " with " +
              br.maxHp +
              " HP and attacks: " +
              br.attacks
                .map(function (a) {
                  return this.internalAttackText(a);
                }, this)
                .join("; ")
            : ""),
      };
    }
    if (action.type === "switch") {
      team = pIdx >= 0 ? state.teams[pIdx] : null;
      mon = team && team[action.idx];
      br = mon ? this.internalGetBrainrot(mon.id) : null;
      return {
        decision: action,
        label:
          "Switch to " +
          (br ? br.name : "team slot " + action.idx) +
          (mon ? " at " + mon.hp + "/" + mon.maxHp + " HP" : ""),
      };
    }
    if (action.type === "attack") {
      team = pIdx >= 0 ? state.teams[pIdx] : null;
      active = team && team[state.activeIdx[pIdx]];
      br = active ? this.internalGetBrainrot(active.id) : null;
      attack = br ? br.attacks[action.attackIdx] : null;
      return {
        decision: action,
        label:
          "Use " +
          this.internalAttackText(attack) +
          (br ? " with " + br.name : ""),
      };
    }
    return action;
  },

  setup: function (ctx) {
    var players = ctx.players.map(function (p) {
      return p.id;
    });
    var playerNames = {};
    for (var pn = 0; pn < ctx.players.length; pn++)
      playerNames[ctx.players[pn].id] =
        ctx.players[pn].name || ctx.players[pn].id;
    var drafts = players.map(function () {
      return [];
    });
    // The iframe runtime does not forward ctx.seed, only ctx.random (same PRNG
    // on both server engine and client replay). Derive a stable seed from it
    // so apply() stays deterministic in both paths. ctx.random is the
    // SeededRandom object; use .integer() for a reproducible integer.
    var derivedSeed = ctx.random.integer(1, 2147483646);
    return {
      phase: "draft",
      players: players,
      playerNames: playerNames,
      seed: derivedSeed,
      actionCount: 0,
      drafts: drafts,
      teams: [],
      activeIdx: [0, 0],
      currentTurn: 0,
      needsSwitchIdx: -1,
      log: ["Pick your 3 brainrots!"],
      lastAttack: null,
      winnerIdx: -1,
    };
  },

  actions: function (state, playerId) {
    if (state.phase === "game_over") return [];
    var pIdx = state.players.indexOf(playerId);
    if (pIdx === -1) return [];

    if (state.phase === "draft") {
      var myDraft = state.drafts[pIdx];
      if (myDraft.length >= this.internalTEAM_SIZE) return [];
      var res = [];
      for (var i = 0; i < this.internalBRAINROTS.length; i++) {
        var b = this.internalBRAINROTS[i];
        if (myDraft.indexOf(b.id) === -1) res.push({ type: "pick", id: b.id });
      }
      return res;
    }

    if (state.phase === "battle") {
      if (state.needsSwitchIdx !== -1) {
        if (state.needsSwitchIdx !== pIdx) return [];
        var team = state.teams[pIdx];
        var out = [];
        for (var j = 0; j < team.length; j++) {
          if (team[j].hp > 0 && j !== state.activeIdx[pIdx]) {
            out.push({ type: "switch", idx: j });
          }
        }
        return out;
      }
      if (state.currentTurn !== pIdx) return [];
      var myTeam = state.teams[pIdx];
      var active = myTeam[state.activeIdx[pIdx]];
      var br = this.internalGetBrainrot(active.id);
      return br.attacks.map(function (_, attackIndex) {
        return { type: "attack", attackIdx: attackIndex };
      });
    }

    return [];
  },

  apply: function (state, playerId, action) {
    action = this.internalDecisionOf(action);
    if (!action) return state;

    var pIdx = state.players.indexOf(playerId);

    if (state.phase === "draft" && action.type === "pick") {
      if (pIdx === -1) return state;
      var myDraft = state.drafts[pIdx];
      if (myDraft.length >= this.internalTEAM_SIZE) return state;
      if (myDraft.indexOf(action.id) !== -1) return state;
      if (!this.internalGetBrainrot(action.id)) return state;

      var newDrafts = state.drafts.map(function (d) {
        return d.slice();
      });
      newDrafts[pIdx] = newDrafts[pIdx].concat([action.id]);

      var self = this;
      var allDone = newDrafts.every(function (d) {
        return d.length >= self.internalTEAM_SIZE;
      });
      if (allDone) {
        var teams = this.internalBuildTeams(newDrafts);
        return {
          phase: "battle",
          players: state.players,
          playerNames: state.playerNames,
          seed: state.seed,
          actionCount: state.actionCount + 1,
          drafts: newDrafts,
          teams: teams,
          activeIdx: [0, 0],
          currentTurn: 0,
          needsSwitchIdx: -1,
          log: state.log.concat(["Battle begins!"]),
          lastAttack: null,
          winnerIdx: -1,
        };
      }
      return {
        phase: state.phase,
        players: state.players,
        playerNames: state.playerNames,
        seed: state.seed,
        actionCount: state.actionCount + 1,
        drafts: newDrafts,
        teams: state.teams,
        activeIdx: state.activeIdx,
        currentTurn: state.currentTurn,
        needsSwitchIdx: state.needsSwitchIdx,
        log: state.log,
        lastAttack: state.lastAttack,
        winnerIdx: state.winnerIdx,
      };
    }

    if (state.phase === "battle") {
      if (action.type === "switch") {
        if (state.needsSwitchIdx === -1 || state.needsSwitchIdx !== pIdx)
          return state;
        var team = state.teams[pIdx];
        if (action.idx == null || action.idx < 0 || action.idx >= team.length)
          return state;
        if (team[action.idx].hp <= 0) return state;
        if (action.idx === state.activeIdx[pIdx]) return state;

        var newActive = state.activeIdx.slice();
        newActive[pIdx] = action.idx;
        var switchedBr = this.internalGetBrainrot(team[action.idx].id);
        return {
          phase: state.phase,
          players: state.players,
          playerNames: state.playerNames,
          seed: state.seed,
          actionCount: state.actionCount + 1,
          drafts: state.drafts,
          teams: state.teams,
          activeIdx: newActive,
          currentTurn: pIdx,
          needsSwitchIdx: -1,
          log: state.log.concat([
            state.players[pIdx] + " sent in " + switchedBr.name + "!",
          ]),
          lastAttack: state.lastAttack,
          winnerIdx: state.winnerIdx,
        };
      }

      if (action.type === "attack") {
        if (state.needsSwitchIdx !== -1) return state;
        if (pIdx !== state.currentTurn) return state;
        var attackerIdx = pIdx;
        var defenderIdx = 1 - attackerIdx;
        var myMon = state.teams[attackerIdx][state.activeIdx[attackerIdx]];
        if (!myMon || myMon.hp <= 0) return state;
        var myBr = this.internalGetBrainrot(myMon.id);
        var atk = myBr.attacks[action.attackIdx];
        if (!atk) return state;
        var oppMon = state.teams[defenderIdx][state.activeIdx[defenderIdx]];
        var oppBr = this.internalGetBrainrot(oppMon.id);

        var rand = this.internalRng(state.seed + state.actionCount * 17 + 1);
        var spread = atk.max - atk.min + 1;
        var damage = atk.min + Math.floor(rand() * spread);
        if (damage > atk.max) damage = atk.max;
        if (damage < atk.min) damage = atk.min;

        var newTeams = this.internalCloneTeams(state.teams);
        var newDefHp = Math.max(0, oppMon.hp - damage);
        newTeams[defenderIdx][state.activeIdx[defenderIdx]].hp = newDefHp;

        var healAmount = 0;
        if (atk.heal && atk.heal > 0 && myMon.hp > 0) {
          var newAtkHp = Math.min(myMon.maxHp, myMon.hp + atk.heal);
          healAmount = newAtkHp - myMon.hp;
          newTeams[attackerIdx][state.activeIdx[attackerIdx]].hp = newAtkHp;
        }

        var logEntry =
          myBr.name + " used " + atk.name + " (" + damage + " dmg)";
        if (healAmount > 0) logEntry += " - healed " + healAmount + " HP";
        var newLog = state.log.concat([logEntry]);
        var lastAttack = {
          attackerIdx: attackerIdx,
          attackerId: myBr.id,
          defenderIdx: defenderIdx,
          defenderId: oppBr.id,
          attackName: atk.name,
          damage: damage,
          heal: healAmount,
        };

        if (newDefHp <= 0) {
          newLog = newLog.concat([oppBr.name + " fainted!"]);
          var remaining = 0;
          for (var k = 0; k < newTeams[defenderIdx].length; k++) {
            if (newTeams[defenderIdx][k].hp > 0) remaining++;
          }
          if (remaining === 0) {
            return {
              phase: "game_over",
              players: state.players,
              playerNames: state.playerNames,
              seed: state.seed,
              actionCount: state.actionCount + 1,
              drafts: state.drafts,
              teams: newTeams,
              activeIdx: state.activeIdx,
              currentTurn: state.currentTurn,
              needsSwitchIdx: -1,
              log: newLog.concat([state.players[attackerIdx] + " wins!"]),
              lastAttack: lastAttack,
              winnerIdx: attackerIdx,
            };
          }
          return {
            phase: state.phase,
            players: state.players,
            playerNames: state.playerNames,
            seed: state.seed,
            actionCount: state.actionCount + 1,
            drafts: state.drafts,
            teams: newTeams,
            activeIdx: state.activeIdx,
            currentTurn: state.currentTurn,
            needsSwitchIdx: defenderIdx,
            log: newLog,
            lastAttack: lastAttack,
            winnerIdx: state.winnerIdx,
          };
        }

        return {
          phase: state.phase,
          players: state.players,
          playerNames: state.playerNames,
          seed: state.seed,
          actionCount: state.actionCount + 1,
          drafts: state.drafts,
          teams: newTeams,
          activeIdx: state.activeIdx,
          currentTurn: 1 - state.currentTurn,
          needsSwitchIdx: -1,
          log: newLog,
          lastAttack: lastAttack,
          winnerIdx: state.winnerIdx,
        };
      }
    }

    return state;
  },

  project: function (state, playerId) {
    return {
      view: this.view(state, playerId),
      agentView: this.agentView(state, playerId),
    };
  },

  view: function (state, playerId) {
    var pIdx = playerId == null ? -1 : state.players.indexOf(playerId);
    var base = {
      phase: state.phase,
      players: state.players,
      log: state.log.slice(-12),
      lastAttack: state.lastAttack,
      draftCounts: state.drafts.map(function (d) {
        return d.length;
      }),
    };

    if (state.phase === "draft") {
      base.roster = this.internalRosterView();
      base.myDraft = pIdx >= 0 ? state.drafts[pIdx].slice() : [];
      return base;
    }

    base.teams = this.internalTeamsView(state);
    base.activeIdx = state.activeIdx.slice();
    base.turn = state.players[state.currentTurn];
    base.needsSwitch =
      state.needsSwitchIdx >= 0 ? state.players[state.needsSwitchIdx] : null;

    if (state.phase === "game_over") {
      base.winner =
        state.winnerIdx >= 0 ? state.players[state.winnerIdx] : null;
    }

    return base;
  },

  outcome: function (state) {
    if (state.phase === "game_over" && state.winnerIdx >= 0) {
      var winnerId = state.players[state.winnerIdx];
      return {
        type: "winners",
        playerIds: [winnerId],
        summary:
          this.internalPlayerName(state, winnerId) +
          " wins the Brainrot Battle!",
      };
    }
    return null;
  },

  internalChatChannelsFor: function (state, actorId) {
    if (
      actorId === "__system__" ||
      !state.players ||
      state.players.indexOf(actorId) === -1
    )
      return [];
    if (
      state.eliminated &&
      state.eliminated.indexOf &&
      state.eliminated.indexOf(actorId) !== -1
    )
      return ["eliminated"];
    return ["room", "whisper", "spectator"];
  },

  internalChatOpportunity: function (channel) {
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
  },

  internalChatOpportunities: function (channels) {
    var out = [];
    var i;
    for (i = 0; i < channels.length; i++)
      out.push(this.internalChatOpportunity(channels[i]));
    return out;
  },

  opportunities: function (state, actorId) {
    var rawActions, options, timeoutMs, prompt, i, chatChannels, opportunity;
    if (this.outcome(state) !== null) return [];
    if (state.players.indexOf(actorId) === -1) return [];
    chatChannels = this.internalChatChannelsFor(state, actorId);

    rawActions = this.actions(state, actorId);
    if (rawActions.length === 0)
      return this.internalChatOpportunities(chatChannels);
    options = [];
    for (i = 0; i < rawActions.length; i++)
      options.push(this.internalActionOption(state, actorId, rawActions[i]));

    if (state.phase === "draft") {
      timeoutMs = 45000;
      prompt =
        this.internalPlayerName(state, actorId) +
        ", draft one brainrot for your team.";
    } else if (state.needsSwitchIdx !== -1) {
      timeoutMs = 30000;
      prompt =
        this.internalPlayerName(state, actorId) +
        ", switch to a living bench brainrot.";
    } else {
      timeoutMs = 30000;
      prompt =
        this.internalPlayerName(state, actorId) +
        ", choose an attack for your active brainrot.";
    }

    /** @type {Object} */

    opportunity = {
      id: "turn",
      kind: "turn",
      prompt: prompt,
      decision: { type: "choose", options: options },
      deadline: {
        id: "turn",
        timeoutMs: timeoutMs,
        onExpire: this.internalDecisionOf(options[0]),
      },
      chat: {
        channels: chatChannels,
        defaultChannel: chatChannels[0] || null,
        canSend: true,
        memberships: chatChannels[0] === "eliminated" ? ["eliminated"] : [],
      },
    };
    return /** @type {Object[]} */ ([opportunity]).concat(
      this.internalChatOpportunities(chatChannels.slice(1)),
    );
  },

  agentView: function (state, playerId) {
    if (state.phase === "draft") {
      var lines = ["=== DRAFT PHASE ==="];
      lines.push("Roster:");
      for (var r = 0; r < this.internalBRAINROTS.length; r++) {
        var b = this.internalBRAINROTS[r];
        var attacks = [];
        for (var a = 0; a < b.attacks.length; a++) {
          var atk = b.attacks[a];
          attacks.push(
            a +
              ":" +
              atk.name +
              " " +
              atk.min +
              "-" +
              atk.max +
              (atk.heal ? " heal " + atk.heal : ""),
          );
        }
        lines.push(
          "  " +
            b.id +
            " - " +
            b.name +
            " HP " +
            b.maxHp +
            " | " +
            attacks.join("; "),
        );
      }
      var pIdx = playerId == null ? -1 : state.players.indexOf(playerId);
      if (pIdx >= 0) {
        var myDraft = state.drafts[pIdx];
        lines.push(
          "Your picks (" +
            myDraft.length +
            "/" +
            this.internalTEAM_SIZE +
            "): " +
            (myDraft.length
              ? myDraft
                  .map(function (id) {
                    var br = GameLogic.internalGetBrainrot(id);
                    return br ? br.name : id;
                  })
                  .join(", ")
              : "(none)"),
        );
      }
      return lines.join("\n");
    }

    if (state.phase === "battle" || state.phase === "game_over") {
      var out = [];
      out.push("=== BATTLE ===");
      for (var i = 0; i < state.players.length; i++) {
        var tag =
          i === state.currentTurn && state.phase === "battle"
            ? " <-- TURN"
            : "";
        var team = state.teams[i];
        out.push(
          this.internalPlayerName(state, state.players[i]) +
            " (" +
            state.players[i] +
            ")" +
            tag,
        );
        for (var j = 0; j < team.length; j++) {
          var m = team[j];
          var br = this.internalGetBrainrot(m.id);
          var marker = j === state.activeIdx[i] ? "[ACTIVE] " : "         ";
          var status = m.hp <= 0 ? "FAINTED" : m.hp + "/" + m.maxHp + " HP";
          out.push("  " + marker + br.name + " - " + status);
        }
      }
      var viewerIdx = playerId == null ? -1 : state.players.indexOf(playerId);
      if (viewerIdx >= 0 && state.teams[viewerIdx]) {
        var active = state.teams[viewerIdx][state.activeIdx[viewerIdx]];
        if (active) {
          var activeBrainrot = this.internalGetBrainrot(active.id);
          var activeAttacks = [];
          for (var ai = 0; ai < activeBrainrot.attacks.length; ai++) {
            var activeAttack = activeBrainrot.attacks[ai];
            activeAttacks.push(
              ai +
                ":" +
                activeAttack.name +
                " " +
                activeAttack.min +
                "-" +
                activeAttack.max +
                (activeAttack.heal ? " heal " + activeAttack.heal : ""),
            );
          }
          out.push("Your active attacks: " + activeAttacks.join("; "));
        }
      }
      if (state.needsSwitchIdx !== -1) {
        out.push(
          this.internalPlayerName(state, state.players[state.needsSwitchIdx]) +
            " must switch!",
        );
      }
      if (state.lastAttack) {
        var lastAttacker = this.internalGetBrainrot(
          state.lastAttack.attackerId,
        );
        var lastDefender = this.internalGetBrainrot(
          state.lastAttack.defenderId,
        );
        out.push(
          "Last attack: " +
            (lastAttacker ? lastAttacker.name : state.lastAttack.attackerId) +
            " used " +
            state.lastAttack.attackName +
            " on " +
            (lastDefender ? lastDefender.name : state.lastAttack.defenderId) +
            " for " +
            state.lastAttack.damage +
            " damage" +
            (state.lastAttack.heal
              ? " and healed " + state.lastAttack.heal
              : ""),
        );
      }
      return out.join("\n");
    }
    return "";
  },

  validate: function () {
    return { ok: true };
  },
};
if (typeof module !== "undefined" && module.exports) {
  module.exports = GameLogic;
  module.exports.default = GameLogic;
}
