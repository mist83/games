/* ===== ACTION BAR ===== */

var ActionBar = {
  internalButtons: [],
  internalParent: null,
  internalMyCardsContainer: null,
  internalMyCard0: null,
  internalMyCard1: null,
  internalMyHandName: null,
  internalMyChipText: null,
  internalLastActionCount: 0,
  internalSelectedRaiseTo: null,

  internalDecisionOf: function (option) {
    if (option && typeof option === "object" && option.decision !== undefined)
      return option.decision;
    if (option && typeof option === "object" && option.action !== undefined)
      return option.action;
    return option;
  },

  internalSchemaOf: function (option) {
    if (option && typeof option === "object" && option.schema !== undefined)
      return option.schema;
    return null;
  },

  internalChips: function (n) {
    if (typeof internalChips === "function") return internalChips(n);
    return n >= 10000
      ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k"
      : String(n);
  },

  internalDestroyControls: function () {
    for (var b = 0; b < ActionBar.internalButtons.length; b++) {
      var old = ActionBar.internalButtons[b];
      if (old.parent) old.parent.removeChild(old);
      old.destroy({ children: true });
    }
    ActionBar.internalButtons = [];
  },

  internalRegisterRegion: function (id, label, actionType, x, y, w, h) {
    if (
      window["__playgentE2ERegisterRegion"] &&
      window["__playgentE2ECanvasRect"] &&
      Renderer &&
      Renderer.app
    ) {
      window["__playgentE2ERegisterRegion"]({
        id: id,
        kind: "button",
        label: label,
        actionType: actionType || "choose",
        rect: window["__playgentE2ECanvasRect"](
          { x: x, y: y, width: w, height: h },
          Renderer.app,
        ),
      });
    }
  },

  internalPlayActionSound: function (action) {
    if (!playgent.sound || !action) return;
    if (action.type === "fold") playgent.sound("ui.cancel");
    else if (action.type === "check" || action.type === "continue")
      playgent.sound("ui.confirm");
    else if (action.type === "allin") playgent.sound("combat.heavy");
    else playgent.sound("coin.purchase");
  },

  internalMakeText: function (text, size, fill, weight) {
    return new PIXI.Text({
      text: text,
      style: {
        fontFamily: '-apple-system, "Segoe UI", sans-serif',
        fontSize: size,
        fontWeight: weight || "700",
        fill: fill,
        letterSpacing: 0,
        dropShadow: { color: "#00000088", blur: 2, distance: 1 },
      },
    });
  },

  internalFitText: function (txt, maxW) {
    txt.scale.set(1);
    if (txt.width > maxW && txt.width > 0) {
      var s = Math.max(0.72, maxW / txt.width);
      txt.scale.set(s);
    }
  },

  internalDrawButton: function (parent, cfg) {
    var btn = new PIXI.Container();
    var shadow = new PIXI.Graphics();
    shadow.roundRect(0, 2, cfg.w, cfg.h, C.BTN_RADIUS);
    shadow.fill({ color: 0x000000, alpha: 0.34 });
    btn.addChild(shadow);

    var bg = new PIXI.Graphics();
    bg.roundRect(0, 0, cfg.w, cfg.h, C.BTN_RADIUS);
    bg.fill({ color: cfg.bg });
    bg.roundRect(0, 0, cfg.w, cfg.h / 2, C.BTN_RADIUS);
    bg.fill({ color: 0xffffff, alpha: 0.07 });
    bg.roundRect(0.5, 0.5, cfg.w - 1, cfg.h - 1, C.BTN_RADIUS);
    bg.stroke({ color: cfg.stroke || 0xffffff, width: 1, alpha: cfg.strokeA || 0.1 });
    btn.addChild(bg);

    var txt = ActionBar.internalMakeText(cfg.label, cfg.fontSize || 13, cfg.fg, "800");
    txt.anchor.set(0.5, 0.5);
    txt.x = cfg.w / 2;
    txt.y = cfg.h / 2;
    ActionBar.internalFitText(txt, cfg.w - 12);
    btn.addChild(txt);

    btn.x = cfg.x;
    btn.y = cfg.y;
    btn.eventMode = "static";
    btn.cursor = "pointer";
    btn.hitArea = new PIXI.Rectangle(0, 0, cfg.w, cfg.h);
    btn.on("pointertap", function () {
      if (cfg.onTap) cfg.onTap();
      if (cfg.action) ActionBar.internalPlayActionSound(cfg.action);
      Tween.to(btn.scale, { x: 0.96, y: 0.96 }, 55, "easeIn", function () {
        Tween.to(btn.scale, { x: 1, y: 1 }, 140, "backOut");
      });
      shadow.alpha = 0;
      Tween.to(shadow, { alpha: 1 }, 180, "easeOut");
    });

    parent.addChild(btn);
    ActionBar.internalButtons.push(btn);
    var regionX = cfg.regionX !== undefined ? cfg.regionX : cfg.x;
    var regionY = cfg.regionY !== undefined ? cfg.regionY : cfg.y;
    ActionBar.internalRegisterRegion(
      cfg.id || "action-" + ActionBar.internalButtons.length,
      cfg.label,
      cfg.action ? cfg.action.type : cfg.actionType,
      regionX,
      regionY,
      cfg.w,
      cfg.h,
    );
    return btn;
  },

  internalSimpleLabel: function (action, view, myP) {
    if (!action) return "";
    if (action.type === "fold") return "FOLD";
    if (action.type === "check") return "CHECK";
    if (action.type === "call") {
      var toCall = view.currentBet - (myP ? myP.bet : 0);
      if (toCall < 0) toCall = 0;
      return "CALL " + ActionBar.internalChips(toCall);
    }
    if (action.type === "allin")
      return "ALL IN " + (myP ? ActionBar.internalChips(myP.chips) : "");
    if (action.type === "continue") return "NEXT HAND";
    if (action.type === "raise")
      return "RAISE " + ActionBar.internalChips(action.amount);
    return action.type.toUpperCase();
  },

  internalSimpleColors: function (action) {
    if (!action) return { bg: C.BTN_CHECK_BG, fg: C.TEXT };
    if (action.type === "fold") return { bg: C.BTN_FOLD_BG, fg: C.BTN_FOLD_FG };
    if (action.type === "check") return { bg: C.BTN_CHECK_BG, fg: C.BTN_CHECK_FG };
    if (action.type === "call") return { bg: C.BTN_CALL_BG, fg: C.BTN_CALL_FG };
    if (action.type === "raise") return { bg: C.BTN_RAISE_BG, fg: C.BTN_RAISE_FG };
    if (action.type === "allin")
      return { bg: C.BTN_ALLIN_BG1, fg: C.BTN_ALLIN_FG, stroke: C.GOLD, strokeA: 0.65 };
    if (action.type === "continue") return { bg: C.BTN_CONT_BG, fg: C.BTN_CONT_FG };
    return { bg: 0x1f2937, fg: C.TEXT };
  },

  internalParseActions: function (legalActions, view, myP) {
    var parsed = {
      simple: [],
      exactRaises: [],
      customRaise: null,
      customSchema: null,
    };
    for (var i = 0; i < legalActions.length; i++) {
      var option = legalActions[i];
      var action = ActionBar.internalDecisionOf(option);
      var schema = ActionBar.internalSchemaOf(option);
      if (!action || !action.type) continue;
      if (action.type === "raise") {
        if (schema && schema.fields && schema.fields.amount) {
          parsed.customRaise = action;
          parsed.customSchema = schema;
        } else {
          parsed.exactRaises.push(action);
        }
      } else {
        parsed.simple.push({
          action: action,
          label: ActionBar.internalSimpleLabel(action, view, myP),
        });
      }
    }
    return parsed;
  },

  internalRaiseInfo: function (parsed, view, myP) {
    if (!parsed.customRaise || !parsed.customSchema) return null;
    var amountField = parsed.customSchema.fields.amount;
    if (!amountField || amountField.kind !== "number") return null;
    var roundBet = myP ? myP.bet || 0 : 0;
    var stack = myP ? myP.chips || 0 : 0;
    var min = amountField.min;
    var max = amountField.max;
    if (typeof min !== "number" || typeof max !== "number" || max < min)
      return null;
    var step = Math.max(1, view.blinds ? view.blinds.small || 1 : 1);
    if (max - min < step) step = 1;
    return {
      min: min,
      max: max,
      step: step,
      roundBet: roundBet,
      stack: stack,
      pot: view.pot || 0,
      baseAction: parsed.customRaise,
    };
  },

  internalClampRaise: function (info, amount) {
    var out = Math.round(amount);
    if (info.step > 1) out = Math.round(out / info.step) * info.step;
    if (out < info.min) out = info.min;
    if (out > info.max) out = info.max;
    return out;
  },

  internalPresetRaises: function (info) {
    var out = [];
    var seen = {};
    var add = function (label, amount) {
      var clamped = ActionBar.internalClampRaise(info, amount);
      var key = String(clamped);
      if (seen[key]) return;
      seen[key] = true;
      out.push({ label: label, amount: clamped });
    };
    add("Min", info.min);
    var pct = [10, 25, 50, 75];
    for (var i = 0; i < pct.length; i++) {
      add(pct[i] + "%", info.roundBet + (info.stack * pct[i]) / 100);
    }
    return out;
  },

  internalRaiseContext: function (info, amount) {
    var commit = amount - info.roundBet;
    if (commit < 0) commit = 0;
    var pct = info.stack > 0 ? Math.round((commit / info.stack) * 100) : 0;
    var leaves = info.stack - commit;
    if (leaves < 0) leaves = 0;
    var pot = info.pot > 0 ? (amount / info.pot).toFixed(1) + "x pot" : "opens pot";
    return (
      "Commit " +
      ActionBar.internalChips(commit) +
      " | " +
      pct +
      "% stack | " +
      pot +
      " | Leaves " +
      ActionBar.internalChips(leaves)
    );
  },

  internalSubmitRaise: function (info, amount) {
    var action = Object.assign({}, info.baseAction, {
      amount: ActionBar.internalClampRaise(info, amount),
    });
    playgent.submitAction(action);
  },

  create: function (hudLayer, w, h) {
    ActionBar.internalParent = hudLayer;

    var myCards = new PIXI.Container();
    var mc0 = CardSprite.create("large");
    mc0.x = -Layout.cardW("large") * 0.55;
    mc0.showBack();
    myCards.addChild(mc0);
    var mc1 = CardSprite.create("large");
    mc1.x = Layout.cardW("large") * 0.55;
    mc1.showBack();
    myCards.addChild(mc1);
    myCards.visible = false;
    hudLayer.addChild(myCards);
    ActionBar.internalMyCardsContainer = myCards;
    ActionBar.internalMyCard0 = mc0;
    ActionBar.internalMyCard1 = mc1;

    var handName = new PIXI.Text({
      text: "",
      style: {
        fontFamily: '-apple-system, "Segoe UI", sans-serif',
        fontSize: 16,
        fontWeight: "bold",
        fill: C.PURPLE,
      },
    });
    handName.anchor.set(0.5, 1);
    handName.visible = false;
    hudLayer.addChild(handName);
    ActionBar.internalMyHandName = handName;

    var myChip = new PIXI.Text({
      text: "",
      style: {
        fontFamily: '-apple-system, "Segoe UI", sans-serif',
        fontSize: 17,
        fontWeight: "bold",
        fill: C.GOLD,
      },
    });
    myChip.anchor.set(0.5, 0);
    myChip.visible = false;
    hudLayer.addChild(myChip);
    ActionBar.internalMyChipText = myChip;

    ActionBar.reposition(w, h);
  },

  reposition: function (w, h) {
    var myY = Layout.myCardsY();
    ActionBar.internalMyCardsContainer.x = w / 2;
    ActionBar.internalMyCardsContainer.y = myY;
    CardSprite.resize(ActionBar.internalMyCard0);
    CardSprite.resize(ActionBar.internalMyCard1);
    var myCardW = Layout.cardW("large");
    var myCardH = Layout.cardH("large");
    ActionBar.internalMyCard0.x = -myCardW * 0.55;
    ActionBar.internalMyCard1.x = myCardW * 0.55;
    ActionBar.internalMyHandName.x = w / 2;
    ActionBar.internalMyHandName.y = myY - myCardH / 2 - 4;
    ActionBar.internalMyChipText.x = w / 2;
    ActionBar.internalMyChipText.y = myY + myCardH / 2 + 4;
  },

  internalPositionMyChipText: function (hasActions) {
    var myY = Layout.myCardsY();
    var myCardH = Layout.cardH("large");
    var gapBelowCards = Layout.actionAreaTop() - (myY + myCardH / 2);
    if (hasActions && gapBelowCards < 28) {
      ActionBar.internalMyChipText.anchor.set(0.5, 1);
      ActionBar.internalMyChipText.x = Layout.internalW / 2;
      ActionBar.internalMyChipText.y = myY - myCardH / 2 - 6;
    } else {
      ActionBar.internalMyChipText.anchor.set(0.5, 0);
      ActionBar.internalMyChipText.x = Layout.internalW / 2;
      ActionBar.internalMyChipText.y = myY + myCardH / 2 + 4;
    }
  },

  internalUpdateHandDisplay: function (view, context, myP) {
    var myId = context.myId;
    var isInGame = !!myP;
    var hasRevealedHand = view.revealedHands && view.revealedHands[myId];
    var isSpectator = !isInGame && !hasRevealedHand;

    if (hasRevealedHand) {
      var rh = view.revealedHands[myId];
      ActionBar.internalMyCardsContainer.visible = true;
      ActionBar.internalMyCard0.setCard(rh.cards[0]);
      ActionBar.internalMyCard1.setCard(rh.cards[1]);
      if (!ActionBar.internalMyCard0.internalFaceUp)
        ActionBar.internalMyCard0.showFace();
      if (!ActionBar.internalMyCard1.internalFaceUp)
        ActionBar.internalMyCard1.showFace();
      ActionBar.internalMyHandName.text = rh.handName;
      ActionBar.internalMyHandName.visible = true;
      var revealing = Renderer && Renderer._animatingCards
        ? Object.keys(Renderer._animatingCards).length > 0
        : false;
      ActionBar.internalMyChipText.visible = !!myP;
      if (myP && !revealing)
        ActionBar.internalMyChipText.text =
          "\uD83E\uDE99 " + ActionBar.internalChips(myP.chips);
    } else if (isSpectator) {
      ActionBar.internalMyCardsContainer.visible = false;
      ActionBar.internalMyChipText.visible = false;
    } else if (myP && view.myCards && view.myCards.length >= 2) {
      ActionBar.internalMyCardsContainer.visible = true;
      ActionBar.internalMyCard0.setCard(view.myCards[0]);
      ActionBar.internalMyCard1.setCard(view.myCards[1]);
      if (!ActionBar.internalMyCard0.internalFaceUp)
        ActionBar.internalMyCard0.showFace();
      if (!ActionBar.internalMyCard1.internalFaceUp)
        ActionBar.internalMyCard1.showFace();
      ActionBar.internalMyChipText.text =
        "\uD83E\uDE99 " + ActionBar.internalChips(myP.chips);
      if (myP.allIn) ActionBar.internalMyChipText.text += " | ALL IN";
      else if (myP.totalBet > 0)
        ActionBar.internalMyChipText.text +=
          " | Bet " + ActionBar.internalChips(myP.totalBet);
      ActionBar.internalMyChipText.visible = true;
    } else {
      ActionBar.internalMyCardsContainer.visible = false;
      ActionBar.internalMyChipText.visible = false;
    }

    if (view.phase !== "showdown") ActionBar.internalMyHandName.visible = false;
  },

  internalRenderSimpleRow: function (actions, view, myP) {
    var btnH = C.BTN_MIN_H;
    var gap = C.BTN_GAP;
    var count = actions.length;
    if (count === 0) return;
    var maxW = Math.min(Layout.internalW - 16, 720);
    var totalGap = (count - 1) * gap;
    var eachW = Math.floor((maxW - totalGap) / count);
    var widths = [];
    var totalW = totalGap;
    for (var i = 0; i < count; i++) {
      var natural = actions[i].label.length * 8 + C.BTN_PAD_X * 2;
      widths[i] = Math.max(C.BTN_MIN_H, Math.min(eachW, natural));
      totalW += widths[i];
    }
    if (totalW > maxW) {
      totalW = maxW;
      for (var wi = 0; wi < count; wi++) widths[wi] = eachW;
    }
    var x = (Layout.internalW - totalW) / 2;
    var y = Layout.actionBarY() - btnH / 2;
    for (var bi = 0; bi < count; bi++) {
      var action = actions[bi].action;
      var colors = ActionBar.internalSimpleColors(action);
      ActionBar.internalDrawButton(ActionBar.internalParent, {
        id: "action-" + bi,
        x: x,
        y: y,
        w: widths[bi],
        h: btnH,
        label: actions[bi].label,
        bg: colors.bg,
        fg: colors.fg,
        stroke: colors.stroke,
        strokeA: colors.strokeA,
        action: action,
        onTap: function () {},
      }).on("pointertap", (function (a) {
        return function () {
          playgent.submitAction(a);
        };
      })(action));
      x += widths[bi] + gap;
    }
  },

  internalRenderBetComposer: function (parsed, info) {
    var rect = Layout.betComposerRect();
    var compact = Layout.isPortrait() || rect.w < 560;
    var panel = new PIXI.Container();
    panel.x = rect.x;
    panel.y = rect.y;

    var shadow = new PIXI.Graphics();
    shadow.roundRect(0, 4, rect.w, rect.h, 8);
    shadow.fill({ color: 0x000000, alpha: 0.42 });
    panel.addChild(shadow);

    var bg = new PIXI.Graphics();
    bg.roundRect(0, 0, rect.w, rect.h, 8);
    bg.fill({ color: 0x101827, alpha: 0.96 });
    bg.roundRect(0.5, 0.5, rect.w - 1, rect.h - 1, 8);
    bg.stroke({ color: C.GOLD, width: 1, alpha: 0.22 });
    panel.addChild(bg);

    var selected = ActionBar.internalSelectedRaiseTo;
    if (selected === null || selected < info.min || selected > info.max) {
      selected = parsed.exactRaises.length > 0 ? parsed.exactRaises[0].amount : info.min;
    }
    selected = ActionBar.internalClampRaise(info, selected);
    ActionBar.internalSelectedRaiseTo = selected;

    var title = ActionBar.internalMakeText(
      "Raise to " + ActionBar.internalChips(selected),
      compact ? 18 : 20,
      C.GOLD,
      "800",
    );
    title.x = 18;
    title.y = 12;
    panel.addChild(title);

    var contextText = ActionBar.internalMakeText(
      ActionBar.internalRaiseContext(info, selected),
      compact ? 11 : 12,
      0xb6c3d7,
      "600",
    );
    contextText.x = 18;
    contextText.y = compact ? 38 : 40;
    panel.addChild(contextText);

    var presetY = compact ? 62 : 64;
    var presetH = 36;
    var presetGap = 7;
    var presetInner = rect.w - 36;
    var presets = ActionBar.internalPresetRaises(info);
    var presetW = Math.min(76, Math.floor((presetInner - presetGap * (presets.length - 1)) / presets.length));
    var presetX = 18;

    var updateAmount = function (amount) {
      selected = ActionBar.internalClampRaise(info, amount);
      ActionBar.internalSelectedRaiseTo = selected;
      title.text = "Raise to " + ActionBar.internalChips(selected);
      contextText.text = ActionBar.internalRaiseContext(info, selected);
      redrawSlider();
      redrawPresets();
    };

    var presetButtons = [];
    var redrawPresets = function () {
      for (var pi = 0; pi < presetButtons.length; pi++) {
        var item = presetButtons[pi];
        var active = item.amount === selected;
        item.bg.clear();
        item.bg.roundRect(0, 0, presetW, presetH, 7);
        item.bg.fill({ color: active ? 0x3b2e0a : 0x1a2637, alpha: 1 });
        item.bg.roundRect(0.5, 0.5, presetW - 1, presetH - 1, 7);
        item.bg.stroke({ color: active ? C.GOLD : 0x41516a, width: 1, alpha: active ? 0.75 : 0.5 });
        item.txt.style.fill = active ? C.GOLD : 0xd6deea;
      }
    };

    for (var p = 0; p < presets.length; p++) {
      var preset = presets[p];
      var chip = new PIXI.Container();
      chip.x = presetX + p * (presetW + presetGap);
      chip.y = presetY;
      var chipBg = new PIXI.Graphics();
      chip.addChild(chipBg);
      var chipText = ActionBar.internalMakeText(preset.label, 12, 0xd6deea, "800");
      chipText.anchor.set(0.5, 0.5);
      chipText.x = presetW / 2;
      chipText.y = presetH / 2;
      chip.addChild(chipText);
      chip.eventMode = "static";
      chip.cursor = "pointer";
      chip.hitArea = new PIXI.Rectangle(0, 0, presetW, presetH);
      (function (amount) {
        chip.on("pointertap", function () {
          if (playgent.sound) playgent.sound("ui.confirm");
          updateAmount(amount);
        });
      })(preset.amount);
      panel.addChild(chip);
      presetButtons.push({ bg: chipBg, txt: chipText, amount: preset.amount });
      ActionBar.internalRegisterRegion(
        "raise-preset-" + p,
        preset.label,
        "raise",
        rect.x + chip.x,
        rect.y + chip.y,
        presetW,
        presetH,
      );
    }

    var sliderY = compact ? 112 : 110;
    var actionY = compact ? 148 : 126;
    var rowH = 40;
    var simple = parsed.simple;
    var confirmLabel = "RAISE";
    var actionCount = simple.length + 1;
    var rowGap = 8;
    var rowInner = rect.w - 36;
    var buttonW = Math.floor((rowInner - rowGap * (actionCount - 1)) / actionCount);
    var rowX = 18;

    var trackX = 24;
    var trackW = rect.w - 48;
    var trackBg = new PIXI.Graphics();
    var trackFill = new PIXI.Graphics();
    var handle = new PIXI.Graphics();
    panel.addChild(trackBg, trackFill, handle);

    var redrawSlider = function () {
      var ratio = info.max > info.min ? (selected - info.min) / (info.max - info.min) : 0;
      if (ratio < 0) ratio = 0;
      if (ratio > 1) ratio = 1;
      var fillW = trackW * ratio;
      trackBg.clear();
      trackBg.roundRect(trackX, sliderY, trackW, 6, 3);
      trackBg.fill({ color: 0x263247, alpha: 1 });
      trackFill.clear();
      trackFill.roundRect(trackX, sliderY, Math.max(6, fillW), 6, 3);
      trackFill.fill({ color: C.GOLD, alpha: 0.95 });
      handle.clear();
      handle.circle(trackX + fillW, sliderY + 3, 12);
      handle.fill({ color: 0x0f172a });
      handle.circle(trackX + fillW, sliderY + 3, 9);
      handle.fill({ color: C.GOLD });
    };

    var sliderHit = new PIXI.Graphics();
    sliderHit.rect(trackX, sliderY - 18, trackW, 42);
    sliderHit.fill({ color: 0x000000, alpha: 0.001 });
    sliderHit.eventMode = "static";
    sliderHit.cursor = "pointer";
    var dragging = false;
    var updateFromPointer = function (event) {
      var local = sliderHit.toLocal(event.global);
      var ratio = (local.x - trackX) / trackW;
      if (ratio < 0) ratio = 0;
      if (ratio > 1) ratio = 1;
      updateAmount(info.min + (info.max - info.min) * ratio);
    };
    sliderHit.on("pointerdown", function (event) {
      dragging = true;
      updateFromPointer(event);
    });
    sliderHit.on("globalpointermove", function (event) {
      if (dragging) updateFromPointer(event);
    });
    sliderHit.on("pointerup", function () {
      dragging = false;
    });
    sliderHit.on("pointerupoutside", function () {
      dragging = false;
    });
    panel.addChild(sliderHit);
    ActionBar.internalRegisterRegion(
      "raise-slider",
      "Raise amount",
      "raise",
      rect.x + trackX,
      rect.y + sliderY - 18,
      trackW,
      42,
    );

    for (var si = 0; si < simple.length; si++) {
      var action = simple[si].action;
      var colors = ActionBar.internalSimpleColors(action);
      (function (a, label, x) {
        ActionBar.internalDrawButton(panel, {
          id: "action-" + si,
          x: x,
          y: actionY,
          w: buttonW,
          h: rowH,
          label: label,
          bg: colors.bg,
          fg: colors.fg,
          stroke: colors.stroke,
          strokeA: colors.strokeA,
          fontSize: 12,
          action: a,
          regionX: rect.x + x,
          regionY: rect.y + actionY,
          onTap: function () {
            playgent.submitAction(a);
          },
        });
      })(action, simple[si].label, rowX + si * (buttonW + rowGap));
    }

    ActionBar.internalDrawButton(panel, {
      id: "action-raise-confirm",
      x: rowX + simple.length * (buttonW + rowGap),
      y: actionY,
      w: buttonW,
      h: rowH,
      label: confirmLabel,
      bg: C.BTN_RAISE_BG,
      fg: C.BTN_RAISE_FG,
      stroke: C.GOLD,
      strokeA: 0.75,
      fontSize: 12,
      action: { type: "raise" },
      regionX: rect.x + rowX + simple.length * (buttonW + rowGap),
      regionY: rect.y + actionY,
      onTap: function () {
        ActionBar.internalSubmitRaise(info, selected);
      },
    });

    redrawSlider();
    redrawPresets();
    ActionBar.internalParent.addChild(panel);
    ActionBar.internalButtons.push(panel);
  },

  update: function (view, legalActions, context) {
    var myId = context.myId;
    var myP = null;
    if (view.players) {
      for (var i = 0; i < view.players.length; i++) {
        if (view.players[i].id === myId) {
          myP = view.players[i];
          break;
        }
      }
    }

    ActionBar.internalPositionMyChipText(!!(legalActions && legalActions.length > 0));
    ActionBar.internalUpdateHandDisplay(view, context, myP);
    ActionBar.internalDestroyControls();

    if (!legalActions || legalActions.length === 0) {
      ActionBar.internalLastActionCount = 0;
      return;
    }

    ActionBar.internalLastActionCount = legalActions.length;
    var parsed = ActionBar.internalParseActions(legalActions, view, myP);
    var raiseInfo = ActionBar.internalRaiseInfo(parsed, view, myP);
    if (raiseInfo) {
      ActionBar.internalRenderBetComposer(parsed, raiseInfo);
    } else {
      ActionBar.internalSelectedRaiseTo = null;
      var simple = parsed.simple.slice();
      for (var r = 0; r < parsed.exactRaises.length; r++) {
        simple.push({
          action: parsed.exactRaises[r],
          label: ActionBar.internalSimpleLabel(parsed.exactRaises[r], view, myP),
        });
      }
      ActionBar.internalRenderSimpleRow(simple, view, myP);
    }
  },
};
