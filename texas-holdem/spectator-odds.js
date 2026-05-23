/* ===== SPECTATOR ODDS — Unified win% + hand name display ===== */
/*
 * Single owner of _handName and _winPct labels on PlayerNode for spectators.
 * Active player showdown labels are handled by updateFromView (revealedHand branch).
 *
 *   SpectatorOdds.update(view, context)    ← from onStateChange, all phases
 *   SpectatorOdds.onCardRevealed(count)    ← from all-in animation callback
 */

var SpectatorOdds = {
  internalCache: null /* { key: string, probs: object } — memoized odds */,
  internalLastView: null /* cached view for onCardRevealed */,
  internalLastCCLen: 0 /* community card count from last update (detect all-in animation) */,

  /**
   * Main entry point. Called from onStateChange after PlayerNode updates.
   * Only runs for spectators (view.allHands exists).
   * @param {object} view - The current spectator projection.
   * @param {object} context - Viewer context for the current render.
   */
  update: function (view, context) {
    if (!view?.allHands) return;

    /* Cache view for progressive updates */
    SpectatorOdds.internalLastView = view;

    var cc = view.communityCards || [];

    /* ── Showdown: check BEFORE active player count ── */
    if (view.phase === "showdown") {
      /* Detect all-in runout: new CC arriving with animation */
      if (
        cc.length > SpectatorOdds.internalLastCCLen &&
        SpectatorOdds.internalLastCCLen >= 0
      ) {
        /* Cards are being animated — defer to onCardRevealed for progressive display.
           Don't update labels now or we'd spoil the outcome. */
        SpectatorOdds.internalLastCCLen = cc.length;
        return;
      }
      SpectatorOdds.internalLastCCLen = cc.length;

      if (view.revealedHands) {
        /* Normal showdown: use server-provided hand names + compute final win% */
        SpectatorOdds.internalApplyShowdownLabels(view);
      } else if (view.result?.byFold) {
        /* Fold-win: compute hand names from godHand + community cards */
        SpectatorOdds.internalApplyFoldWinLabels(view);
      }
      return;
    }

    SpectatorOdds.internalLastCCLen = cc.length;

    /* ── Normal play (pre-flop through river) ── */
    var players = SpectatorOdds.internalBuildPlayerList(view);
    if (players.length < 2) {
      SpectatorOdds.internalClearAll();
      return;
    }

    /* Compute odds */
    var probs = SpectatorOdds.internalCompute(players, cc);
    if (!probs) return;

    /* Apply labels to all nodes */
    SpectatorOdds.internalApplyLabels(probs, view);
  },

  /**
   * Progressive update during all-in runout animation.
   * Called from card reveal callback after each card flips.
   * @param {number} count - Number of community cards currently visible.
   */
  onCardRevealed: function (count) {
    var view = SpectatorOdds.internalLastView;
    if (!view?.allHands) return;

    var cc = view.communityCards || [];
    if (count < 3 || count > cc.length) return; /* need at least flop */

    var revealedCC = cc.slice(0, count);

    /* Build player list from allHands (for spectator) or revealedHands (for player) */
    var players = [];
    if (view.revealedHands) {
      var ids = Object.keys(view.revealedHands);
      for (var i = 0; i < ids.length; i++) {
        var rh = view.revealedHands[ids[i]];
        if (rh?.cards && rh.cards.length >= 2) {
          players.push({ id: ids[i], cards: rh.cards });
        }
      }
    } else if (view.allHands) {
      players = SpectatorOdds.internalBuildPlayerList(view);
    }
    if (players.length < 2) return;

    var probs = SpectatorOdds.internalCompute(players, revealedCC);
    if (!probs) return;

    SpectatorOdds.internalApplyLabels(probs, view);
  },

  /* ── Internal helpers ── */

  internalBuildPlayerList: function (view) {
    var players = [];
    var ids = Object.keys(view.allHands);
    for (var i = 0; i < ids.length; i++) {
      var hand = view.allHands[ids[i]];
      if (!hand || hand.length < 2) continue;
      /* Skip folded/eliminated */
      var pData = null;
      if (view.players) {
        for (var j = 0; j < view.players.length; j++) {
          if (view.players[j].id === ids[i]) {
            pData = view.players[j];
            break;
          }
        }
      }
      if (pData && (pData.folded || pData.eliminated)) continue;
      players.push({ id: ids[i], cards: hand });
    }
    return players;
  },

  internalCompute: function (players, cc) {
    /* Memoize: skip recompute if community cards + active hands unchanged */
    var playerKeys = players
      .map(function (p) {
        var cards = (p.cards || [])
          .map(function (c) {
            return c.rank + c.suit;
          })
          .join("");
        return p.id + ":" + cards;
      })
      .toSorted()
      .join(",");
    var cacheKey =
      (cc || [])
        .map(function (c) {
          return c.rank + c.suit;
        })
        .join(",") +
      "|" +
      playerKeys;
    if (
      SpectatorOdds.internalCache &&
      SpectatorOdds.internalCache.key === cacheKey
    ) {
      return SpectatorOdds.internalCache.probs;
    }

    var probs;
    try {
      probs = HandEval.winProbability(players, cc);
    } catch (e) {
      console.warn("[holdem] SpectatorOdds: HandEval.winProbability threw:", e);
      return null;
    }

    SpectatorOdds.internalCache = { key: cacheKey, probs: probs };
    return probs;
  },

  internalApplyLabels: function (probs, view) {
    var allKeys = Object.keys(PlayerNode.internalNodes);
    for (var i = 0; i < allKeys.length; i++) {
      var node = PlayerNode.internalNodes[allKeys[i]];
      if (probs[allKeys[i]]) {
        node.internalHandName.text = probs[allKeys[i]].handName;
        node.internalHandName.visible = true;
        var pct = probs[allKeys[i]].pct;
        node.internalWinPct.text = pct + "%";
        node.internalWinPct.visible = true;
        if (pct >= 60) node.internalWinPct.style.fill = C.GREEN;
        else if (pct <= 30) node.internalWinPct.style.fill = 0xf87171;
        else node.internalWinPct.style.fill = C.GOLD;
      } else {
        node.internalWinPct.visible = false;
        node.internalHandName.visible = false;
      }
    }
  },

  internalApplyShowdownLabels: function (view) {
    var winners = view.result?.winners || [];
    var allKeys = Object.keys(PlayerNode.internalNodes);
    for (var i = 0; i < allKeys.length; i++) {
      var pid = allKeys[i];
      var node = PlayerNode.internalNodes[pid];
      var rh = view.revealedHands[pid];
      if (rh) {
        node.internalHandName.text = rh.handName || "";
        node.internalHandName.visible = true;
        var isWinner = winners.indexOf(pid) !== -1;
        node.internalWinPct.text = isWinner ? "100%" : "0%";
        node.internalWinPct.visible = true;
        node.internalWinPct.style.fill = isWinner ? C.GREEN : 0xf87171;
      } else {
        node.internalHandName.visible = false;
        node.internalWinPct.visible = false;
      }
    }
  },

  internalApplyFoldWinLabels: function (view) {
    var winners = view.result?.winners || [];
    var cc = view.communityCards || [];
    var allKeys = Object.keys(PlayerNode.internalNodes);
    for (var i = 0; i < allKeys.length; i++) {
      var pid = allKeys[i];
      var node = PlayerNode.internalNodes[pid];
      var godHand = view.allHands[pid];

      /* Check if player is folded/eliminated */
      var pData = null;
      if (view.players) {
        for (var j = 0; j < view.players.length; j++) {
          if (view.players[j].id === pid) {
            pData = view.players[j];
            break;
          }
        }
      }
      if (!godHand || (pData && (pData.folded || pData.eliminated))) {
        node.internalHandName.visible = false;
        node.internalWinPct.visible = false;
        continue;
      }

      /* Compute hand name from hole cards + community */
      var evalCards = godHand.concat(cc);
      var handEv;
      try {
        handEv = HandEval.evaluate(evalCards);
      } catch (e) {
        handEv = { name: "" };
      }
      node.internalHandName.text = handEv.name || "";
      node.internalHandName.visible = true;

      var isWinner = winners.indexOf(pid) !== -1;
      node.internalWinPct.text = isWinner ? "100%" : "0%";
      node.internalWinPct.visible = true;
      node.internalWinPct.style.fill = isWinner ? C.GREEN : 0xf87171;
    }
  },

  internalClearAll: function () {
    var allKeys = Object.keys(PlayerNode.internalNodes);
    for (var i = 0; i < allKeys.length; i++) {
      var node = PlayerNode.internalNodes[allKeys[i]];
      if (node.internalWinPct) node.internalWinPct.visible = false;
      if (node.internalHandName) node.internalHandName.visible = false;
    }
  },
};
