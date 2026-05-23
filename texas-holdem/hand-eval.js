/* ===== HAND EVALUATOR + WIN PROBABILITY ===== */

var HandEval = {
  internalRankVal: {
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    T: 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
  },
  internalSuitVal: { s: 0, h: 1, d: 2, c: 3 },

  HIGH_CARD: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  THREE_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_KIND: 7,
  STRAIGHT_FLUSH: 8,
  ROYAL_FLUSH: 9,

  internalHandNames: [
    "High Card",
    "Pair",
    "Two Pair",
    "Three of a Kind",
    "Straight",
    "Flush",
    "Full House",
    "Four of a Kind",
    "Straight Flush",
    "Royal Flush",
  ],

  internalToNum: function (card) {
    return [
      HandEval.internalRankVal[card.rank] || 0,
      HandEval.internalSuitVal[card.suit] || 0,
    ];
  },

  internalEval5: function (cards) {
    var ranks = cards
      .map(function (c) {
        return c[0];
      })
      .toSorted(function (a, b) {
        return b - a;
      });
    var suits = cards.map(function (c) {
      return c[1];
    });
    var isFlush =
      suits[0] === suits[1] &&
      suits[1] === suits[2] &&
      suits[2] === suits[3] &&
      suits[3] === suits[4];
    var isStraight = false;
    var straightHigh = 0;
    if (ranks[0] - ranks[4] === 4 && new Set(ranks).size === 5) {
      isStraight = true;
      straightHigh = ranks[0];
    }
    if (
      !isStraight &&
      ranks[0] === 14 &&
      ranks[1] === 5 &&
      ranks[2] === 4 &&
      ranks[3] === 3 &&
      ranks[4] === 2
    ) {
      isStraight = true;
      straightHigh = 5;
    }
    if (isFlush && isStraight) {
      return { rank: straightHigh === 14 ? 9 : 8, kickers: [straightHigh] };
    }
    var counts = {};
    for (var ci = 0; ci < 5; ci++)
      counts[ranks[ci]] = (counts[ranks[ci]] || 0) + 1;
    var groups = [];
    for (var r in counts) groups.push([parseInt(r, 10), counts[r]]);
    groups.sort(function (a, b) {
      return b[1] - a[1] || b[0] - a[0];
    });

    if (groups[0][1] === 4)
      return { rank: 7, kickers: [groups[0][0], groups[1][0]] };
    if (groups[0][1] === 3 && groups[1][1] === 2)
      return { rank: 6, kickers: [groups[0][0], groups[1][0]] };
    if (isFlush) return { rank: 5, kickers: ranks };
    if (isStraight) return { rank: 4, kickers: [straightHigh] };
    if (groups[0][1] === 3)
      return { rank: 3, kickers: [groups[0][0], groups[1][0], groups[2][0]] };
    if (groups[0][1] === 2 && groups[1][1] === 2) {
      var ph = Math.max(groups[0][0], groups[1][0]);
      var pl = Math.min(groups[0][0], groups[1][0]);
      return { rank: 2, kickers: [ph, pl, groups[2][0]] };
    }
    if (groups[0][1] === 2)
      return {
        rank: 1,
        kickers: [groups[0][0], groups[1][0], groups[2][0], groups[3][0]],
      };
    return { rank: 0, kickers: ranks };
  },

  internalCompare: function (a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    for (var ki = 0; ki < Math.min(a.kickers.length, b.kickers.length); ki++) {
      if (a.kickers[ki] !== b.kickers[ki]) return a.kickers[ki] - b.kickers[ki];
    }
    return 0;
  },

  internalCombos5: function (arr) {
    var out = [];
    var n = arr.length;
    for (var a = 0; a < n - 4; a++)
      for (var b = a + 1; b < n - 3; b++)
        for (var c = b + 1; c < n - 2; c++)
          for (var d = c + 1; d < n - 1; d++)
            for (var e = d + 1; e < n; e++)
              out.push([arr[a], arr[b], arr[c], arr[d], arr[e]]);
    return out;
  },

  evaluate: function (cards) {
    var nums = cards.map(function (card) {
      return HandEval.internalToNum(card);
    });
    if (nums.length === 5) {
      var res = HandEval.internalEval5(nums);
      res.name = HandEval.internalHandNames[res.rank];
      return res;
    }
    /* < 5 cards (pre-flop 2 cards, or partial board 3-4). Check for pair only. */
    if (nums.length < 5) {
      var ranks = nums.map(function (c) {
        return c[0];
      });
      var hasPair = false;
      for (var pi = 0; pi < ranks.length; pi++) {
        for (var pj = pi + 1; pj < ranks.length; pj++) {
          if (ranks[pi] === ranks[pj]) {
            hasPair = true;
            break;
          }
        }
        if (hasPair) break;
      }
      return hasPair
        ? {
            rank: 1,
            name: "Pair",
            kickers: ranks.toSorted(function (a, b) {
              return b - a;
            }),
          }
        : {
            rank: 0,
            name: "High Card",
            kickers: ranks.toSorted(function (a, b) {
              return b - a;
            }),
          };
    }
    var combos = HandEval.internalCombos5(nums);
    var best = null;
    for (var ci = 0; ci < combos.length; ci++) {
      var e = HandEval.internalEval5(combos[ci]);
      if (!best || HandEval.internalCompare(e, best) > 0) best = e;
    }
    best.name = HandEval.internalHandNames[best.rank];
    return best;
  },

  winProbability: function (players, community) {
    if (players.length === 0) return {};

    var allRanks = [
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "T",
      "J",
      "Q",
      "K",
      "A",
    ];
    var allSuits = ["s", "h", "d", "c"];
    var known = {};
    var mi;
    for (mi = 0; mi < community.length; mi++)
      known[community[mi].rank + community[mi].suit] = true;
    for (var pp = 0; pp < players.length; pp++) {
      for (var pc = 0; pc < players[pp].cards.length; pc++) {
        known[players[pp].cards[pc].rank + players[pp].cards[pc].suit] = true;
      }
    }
    var deck = [];
    for (var ri = 0; ri < allRanks.length; ri++) {
      for (var si = 0; si < allSuits.length; si++) {
        var key = allRanks[ri] + allSuits[si];
        if (!known[key]) deck.push({ rank: allRanks[ri], suit: allSuits[si] });
      }
    }

    var remaining = 5 - community.length;
    var wins = {};
    var ties = {};
    var total = 0;
    for (var p0 = 0; p0 < players.length; p0++) {
      wins[players[p0].id] = 0;
      ties[players[p0].id] = 0;
    }

    if (remaining === 0) {
      var evals = [];
      for (var p1 = 0; p1 < players.length; p1++) {
        evals.push({
          id: players[p1].id,
          ev: HandEval.evaluate(players[p1].cards.concat(community)),
        });
      }
      var bestEv = evals[0].ev;
      for (var p2 = 1; p2 < evals.length; p2++) {
        if (HandEval.internalCompare(evals[p2].ev, bestEv) > 0)
          bestEv = evals[p2].ev;
      }
      var result = {};
      var wc = 0;
      for (var p3 = 0; p3 < evals.length; p3++) {
        if (HandEval.internalCompare(evals[p3].ev, bestEv) === 0) wc++;
      }
      for (var p4 = 0; p4 < evals.length; p4++) {
        var isW = HandEval.internalCompare(evals[p4].ev, bestEv) === 0;
        result[evals[p4].id] = {
          pct: isW ? Math.round(100 / wc) : 0,
          handName: evals[p4].ev.name,
        };
      }
      return result;
    }

    if (remaining === 1) {
      for (var d1 = 0; d1 < deck.length; d1++) {
        HandEval.internalScoreRound(
          players,
          community.concat([deck[d1]]),
          wins,
          ties,
        );
        total++;
      }
    } else if (remaining === 2) {
      for (var d2 = 0; d2 < deck.length - 1; d2++) {
        for (var d3 = d2 + 1; d3 < deck.length; d3++) {
          HandEval.internalScoreRound(
            players,
            community.concat([deck[d2], deck[d3]]),
            wins,
            ties,
          );
          total++;
        }
      }
    } else {
      /* 3+ cards remaining: deterministic sampling.
         Math.random() throws in sandboxed iframes, so no Monte Carlo.
         Enumerate up to 2000 evenly-spaced combos from the deck. */
      var deckLen = deck.length;
      var step = Math.max(1, Math.floor(deckLen / 15));
      for (var d4 = 0; d4 < deckLen; d4 += step) {
        for (var d5 = d4 + 1; d5 < deckLen; d5 += step) {
          if (remaining >= 3) {
            for (var d6 = d5 + 1; d6 < deckLen; d6 += step) {
              var b3 = community.concat([deck[d4], deck[d5], deck[d6]]);
              if (remaining >= 4) {
                for (var d7 = d6 + 1; d7 < deckLen; d7 += step) {
                  if (remaining >= 5) {
                    for (var d8 = d7 + 1; d8 < deckLen; d8 += step) {
                      HandEval.internalScoreRound(
                        players,
                        community.concat([
                          deck[d4],
                          deck[d5],
                          deck[d6],
                          deck[d7],
                          deck[d8],
                        ]),
                        wins,
                        ties,
                      );
                      total++;
                    }
                  } else {
                    HandEval.internalScoreRound(
                      players,
                      community.concat([
                        deck[d4],
                        deck[d5],
                        deck[d6],
                        deck[d7],
                      ]),
                      wins,
                      ties,
                    );
                    total++;
                  }
                }
              } else {
                HandEval.internalScoreRound(players, b3, wins, ties);
                total++;
              }
              if (total > 2000) break;
            }
          } else {
            HandEval.internalScoreRound(
              players,
              community.concat([deck[d4], deck[d5]]),
              wins,
              ties,
            );
            total++;
          }
          if (total > 2000) break;
        }
        if (total > 2000) break;
      }
    }

    var finalResult = {};
    for (var p5 = 0; p5 < players.length; p5++) {
      var pid = players[p5].id;
      var currentHand = HandEval.evaluate(players[p5].cards.concat(community));
      finalResult[pid] = {
        pct:
          total > 0
            ? Math.round(((wins[pid] + ties[pid]) / total) * 100)
            : 0,
        handName: currentHand.name,
      };
    }
    return finalResult;
  },

  internalScoreRound: function (players, board, wins, ties) {
    var evals = [];
    for (var i = 0; i < players.length; i++) {
      evals.push({
        id: players[i].id,
        ev: HandEval.evaluate(players[i].cards.concat(board)),
      });
    }
    var bestEv = evals[0].ev;
    for (var j = 1; j < evals.length; j++) {
      if (HandEval.internalCompare(evals[j].ev, bestEv) > 0)
        bestEv = evals[j].ev;
    }
    var winnerIds = [];
    for (var k = 0; k < evals.length; k++) {
      if (HandEval.internalCompare(evals[k].ev, bestEv) === 0)
        winnerIds.push(evals[k].id);
    }
    if (winnerIds.length === 1) {
      wins[winnerIds[0]]++;
    } else {
      var share = 1 / winnerIds.length;
      for (var t = 0; t < winnerIds.length; t++) ties[winnerIds[t]] += share;
    }
  },
};
