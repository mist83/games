var GameLogic = (function () {
  var MAX_HP = 30;
  var MAX_EXCHANGES = 20;
  var QUEUE_LENGTH = 3;
  var ATTACK_MS = 1750;
  var FIGHTING_HOLD_MS = 900;
  var FIGHTING_DISPLAY_MS = QUEUE_LENGTH * ATTACK_MS + FIGHTING_HOLD_MS;
  var QUEUE_TIMEOUT_MS = 105000;
  var ATTACK_DAMAGE = 2;
  var STORED_LIGHT_MOVEMENT = 1;
  var STORED_HEAVY_DODGE = 2;
  var STORED_HEAVY_LIGHT = 1;
  var STORED_PRESSURE = 1;
  var COMBO_SECOND_HIT = 2;
  var COMBO_THIRD_HIT = 4;
  var COMBO_SECOND_DODGE = 4;
  var PLAYER_KEYS = ["p1", "p2"];
  var START_FEET = { p1: -1, p2: 1 };

  var MOVE_KIND = {
    MOVEMENT: "movement",
    ATTACK: "attack",
  };
  var COMMITMENT = {
    LIGHT: "light",
    HEAVY: "heavy",
  };
  var RANGE = {
    CLINCH: 0,
    POCKET: 1,
    DISTANCE: 2,
  };
  var RANGE_NAMES = ["Clinch", "Pocket", "Distance"];

  var CHARACTERS = {
    nak_muay: {
      id: "nak_muay",
      name: "Nak Muay",
      subtitle: "Balanced Muay Thai fighter",
      trait:
        "Light attacks tag movement, movement dodges heavy attacks, and heavy attacks stuff light attacks.",
      gameplan:
        "Build stored damage with predictions, then cash it on the next clean hit before it expires after one carried exchange.",
    },
  };

  function movementMove(name, tags, text) {
    return {
      name: name,
      kind: MOVE_KIND.MOVEMENT,
      category: "Movement",
      priority: 0,
      tags: tags,
      text: text,
    };
  }

  function attackMove(name, range, commitment, tags, text) {
    return {
      name: name,
      kind: MOVE_KIND.ATTACK,
      category: "Attacks",
      priority: 1,
      damage: ATTACK_DAMAGE,
      range: range,
      commitment: commitment,
      tags: ["attack"].concat(tags),
      text: text,
    };
  }

  var MOVES = {
    advance: movementMove(
      "Advance",
      ["movement", "closes_distance", "pressure"],
      "Hop one number forward before attacks fire. If the opponent retreats, range stays stable and pressure stores damage.",
    ),
    retreat: movementMove(
      "Retreat",
      ["movement", "opens_distance", "dodges_heavy"],
      "Hop one number backward before attacks fire. Movement dodges heavy attacks and can build stored damage.",
    ),
    roll: movementMove(
      "Roll",
      ["movement", "duck_under", "dodges_heavy"],
      "Duck under committed head attacks. Light attacks can tag the roll; heavy attacks miss.",
    ),
    teep: attackMove(
      "Teep",
      RANGE.DISTANCE,
      COMMITMENT.LIGHT,
      ["distance", "light", "stop_entry"],
      "Light distance kick. Tags movement that ends at distance and stores damage for the next hit.",
    ),
    flying_knee: attackMove(
      "Flying Knee",
      RANGE.DISTANCE,
      COMMITMENT.HEAVY,
      ["distance", "heavy", "committed_entry"],
      "Heavy long-range entry. Stuffs light attacks, but movement makes it miss.",
    ),
    jab: attackMove(
      "Jab",
      RANGE.POCKET,
      COMMITMENT.LIGHT,
      ["pocket", "light", "straight_punch"],
      "Light pocket punch. Tags movement that ends in pocket and stores damage for the next hit.",
    ),
    cross: attackMove(
      "Cross",
      RANGE.POCKET,
      COMMITMENT.HEAVY,
      ["pocket", "heavy", "straight_punch"],
      "Heavy pocket punch. Stuffs light attacks, but movement makes it miss.",
    ),
    elbow: attackMove(
      "Elbow",
      RANGE.CLINCH,
      COMMITMENT.LIGHT,
      ["clinch", "light", "short_range"],
      "Light clinch shot. Tags movement that ends in clinch and stores damage for the next hit.",
    ),
    knee: attackMove(
      "Knee",
      RANGE.CLINCH,
      COMMITMENT.HEAVY,
      ["clinch", "heavy", "short_range"],
      "Heavy clinch knee. Stuffs light attacks, but movement makes it miss.",
    ),
  };

  function actionList(kind) {
    var out = [];
    var action;
    for (action in MOVES) {
      if (MOVES[action].kind === kind) out.push(action);
    }
    return out;
  }

  var MOVEMENT_ACTIONS = actionList(MOVE_KIND.MOVEMENT);
  var ATTACK_ACTIONS = actionList(MOVE_KIND.ATTACK);
  var UNIVERSAL_ACTIONS = MOVEMENT_ACTIONS.concat(ATTACK_ACTIONS);

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function decisionOf(option) {
    if (option && typeof option === "object" && option.decision !== undefined)
      return option.decision;
    return option;
  }

  function playerKey(state, actorId) {
    if (actorId === state.players[0]) return "p1";
    if (actorId === state.players[1]) return "p2";
    return null;
  }

  function otherKey(key) {
    return key === "p1" ? "p2" : "p1";
  }

  function playerName(state, actorId) {
    return (
      (state.playerNames && state.playerNames[actorId]) || actorId || "Player"
    );
  }

  function fighterName(state, key) {
    var fighter = state.fighters[key];
    return playerName(state, fighter.id);
  }

  function characterOf(state, key) {
    return CHARACTERS[state.fighters[key].character];
  }

  function moveName(action) {
    return (MOVES[action] && MOVES[action].name) || action || "Unknown";
  }

  function isAttack(action) {
    var kind = MOVES[action] && MOVES[action].kind;
    return kind === MOVE_KIND.ATTACK;
  }

  function hasRange(action, range) {
    var move = MOVES[action];
    if (
      !move ||
      move.kind !== MOVE_KIND.ATTACK ||
      typeof move.range !== "number"
    )
      return true;
    return move.range === range;
  }

  function legalActionsForCharacter(characterId) {
    return UNIVERSAL_ACTIONS.slice();
  }

  function availableActionsForState(state, key) {
    return legalActionsForCharacter(state.fighters[key].character);
  }

  function isLegalActionFor(state, key, action) {
    var character = state.fighters[key].character;
    return legalActionsForCharacter(character).indexOf(action) !== -1;
  }

  function rawPlanFromDecision(source) {
    if (
      source &&
      (typeof source.attack1 === "string" ||
        typeof source.attack2 === "string" ||
        typeof source.attack3 === "string")
    ) {
      return [source.attack1, source.attack2, source.attack3];
    }
    return source && Array.isArray(source.plan) ? source.plan : [];
  }

  function normalizePlan(state, key, decision) {
    var source = decision && typeof decision === "object" ? decision : {};
    var rawPlan = rawPlanFromDecision(source);
    var cleanPlan = [];
    var i;
    for (i = 0; i < QUEUE_LENGTH; i++) {
      var action = typeof rawPlan[i] === "string" ? rawPlan[i] : "jab";
      if (!isLegalActionFor(state, key, action)) action = "jab";
      cleanPlan.push(action);
    }
    return {
      plan: cleanPlan,
      intent: String(source.intent || "Play a stable exchange."),
      risk: String(
        source.risk ||
          "The opponent may counter the commitment triangle and store damage.",
      ),
      trash_talk: String(source.trash_talk || ""),
    };
  }

  function publicFighter(fighter) {
    return {
      id: fighter.id,
      name: fighter.name,
      character: fighter.character,
      characterName: CHARACTERS[fighter.character].name,
      hp: fighter.hp,
      maxHp: MAX_HP,
      storedDmg: typeof fighter.storedDmg === "number" ? fighter.storedDmg : 0,
      hitStreak: typeof fighter.hitStreak === "number" ? fighter.hitStreak : 0,
      dodgeStreak:
        typeof fighter.dodgeStreak === "number" ? fighter.dodgeStreak : 0,
    };
  }

  function addEvent(attack, type, actor, target, text, amount, meta) {
    var event = {
      type: type,
      actor: actor || null,
      target: target || null,
      text: text,
      amount: amount || 0,
    };
    var key;
    if (meta) {
      for (key in meta) event[key] = meta[key];
    }
    attack.events.push(event);
  }

  function isLight(action) {
    return !!(MOVES[action] && MOVES[action].commitment === COMMITMENT.LIGHT);
  }

  function isHeavy(action) {
    return !!(MOVES[action] && MOVES[action].commitment === COMMITMENT.HEAVY);
  }

  function ensureBonusState(fighter) {
    if (typeof fighter.storedDmg !== "number") fighter.storedDmg = 0;
    if (!Array.isArray(fighter.storedDmgBuckets))
      fighter.storedDmgBuckets = [];
    if (typeof fighter.hitStreak !== "number") fighter.hitStreak = 0;
    if (typeof fighter.dodgeStreak !== "number") fighter.dodgeStreak = 0;
    if (typeof fighter.dodgeComboAwarded !== "boolean")
      fighter.dodgeComboAwarded = false;
  }

  function syncStoredDmg(fighter) {
    var i, bucket, total;
    ensureBonusState(fighter);
    if (!fighter.storedDmgBuckets.length) return fighter.storedDmg || 0;
    total = 0;
    for (i = 0; i < fighter.storedDmgBuckets.length; i++) {
      bucket = fighter.storedDmgBuckets[i];
      total += Math.max(0, bucket.amount || 0);
    }
    fighter.storedDmg = total;
    return total;
  }

  function clearStoredDmg(fighter) {
    fighter.storedDmg = 0;
    fighter.storedDmgBuckets = [];
  }

  function resetExchangeBonuses(fighter) {
    ensureBonusState(fighter);
    fighter.hitStreak = 0;
    fighter.dodgeStreak = 0;
    fighter.dodgeComboAwarded = false;
  }

  function resetTurnBonuses(fighter) {
    ensureBonusState(fighter);
    clearStoredDmg(fighter);
    resetExchangeBonuses(fighter);
  }

  function storedDmgExpiryExchange(state) {
    var exchangeNumber =
      state.activeExchange && typeof state.activeExchange.number === "number"
        ? state.activeExchange.number
        : (state.exchange || 0) + 1;
    return exchangeNumber + 1;
  }

  function expireStoredDmg(fighter, completedExchange) {
    var buckets, kept, i, bucket;
    ensureBonusState(fighter);
    buckets = fighter.storedDmgBuckets;
    if (!buckets.length) {
      fighter.storedDmg = 0;
      return;
    }
    kept = [];
    for (i = 0; i < buckets.length; i++) {
      bucket = buckets[i];
      if ((bucket.expiresExchange || 0) > completedExchange)
        kept.push(bucket);
    }
    fighter.storedDmgBuckets = kept;
    if (!kept.length) fighter.storedDmg = 0;
    else syncStoredDmg(fighter);
  }

  function expireTurnBonuses(state) {
    var i, fighter;
    for (i = 0; i < PLAYER_KEYS.length; i++) {
      fighter = state.fighters[PLAYER_KEYS[i]];
      resetExchangeBonuses(fighter);
      expireStoredDmg(fighter, state.exchange);
    }
  }

  function damageFor(action) {
    var move = MOVES[action] || {};
    return move.damage || 0;
  }

  function comboDamageFor(fighter) {
    ensureBonusState(fighter);
    if (fighter.hitStreak >= 2) return COMBO_THIRD_HIT;
    if (fighter.hitStreak >= 1) return COMBO_SECOND_HIT;
    return 0;
  }

  function grantStoredDmg(state, attack, key, target, amount, reason, source) {
    var fighter = state.fighters[key];
    var added = Math.max(0, amount || 0);
    ensureBonusState(fighter);
    if (added <= 0) return 0;
    fighter.storedDmgBuckets.push({
      amount: added,
      expiresExchange: storedDmgExpiryExchange(state),
    });
    syncStoredDmg(fighter);
    addEvent(
      attack,
      "stored",
      key,
      target,
      fighterName(state, key) +
        " stores +" +
        added +
        " damage" +
        (reason ? ": " + reason + "." : "."),
      added,
      {
        storedAmount: added,
        storedTotal: fighter.storedDmg,
        source: source || "stored",
      },
    );
    return added;
  }

  function spendStoredDmg(state, key) {
    var fighter = state.fighters[key];
    var amount;
    ensureBonusState(fighter);
    syncStoredDmg(fighter);
    amount = Math.max(0, fighter.storedDmg || 0);
    clearStoredDmg(fighter);
    return amount;
  }

  function applyDamage(
    state,
    attack,
    attackerKey,
    defenderKey,
    action,
    landed,
  ) {
    var attacker = state.fighters[attackerKey];
    var defender = state.fighters[defenderKey];
    var amount = Math.max(0, damageFor(action));
    var baseAmount = amount;
    var comboDmg = comboDamageFor(attacker);
    var storedDmg = spendStoredDmg(state, attackerKey);
    amount += comboDmg + storedDmg;
    if (amount <= 0) return 0;
    defender.hp = clamp(defender.hp - amount, 0, MAX_HP);
    if (landed) landed[attackerKey] = true;
    addEvent(
      attack,
      "hit",
      attackerKey,
      defenderKey,
      fighterName(state, attackerKey) +
        " lands " +
        moveName(action) +
        " for " +
        amount +
        ".",
      amount,
      {
        action: action,
        baseAmount: baseAmount,
        comboDmg: comboDmg,
        spentStoredDmg: storedDmg,
        commitment: MOVES[action] && MOVES[action].commitment,
      },
    );
    return amount;
  }

  function applyPostHitPosition(
    state,
    attack,
    attackerKey,
    defenderKey,
    action,
  ) {
    if (action === "flying_knee") {
      setFeetForRange(state, 1);
      addEvent(
        attack,
        "position",
        attackerKey,
        defenderKey,
        fighterName(state, attackerKey) +
          " lands in pocket range after the flying knee.",
        0,
      );
    }
  }

  function whiff(state, attack, key, action, reason) {
    var opponent = otherKey(key);
    addEvent(
      attack,
      "whiff",
      key,
      opponent,
      fighterName(state, key) +
        " whiffs " +
        moveName(action) +
        (reason ? " (" + reason + ")." : "."),
      0,
      {
        action: action,
        reason: reason || "",
      },
    );
  }

  function isMovement(action) {
    return !!(MOVES[action] && MOVES[action].kind === MOVE_KIND.MOVEMENT);
  }

  function feetOf(state) {
    var feet = state && state.feet ? state.feet : START_FEET;
    return {
      p1: typeof feet.p1 === "number" ? feet.p1 : START_FEET.p1,
      p2: typeof feet.p2 === "number" ? feet.p2 : START_FEET.p2,
    };
  }

  function rangeFromFeet(feet) {
    var safeFeet = feet || START_FEET;
    var p1 = typeof safeFeet.p1 === "number" ? safeFeet.p1 : START_FEET.p1;
    var p2 = typeof safeFeet.p2 === "number" ? safeFeet.p2 : START_FEET.p2;
    var gap = Math.abs(p2 - p1);
    if (gap === 0) return RANGE.CLINCH;
    if (gap === 1) return RANGE.POCKET;
    return RANGE.DISTANCE;
  }

  function syncFootState(state) {
    state.feet = feetOf(state);
    state.range = rangeFromFeet(state.feet);
  }

  function setFeetForRange(state, range) {
    var center = state.feet ? (state.feet.p1 + state.feet.p2) / 2 : 0;
    var gap = range === RANGE.CLINCH ? 0 : range === RANGE.POCKET ? 1 : 2;
    var left = gap === 0 ? Math.round(center) : Math.floor(center - gap / 2);
    state.feet = { p1: left, p2: left + gap };
    state.range = rangeFromFeet(state.feet);
  }

  function wrongRangeReason(action, startRange, postRange) {
    if (isAttack(action) && startRange !== postRange)
      return "movement changed the range first";
    return "wrong range";
  }

  function movementText(
    state,
    attack,
    key,
    action,
    fromRange,
    toRange,
    fromFoot,
    toFoot,
  ) {
    if (action === "advance") {
      addEvent(
        attack,
        "movement",
        key,
        null,
        fighterName(state, key) +
          " advances to " +
          RANGE_NAMES[toRange] +
          " (" +
          fromFoot +
          " -> " +
          toFoot +
          ").",
        0,
      );
    } else if (action === "retreat") {
      if (fromRange === 2 && fromFoot === toFoot) {
        addEvent(
          attack,
          "backpedal",
          key,
          null,
          fighterName(state, key) +
            " hop-steps out at max distance and lands back on " +
            toFoot +
            ".",
          0,
        );
      } else {
        addEvent(
          attack,
          "movement",
          key,
          null,
          fighterName(state, key) +
            " retreats to " +
            RANGE_NAMES[toRange] +
            " (" +
            fromFoot +
            " -> " +
            toFoot +
            ").",
          0,
        );
      }
    } else if (action === "roll") {
      addEvent(
        attack,
        "movement",
        key,
        null,
        fighterName(state, key) + " rolls under the line of attack.",
        0,
      );
    }
  }

  function applyMovementPair(state, attack, action1, action2, startRange) {
    var p1Move = isMovement(action1);
    var p2Move = isMovement(action2);
    var p1Advance = action1 === "advance";
    var p2Advance = action2 === "advance";
    var p1Retreat = action1 === "retreat";
    var p2Retreat = action2 === "retreat";
    var startFeet;
    var endFeet;
    var mid;
    var p1RetreatAtMax;
    var p2RetreatAtMax;
    syncFootState(state);
    startFeet = { p1: state.feet.p1, p2: state.feet.p2 };
    endFeet = { p1: startFeet.p1, p2: startFeet.p2 };
    p1RetreatAtMax = startRange === 2 && p1Retreat && !p2Advance;
    p2RetreatAtMax = startRange === 2 && p2Retreat && !p1Advance;
    attack.movement = {
      startRange: startRange,
      endRange: startRange,
      startFeet: startFeet,
      endFeet: { p1: startFeet.p1, p2: startFeet.p2 },
      pressureActor: null,
      retreatedAtMax: {
        p1: p1RetreatAtMax,
        p2: p2RetreatAtMax,
      },
    };

    if (p1Advance) endFeet.p1 += 1;
    if (p1Retreat && !p1RetreatAtMax) endFeet.p1 -= 1;
    if (p2Advance) endFeet.p2 -= 1;
    if (p2Retreat && !p2RetreatAtMax) endFeet.p2 += 1;

    if (endFeet.p1 > endFeet.p2) {
      if (p1Advance && !p2Advance) {
        endFeet.p1 = endFeet.p2;
      } else if (p2Advance && !p1Advance) {
        endFeet.p2 = endFeet.p1;
      } else {
        mid = Math.round((startFeet.p1 + startFeet.p2) / 2);
        endFeet.p1 = mid;
        endFeet.p2 = mid;
      }
    }

    state.feet = endFeet;
    state.range = rangeFromFeet(endFeet);
    attack.movement.endRange = state.range;
    attack.movement.endFeet = { p1: endFeet.p1, p2: endFeet.p2 };

    if (p1Move)
      movementText(
        state,
        attack,
        "p1",
        action1,
        startRange,
        state.range,
        startFeet.p1,
        endFeet.p1,
      );
    if (p2Move)
      movementText(
        state,
        attack,
        "p2",
        action2,
        startRange,
        state.range,
        startFeet.p2,
        endFeet.p2,
      );

    if (p1Advance && p2Retreat) {
      attack.movement.pressureActor = "p1";
      addEvent(
        attack,
        "pressure",
        "p1",
        "p2",
        fighterName(state, "p1") +
          " pressures the retreat for +" +
          STORED_PRESSURE +
          " stored damage.",
        STORED_PRESSURE,
      );
      grantStoredDmg(
        state,
        attack,
        "p1",
        "p2",
        STORED_PRESSURE,
        "pressure advantage",
        "pressure",
      );
    }
    if (p2Advance && p1Retreat) {
      attack.movement.pressureActor = "p2";
      addEvent(
        attack,
        "pressure",
        "p2",
        "p1",
        fighterName(state, "p2") +
          " pressures the retreat for +" +
          STORED_PRESSURE +
          " stored damage.",
        STORED_PRESSURE,
      );
      grantStoredDmg(
        state,
        attack,
        "p2",
        "p1",
        STORED_PRESSURE,
        "pressure advantage",
        "pressure",
      );
    }
  }

  function recordDodge(
    state,
    attack,
    evaderKey,
    attackerKey,
    attackAction,
    baseStored,
    reason,
    dodged,
  ) {
    var evader = state.fighters[evaderKey];
    var comboStored = 0;
    ensureBonusState(evader);
    whiff(state, attack, attackerKey, attackAction, reason);
    if (dodged) dodged[evaderKey] = true;
    addEvent(
      attack,
      "dodge",
      evaderKey,
      attackerKey,
      fighterName(state, evaderKey) + " dodges " + moveName(attackAction) + ".",
      baseStored || 0,
      {
        action: attack.actions[evaderKey],
        dodgedAction: attackAction,
        storedAmount: baseStored || 0,
        reason: reason || "movement",
      },
    );
    if (baseStored > 0) {
      grantStoredDmg(
        state,
        attack,
        evaderKey,
        attackerKey,
        baseStored,
        reason || "movement dodges heavy",
        "dodge_heavy",
      );
    }
    if (evader.dodgeStreak >= 1 && !evader.dodgeComboAwarded) {
      comboStored = COMBO_SECOND_DODGE;
      evader.dodgeComboAwarded = true;
      grantStoredDmg(
        state,
        attack,
        evaderKey,
        attackerKey,
        comboStored,
        "second straight dodge",
        "combo_dodge",
      );
    }
    return true;
  }

  function resolveMovementVsAttack(
    state,
    attack,
    moverKey,
    moverAction,
    attackerKey,
    attackAction,
    postRange,
    landed,
    dodged,
  ) {
    if (!isAttack(attackAction) || !isMovement(moverAction)) return false;
    if (isHeavy(attackAction)) {
      return recordDodge(
        state,
        attack,
        moverKey,
        attackerKey,
        attackAction,
        STORED_HEAVY_DODGE,
        "movement dodges heavy",
        dodged,
      );
    }
    if (isLight(attackAction) && hasRange(attackAction, postRange)) {
      if (
        applyDamage(
          state,
          attack,
          attackerKey,
          moverKey,
          attackAction,
          landed,
        ) > 0
      ) {
        applyPostHitPosition(
          state,
          attack,
          attackerKey,
          moverKey,
          attackAction,
        );
        grantStoredDmg(
          state,
          attack,
          attackerKey,
          moverKey,
          STORED_LIGHT_MOVEMENT,
          "light caught movement",
          "light_movement",
        );
      }
      return true;
    }
    return recordDodge(
      state,
      attack,
      moverKey,
      attackerKey,
      attackAction,
      0,
      "movement left the light attack out of range",
      dodged,
    );
  }

  function resolveAttackVsAttack(
    state,
    attack,
    aKey,
    aAction,
    bKey,
    bAction,
    landed,
  ) {
    var aHeavy = isHeavy(aAction);
    var bHeavy = isHeavy(bAction);
    var aLight = isLight(aAction);
    var bLight = isLight(bAction);
    var hitA = 0;
    var hitB = 0;

    if (aHeavy && bLight) {
      whiff(state, attack, bKey, bAction, "stuffed by heavy");
      hitA = applyDamage(state, attack, aKey, bKey, aAction, landed);
      if (hitA > 0) {
        applyPostHitPosition(state, attack, aKey, bKey, aAction);
        grantStoredDmg(
          state,
          attack,
          aKey,
          bKey,
          STORED_HEAVY_LIGHT,
          "heavy stuffed light",
          "heavy_light",
        );
      }
      return;
    }
    if (bHeavy && aLight) {
      whiff(state, attack, aKey, aAction, "stuffed by heavy");
      hitB = applyDamage(state, attack, bKey, aKey, bAction, landed);
      if (hitB > 0) {
        applyPostHitPosition(state, attack, bKey, aKey, bAction);
        grantStoredDmg(
          state,
          attack,
          bKey,
          aKey,
          STORED_HEAVY_LIGHT,
          "heavy stuffed light",
          "heavy_light",
        );
      }
      return;
    }

    hitA = applyDamage(state, attack, aKey, bKey, aAction, landed);
    hitB = applyDamage(state, attack, bKey, aKey, bAction, landed);
    if (hitA > 0) applyPostHitPosition(state, attack, aKey, bKey, aAction);
    if (hitB > 0) applyPostHitPosition(state, attack, bKey, aKey, bAction);
    if (hitA > 0 && hitB > 0)
      addEvent(
        attack,
        "clash",
        null,
        null,
        moveName(aAction) + " and " + moveName(bAction) + " both score.",
        0,
      );
  }

  function finalizeStreaks(state, landed, dodged) {
    var i, key, fighter;
    for (i = 0; i < PLAYER_KEYS.length; i++) {
      key = PLAYER_KEYS[i];
      fighter = state.fighters[key];
      ensureBonusState(fighter);
      fighter.hitStreak = landed[key] ? fighter.hitStreak + 1 : 0;
      if (dodged[key]) {
        fighter.dodgeStreak += 1;
      } else {
        fighter.dodgeStreak = 0;
        fighter.dodgeComboAwarded = false;
      }
    }
  }

  function resolveAttack(state, attackIndex, plans) {
    syncFootState(state);
    var attack = {
      number: attackIndex + 1,
      start: {
        range: state.range,
        feet: {
          p1: state.feet.p1,
          p2: state.feet.p2,
        },
        fighters: {
          p1: publicFighter(state.fighters.p1),
          p2: publicFighter(state.fighters.p2),
        },
      },
      actions: {},
      events: [],
    };

    var p1 = state.fighters.p1;
    var p2 = state.fighters.p2;
    var action1 = plans.p1.plan[attackIndex];
    var action2 = plans.p2.plan[attackIndex];

    attack.actions.p1 = action1;
    attack.actions.p2 = action2;
    attack.p1 = { action: action1, name: moveName(action1) };
    attack.p2 = { action: action2, name: moveName(action2) };

    var startRange = state.range;
    var landed = { p1: false, p2: false };
    var dodged = { p1: false, p2: false };
    applyMovementPair(state, attack, action1, action2, startRange);
    var postMovementRange = state.range;

    if (isMovement(action1) && isAttack(action2)) {
      resolveMovementVsAttack(
        state,
        attack,
        "p1",
        action1,
        "p2",
        action2,
        postMovementRange,
        landed,
        dodged,
      );
    } else if (isMovement(action2) && isAttack(action1)) {
      resolveMovementVsAttack(
        state,
        attack,
        "p2",
        action2,
        "p1",
        action1,
        postMovementRange,
        landed,
        dodged,
      );
    } else {
      var valid1 = hasRange(action1, postMovementRange);
      var valid2 = hasRange(action2, postMovementRange);
      if (!valid1 && isAttack(action1)) {
        whiff(
          state,
          attack,
          "p1",
          action1,
          wrongRangeReason(action1, startRange, postMovementRange),
        );
      }
      if (!valid2 && isAttack(action2)) {
        whiff(
          state,
          attack,
          "p2",
          action2,
          wrongRangeReason(action2, startRange, postMovementRange),
        );
      }

      if (valid1 && valid2 && isAttack(action1) && isAttack(action2)) {
        resolveAttackVsAttack(
          state,
          attack,
          "p1",
          action1,
          "p2",
          action2,
          landed,
        );
      } else if (
        valid1 &&
        isAttack(action1) &&
        (!isAttack(action2) || !valid2)
      ) {
        var dealt1 = applyDamage(state, attack, "p1", "p2", action1, landed);
        if (dealt1 > 0)
          applyPostHitPosition(state, attack, "p1", "p2", action1);
      } else if (
        valid2 &&
        isAttack(action2) &&
        (!isAttack(action1) || !valid1)
      ) {
        var dealt2 = applyDamage(state, attack, "p2", "p1", action2, landed);
        if (dealt2 > 0)
          applyPostHitPosition(state, attack, "p2", "p1", action2);
      } else if (!isAttack(action1) && !isAttack(action2)) {
        addEvent(
          attack,
          "position",
          null,
          null,
          "Both fighters jockey for position.",
          0,
        );
      }
    }

    finalizeStreaks(state, landed, dodged);

    if (p1.hp <= 0 || p2.hp <= 0) {
      if (p1.hp === p2.hp) {
        state.draw = true;
        addEvent(
          attack,
          "ko",
          null,
          null,
          "Both fighters hit the canvas together.",
          0,
        );
      } else {
        state.winner = p1.hp > p2.hp ? p1.id : p2.id;
        addEvent(
          attack,
          "ko",
          state.winner === p1.id ? "p1" : "p2",
          state.winner === p1.id ? "p2" : "p1",
          playerName(state, state.winner) + " scores the knockout.",
          0,
        );
      }
    }

    attack.end = {
      range: state.range,
      feet: {
        p1: state.feet.p1,
        p2: state.feet.p2,
      },
      fighters: {
        p1: publicFighter(state.fighters.p1),
        p2: publicFighter(state.fighters.p2),
      },
    };
    return attack;
  }

  function resetExchangeFlags(state) {
    syncFootState(state);
    resetExchangeBonuses(state.fighters.p1);
    resetExchangeBonuses(state.fighters.p2);
    syncStoredDmg(state.fighters.p1);
    syncStoredDmg(state.fighters.p2);
  }

  function exchangePlans(plans) {
    return {
      p1: {
        plan: plans.p1.plan.slice(),
        intent: plans.p1.intent,
        risk: plans.p1.risk,
        trash_talk: plans.p1.trash_talk,
      },
      p2: {
        plan: plans.p2.plan.slice(),
        intent: plans.p2.intent,
        risk: plans.p2.risk,
        trash_talk: plans.p2.trash_talk,
      },
    };
  }

  function startExchange(state, plans) {
    resetExchangeFlags(state);
    state.activeExchange = {
      number: state.exchange + 1,
      rangeName: RANGE_NAMES[state.range],
      plans: exchangePlans(plans),
      attacks: [],
      summary: "",
    };
    continueExchange(state);
  }

  function continueExchange(state) {
    var plans = state.activeExchange && state.activeExchange.plans;
    var attack;
    if (!plans) return;
    while (
      state.activeExchange.attacks.length < QUEUE_LENGTH &&
      !state.winner &&
      !state.draw
    ) {
      attack = resolveAttack(state, state.activeExchange.attacks.length, plans);
      state.activeExchange.attacks.push(attack);
    }
    state.activeExchange.rangeName = RANGE_NAMES[state.range];
    state.activeExchange.summary = summarizeExchange(
      state,
      state.activeExchange.attacks,
    );
    state.phase = "fighting";
  }

  function completeActiveExchange(state) {
    var exchange = state.activeExchange;
    if (!exchange) return;
    state.exchange = exchange.number;
    state.plans = {};
    state.activeExchange = null;
    state.phase = state.winner || state.draw ? "gameOver" : "planning";

    if (!state.winner && !state.draw && state.exchange >= MAX_EXCHANGES) {
      state.winner = judgeWinner(state);
      state.draw = state.winner === null;
      state.phase = "gameOver";
    }

    exchange.rangeName = RANGE_NAMES[state.range];
    exchange.summary = summarizeExchange(state, exchange.attacks);
    state.lastExchange = exchange;
    state.history.push(exchange);
    if (state.history.length > 8)
      state.history = state.history.slice(state.history.length - 8);
    expireTurnBonuses(state);
  }

  function fightingDisplayMs(state) {
    var exchange = state.activeExchange || state.lastExchange;
    var attacks =
      exchange && exchange.attacks ? exchange.attacks.length : QUEUE_LENGTH;
    return Math.max(
      3600,
      Math.min(FIGHTING_DISPLAY_MS, attacks * ATTACK_MS + FIGHTING_HOLD_MS),
    );
  }

  function applySystemAction(state, action) {
    var next = copy(state);
    if (!action || action.type !== "advance_phase") return state;
    if (action.phase !== "fighting" || next.phase !== "fighting") return state;
    if (!next.activeExchange || next.activeExchange.number !== action.exchange)
      return state;
    completeActiveExchange(next);
    return next;
  }

  function judgeWinner(state) {
    var f1 = state.fighters.p1;
    var f2 = state.fighters.p2;
    if (f1.hp !== f2.hp) return f1.hp > f2.hp ? f1.id : f2.id;
    return null;
  }

  function exchangeStoredAmount(events, key) {
    var i, total;
    total = 0;
    for (i = 0; i < events.length; i++) {
      if (
        events[i].type === "stored" &&
        events[i].actor === key &&
        events[i].amount > 0
      ) {
        total += events[i].amount || 0;
      }
    }
    return total;
  }

  function exchangeHitEvent(events, key) {
    var i;
    for (i = 0; i < events.length; i++) {
      if (events[i].type === "hit" && events[i].actor === key) return events[i];
    }
    return null;
  }

  function exchangeWhiffEvent(events, key) {
    var i;
    for (i = 0; i < events.length; i++) {
      if (events[i].type === "whiff" && events[i].actor === key)
        return events[i];
    }
    return null;
  }

  function exchangeDodgeEvent(events, key) {
    var i;
    for (i = 0; i < events.length; i++) {
      if (events[i].type === "dodge" && events[i].actor === key)
        return events[i];
    }
    return null;
  }

  function summarizeExchange(state, attacks) {
    function movePast(action) {
      if (action === "advance") return "Advanced";
      if (action === "retreat") return "Retreated";
      if (action === "roll") return "Rolled";
      return moveName(action);
    }
    function phrase(attack, key) {
      var events = attack.events || [];
      var action = attack.actions && attack.actions[key];
      var name = fighterName(state, key);
      var hit = exchangeHitEvent(events, key);
      var whiffed = exchangeWhiffEvent(events, key);
      var dodged = exchangeDodgeEvent(events, key);
      var gained = exchangeStoredAmount(events, key);
      var total;
      if (hit) {
        return (
          name +
          " Landed " +
          moveName(hit.action || action) +
          " for " +
          (hit.amount || 0) +
          " Dmg" +
          (gained ? ", +" + gained + " Stored" : "")
        );
      }
      if (dodged)
        return (
          name +
          " " +
          movePast(action) +
          " and dodged " +
          moveName(dodged.dodgedAction) +
          (gained ? " for +" + gained + " Stored" : "")
        );
      if (whiffed)
        return name + " whiffed " + moveName(whiffed.action || action);
      if (isMovement(action)) {
        total = gained || 0;
        return (
          name +
          " " +
          movePast(action) +
          (total ? " for +" + total + " Stored" : "")
        );
      }
      if (isAttack(action)) return name + " threw " + moveName(action);
      return name + " reset";
    }
    var parts = [];
    var i;
    for (i = 0; i < attacks.length; i++) {
      parts.push(phrase(attacks[i], "p1") + " -- " + phrase(attacks[i], "p2"));
    }
    if (state.winner) parts.push(playerName(state, state.winner) + " wins.");
    return parts.join("\n");
  }

  function buildStateLine(state) {
    var feet = feetOf(state);
    var range = rangeFromFeet(feet);
    return (
      "Range " +
      range +
      " (" +
      RANGE_NAMES[range] +
      "). " +
      "Feet " +
      fighterName(state, "p1") +
      " " +
      feet.p1 +
      ", " +
      fighterName(state, "p2") +
      " " +
      feet.p2 +
      ". " +
      fighterName(state, "p1") +
      " HP " +
      state.fighters.p1.hp +
      "/30. " +
      fighterName(state, "p2") +
      " HP " +
      state.fighters.p2.hp +
      "/30. " +
      "Stored Dmg " +
      fighterName(state, "p1") +
      " " +
      (state.fighters.p1.storedDmg || 0) +
      ", " +
      fighterName(state, "p2") +
      " " +
      (state.fighters.p2.storedDmg || 0) +
      "."
    );
  }

  function tendencySummary(state, key) {
    var opponent = otherKey(key);
    var counts = {};
    var h, i, plan;
    for (
      h = Math.max(0, state.history.length - 5);
      h < state.history.length;
      h++
    ) {
      plan =
        state.history[h].plans &&
        state.history[h].plans[opponent] &&
        state.history[h].plans[opponent].plan;
      if (!plan) continue;
      for (i = 0; i < plan.length; i++)
        counts[plan[i]] = (counts[plan[i]] || 0) + 1;
    }
    var pairs = Object.keys(counts)
      .toSorted(function (a, b) {
        return counts[b] - counts[a];
      })
      .slice(0, 4);
    if (pairs.length === 0) return "No established habits yet.";
    return (
      "Recent opponent actions: " +
      pairs
        .map(function (action) {
          return action + " x" + counts[action];
        })
        .join(", ") +
      "."
    );
  }

  function actionCatalogFor(state, key) {
    var legal = legalActionsForCharacter(state.fighters[key].character);
    var catalog = {};
    var i, action;
    for (i = 0; i < legal.length; i++) {
      action = legal[i];
      catalog[action] = {
        name: moveName(action),
        kind: (MOVES[action] && MOVES[action].kind) || "attack",
        category: (MOVES[action] && MOVES[action].category) || "Attacks",
        tags: (MOVES[action] && MOVES[action].tags) || [],
        text: (MOVES[action] && MOVES[action].text) || "",
        priority: (MOVES[action] && MOVES[action].priority) || 0,
        damage: (MOVES[action] && MOVES[action].damage) || 0,
        range:
          MOVES[action] && typeof MOVES[action].range === "number"
            ? MOVES[action].range
            : null,
        commitment: (MOVES[action] && MOVES[action].commitment) || null,
      };
    }
    return catalog;
  }

  function planOption(label, plan, intent, risk, trashTalk) {
    return {
      decision: {
        type: "queue",
        attack1: plan[0],
        attack2: plan[1],
        attack3: plan[2],
        intent: intent,
        risk: risk,
        trash_talk: trashTalk,
      },
      label: label + ": " + plan.join(" -> "),
    };
  }

  function queueSchemaForState(state, key) {
    var actions = availableActionsForState(state, key);
    return {
      fields: {
        attack1: { kind: "enum", values: actions.slice() },
        attack2: { kind: "enum", values: actions.slice() },
        attack3: { kind: "enum", values: actions.slice() },
        intent: {
          kind: "string",
          freeText: true,
          minLength: 0,
          maxLength: 160,
        },
        risk: { kind: "string", freeText: true, minLength: 0, maxLength: 160 },
        trash_talk: {
          kind: "string",
          freeText: true,
          minLength: 0,
          maxLength: 80,
        },
      },
    };
  }

  function attachQueueSchema(options, schema) {
    var out = [];
    var option;
    var i;
    for (i = 0; i < options.length; i++) {
      option = copy(options[i]);
      option.schema = schema;
      option.required = true;
      out.push(option);
    }
    return out;
  }

  function recommendedOptions(state, key) {
    var range = rangeFromFeet(feetOf(state));
    if (range === RANGE.DISTANCE) {
      return [
        planOption(
          "Probe then launch",
          ["teep", "flying_knee", "jab"],
          "Score a light touch, threaten heavy, then box in the pocket.",
          "Movement can make the heavy entry miss.",
          "Touch, then fly.",
        ),
        planOption(
          "Crowd heavy",
          ["advance", "jab", "cross"],
          "Step inside distance, jab on entry, then punish with heavy hands.",
          "A light distance kick can tag the entry.",
          "No long runway.",
        ),
        planOption(
          "Pressure the exit",
          ["advance", "teep", "flying_knee"],
          "Press their feet backward, store pressure damage, then punish if they freeze at range.",
          "Light counters can interrupt the chase.",
          "Back line is mine.",
        ),
      ];
    }
    if (range === RANGE.CLINCH) {
      return [
        planOption(
          "Clinch touch",
          ["elbow", "knee", "retreat"],
          "Tag movement with the light elbow, then threaten the heavy knee.",
          "A clean retreat can make the knee miss.",
          "No room.",
        ),
        planOption(
          "Heavy punish",
          ["knee", "elbow", "knee"],
          "Stuff light clinch shots with knees and keep the combo going.",
          "Roll or retreat can punish the heavy knee.",
          "Eat the frame.",
        ),
        planOption(
          "Exit and reset",
          ["retreat", "teep", "flying_knee"],
          "Leave clinch attacks behind, touch at distance, then threaten heavy.",
          "If they advance with you, they gain pressure.",
          "Break clean.",
        ),
      ];
    }
    return [
      planOption(
        "Boxing setup",
        ["jab", "cross", "advance"],
        "Jab to catch movement, cross to stuff light, then step into clinch pressure.",
        "Roll can punish the heavy cross.",
        "Hands right there.",
      ),
      planOption(
        "Make heavy miss",
        ["roll", "cross", "jab"],
        "Roll the committed shot, cash stored damage with Cross, then reset with Jab.",
        "Light jabs tag the roll.",
        "Miss big.",
      ),
      planOption(
        "Pocket pressure",
        ["advance", "elbow", "knee"],
        "Follow the retreat for pressure damage, then work light-to-heavy in clinch.",
        "Pocket light attacks can catch the entry.",
        "Step with me.",
      ),
    ];
  }

  function chatOpportunities() {
    return [
      {
        id: "chat:room",
        kind: "chat",
        prompt: "Chat in the room.",
        decision: { type: "none" },
        chat: {
          channels: ["room"],
          defaultChannel: "room",
          canSend: true,
          memberships: [],
        },
        submitPolicy: "multiple",
      },
    ];
  }

  return {
    rules: {
      visibility: "private",
      spectator: "god-view",
      seats: { eliminated: "player-view", disconnected: "player-view" },
    },

    setup: function (ctx) {
      var sourcePlayers =
        ctx && ctx.players
          ? ctx.players
          : [
              { id: "p1", name: "Player 1" },
              { id: "p2", name: "Player 2" },
            ];
      var players = [sourcePlayers[0].id, sourcePlayers[1].id];
      var playerNames = {};
      playerNames[players[0]] = sourcePlayers[0].name || players[0];
      playerNames[players[1]] = sourcePlayers[1].name || players[1];
      return {
        players: players,
        playerNames: playerNames,
        phase: "planning",
        exchange: 0,
        range: 2,
        feet: {
          p1: -1,
          p2: 1,
        },
        fighters: {
          p1: {
            id: players[0],
            name: playerNames[players[0]],
            character: "nak_muay",
            hp: MAX_HP,
            storedDmg: 0,
            storedDmgBuckets: [],
            hitStreak: 0,
            dodgeStreak: 0,
            dodgeComboAwarded: false,
          },
          p2: {
            id: players[1],
            name: playerNames[players[1]],
            character: "nak_muay",
            hp: MAX_HP,
            storedDmg: 0,
            storedDmgBuckets: [],
            hitStreak: 0,
            dodgeStreak: 0,
            dodgeComboAwarded: false,
          },
        },
        plans: {},
        history: [],
        lastExchange: null,
        activeExchange: null,
        winner: null,
        draw: false,
      };
    },

    apply: function (state, actorId, action) {
      var decision = decisionOf(action);
      var key = playerKey(state, actorId);
      var next = copy(state);
      var normalized;
      if (actorId === "__system__") return applySystemAction(state, decision);
      if (!key || next.winner || next.draw) return state;
      if (next.phase === "fighting") return state;
      if (!decision || decision.type !== "queue") return state;
      if (next.plans[key]) return state;

      normalized = normalizePlan(next, key, decision);
      next.plans[key] = normalized;
      next.phase = "planning";

      if (next.plans.p1 && next.plans.p2) {
        startExchange(next, {
          p1: next.plans.p1,
          p2: next.plans.p2,
        });
      }
      return next;
    },

    project: function (state, viewerId) {
      var key = playerKey(state, viewerId);
      var visibleExchange = state.activeExchange || state.lastExchange;
      var feet = feetOf(state);
      var range = rangeFromFeet(feet);
      var view = {
        slug: "neon-ring-tag",
        title: "Muay ThAI",
        phase: state.phase,
        exchange: state.exchange,
        maxExchanges: MAX_EXCHANGES,
        range: range,
        rangeName: RANGE_NAMES[range],
        ranges: RANGE_NAMES.map(function (name, index) {
          return { value: index, name: name };
        }),
        footLine: {
          p1: feet.p1,
          p2: feet.p2,
        },
        animationTiming: {
          attackMs: ATTACK_MS,
          holdMs: FIGHTING_HOLD_MS,
        },
        players: {
          p1: publicFighter(state.fighters.p1),
          p2: publicFighter(state.fighters.p2),
        },
        characters: CHARACTERS,
        pending: {
          p1: !!state.plans.p1,
          p2: !!state.plans.p2,
        },
        activeExchange: state.activeExchange
          ? copy(state.activeExchange)
          : null,
        lastExchange: visibleExchange ? copy(visibleExchange) : null,
        history: copy(
          state.history.slice(Math.max(0, state.history.length - 5)),
        ),
        winner: state.winner,
        draw: !!state.draw,
        winnerName: state.winner ? playerName(state, state.winner) : null,
      };
      if (key && state.plans[key]) view.yourPlan = copy(state.plans[key]);
      if (key) {
        view.yourKey = key;
        view.availableActions = availableActionsForState(state, key);
        view.moveCatalog = actionCatalogFor(state, key);
      }

      return {
        view: view,
        agentView: this.agentView(state, viewerId),
      };
    },

    agentView: function (state, viewerId) {
      var key = playerKey(state, viewerId);
      if (!key) {
        return (
          buildStateLine(state) +
          "\nSpectator view. Waiting for both players to queue three actions."
        );
      }
      var opponent = otherKey(key);
      var character = characterOf(state, key);
      var opponentCharacter = characterOf(state, opponent);
      var lines = [];
      lines.push(
        "You are " +
          fighterName(state, key) +
          " playing " +
          character.name +
          ". Opponent: " +
          fighterName(state, opponent) +
          " playing " +
          opponentCharacter.name +
          ".",
      );
      lines.push(buildStateLine(state));
      lines.push(
        "Movement: " +
          MOVEMENT_ACTIONS.join(", ") +
          ". Attacks: " +
          ATTACK_ACTIONS.join(", ") +
          ".",
      );
      lines.push("Trait: " + character.trait);
      lines.push(
        'Legal output JSON: {"type":"queue","attack1":"action1","attack2":"action2","attack3":"action3","intent":"...","risk":"...","trash_talk":"..."}',
      );
      lines.push(
        "Set attack1, attack2, and attack3 to the three queued attacks/actions. Repeating the same action is allowed. Illegal actions become jab. Current legal actions: " +
          availableActionsForState(state, key).join(", ") +
          ".",
      );
      lines.push(
        "Core rules: movement resolves before attacks. All hits deal 2 base damage. Light tags movement in range for +1 stored damage. Movement dodges Heavy for +2 stored damage. Heavy stuffs Light for +1 stored damage. Advance into retreat gives +1 stored damage. Stored damage spends on the next landed hit and expires after one carried exchange. Hit streaks add +2 then +4 combo damage.",
      );
      lines.push(tendencySummary(state, key));
      if (state.plans[key])
        lines.push(
          "Your locked plan: " +
            state.plans[key].plan.join(" -> ") +
            ". Waiting for opponent.",
        );
      if (state.lastExchange)
        lines.push("Last exchange: " + state.lastExchange.summary);
      return lines.join("\n");
    },

    opportunities: function (state, actorId) {
      var key = playerKey(state, actorId);
      var options;
      var schema;
      if (actorId === "__system__") {
        if (state.phase === "fighting" && state.activeExchange) {
          return [
            {
              id: "finish-fighting",
              kind: "system",
              prompt:
                "Finish the fighting display phase for exchange " +
                state.activeExchange.number +
                ".",
              decision: {
                type: "choose",
                options: [
                  {
                    type: "advance_phase",
                    phase: "fighting",
                    exchange: state.activeExchange.number,
                  },
                ],
              },
              deadline: {
                id: "fighting:" + state.activeExchange.number,
                timeoutMs: fightingDisplayMs(state),
                onExpire: {
                  type: "advance_phase",
                  phase: "fighting",
                  exchange: state.activeExchange.number,
                },
              },
            },
          ];
        }
        return [];
      }
      if (!key || state.phase === "gameOver") return [];
      if (state.phase === "fighting") return chatOpportunities();
      if (state.winner || state.draw) return [];
      if (state.plans[key]) return chatOpportunities();
      schema = queueSchemaForState(state, key);
      options = attachQueueSchema(recommendedOptions(state, key), schema);
      return [
        {
          id: "queue",
          kind: "turn",
          prompt:
            playerName(state, actorId) +
            ", queue exactly three attacks for the next exchange.",
          decision: { type: "choose", options: options },
          deadline: {
            id: "queue",
            timeoutMs: QUEUE_TIMEOUT_MS,
            onExpire: options[0].decision,
          },
          chat: {
            channels: ["room"],
            defaultChannel: "room",
            canSend: true,
            memberships: [],
          },
        },
      ];
    },

    outcome: function (state) {
      if (state.phase !== "gameOver") return null;
      if (state.draw) {
        return {
          type: "draw",
          playerIds: [],
          summary:
            "Judges call it a draw after " + state.exchange + " exchanges.",
        };
      }
      if (state.winner) {
        return {
          type: "winners",
          playerIds: [state.winner],
          summary:
            playerName(state, state.winner) +
            " wins after " +
            state.exchange +
            " exchanges.",
        };
      }
      return null;
    },

    validate: function () {
      return { ok: true };
    },

    constants: {
      maxHp: MAX_HP,
      attackMs: ATTACK_MS,
      fightingHoldMs: FIGHTING_HOLD_MS,
      queueLength: QUEUE_LENGTH,
      attackDamage: ATTACK_DAMAGE,
      storedRewards: {
        lightMovement: STORED_LIGHT_MOVEMENT,
        heavyDodge: STORED_HEAVY_DODGE,
        heavyLight: STORED_HEAVY_LIGHT,
        pressure: STORED_PRESSURE,
        secondDodge: COMBO_SECOND_DODGE,
      },
      comboRewards: {
        secondHit: COMBO_SECOND_HIT,
        thirdHit: COMBO_THIRD_HIT,
      },
      universalActions: UNIVERSAL_ACTIONS,
      moves: MOVES,
      characters: CHARACTERS,
    },

    _test: {
      normalizePlan: normalizePlan,
      resolveAttack: resolveAttack,
      legalActionsForCharacter: legalActionsForCharacter,
    },
  };
})();

if (typeof module !== "undefined") {
  module.exports = GameLogic;
  module.exports.GameLogic = GameLogic;
}
