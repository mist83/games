/* ===== SHOP PANEL (1v1/2v2 — reroll 2g, gift unit/gold in 2v2) ===== */

var ShopPanel = {
  internalContainer: null,
  internalCards: [],
  internalGoldText: null,
  internalGoldChangeText: null,
  internalRerollBtn: null,
  internalReadyBtn: null,
  internalGiftUnitBtn: null,
  internalGiftGoldBtn: null,
  internalWaitingText: null,
  internalLastGold: -1,
  internalLegalActions: [],

  internalRegisterRegion: function (id, node, label, actionType) {
    if (
      !node ||
      !window["__playgentE2ERegisterRegion"] ||
      !window["__playgentE2EPixiBounds"]
    )
      return;
    if (node.visible === false || node.eventMode === "none" || node.alpha <= 0)
      return;
    window["__playgentE2ERegisterRegion"]({
      id: id,
      kind: "button",
      label: label,
      actionType: actionType,
      rect: window["__playgentE2EPixiBounds"](node, GameRenderer.app),
    });
  },

  create: function (parent, w, h) {
    var cont = new PIXI.Container();
    cont.label = "shopPanel";
    ShopPanel.internalContainer = cont;

    /* Gold icon + number — compact visual, left of reroll */
    var goldIcon = new PIXI.Graphics();
    goldIcon.circle(0, 0, 8).fill({ color: 0xffd700 });
    goldIcon.circle(0, 0, 5).stroke({ color: 0xb8860b, width: 1.5 });
    goldIcon.x = w / 2 - 140;
    goldIcon.y = 20;
    cont.addChild(goldIcon);
    var goldText = new PIXI.Text({
      text: "0",
      style: {
        fontSize: 14,
        fill: 0xffd700,
        fontFamily: "monospace",
        fontWeight: "bold",
      },
    });
    goldText.anchor.set(0, 0.5);
    goldText.x = w / 2 - 128;
    goldText.y = 20;
    ShopPanel.internalGoldText = goldText;
    ShopPanel.internalGoldIcon = goldIcon;
    cont.addChild(goldText);

    /* Gold change floating text */
    var goldChangeText = new PIXI.Text({
      text: "",
      style: {
        fontSize: 12,
        fill: 0x22c55e,
        fontFamily: "monospace",
        fontWeight: "bold",
      },
    });
    goldChangeText.x = w / 2 - 70;
    goldChangeText.y = 10;
    goldChangeText.alpha = 0;
    ShopPanel.internalGoldChangeText = goldChangeText;
    cont.addChild(goldChangeText);

    /* 4 shop cards — centered */
    var cardW = (w - 50) / 4;
    if (cardW > 90) cardW = 90;
    var cardH = 90;
    var totalCardW = 4 * (cardW + 10) - 10;
    var cardStartX = (w - totalCardW) / 2;
    if (cardStartX < 6) cardStartX = 6;
    for (var i = 0; i < 4; i++) {
      var card = new PIXI.Container();
      card.internalIdx = i;

      var bg = new PIXI.Graphics();
      bg.roundRect(0, 0, cardW, cardH, 6)
        .fill({ color: 0x1a2332 })
        .stroke({ color: 0x3a4a5a, width: 1 });
      card.internalBg = bg;
      card.addChild(bg);

      var nameT = new PIXI.Text({
        text: "",
        style: {
          fontSize: 11,
          fill: 0xffffff,
          fontFamily: "monospace",
          fontWeight: "bold",
          wordWrap: true,
          wordWrapWidth: cardW - 6,
        },
      });
      nameT.x = 4;
      nameT.y = 6;
      card.internalNameText = nameT;
      card.addChild(nameT);

      var statsT = new PIXI.Text({
        text: "",
        style: { fontSize: 10, fill: 0xaaaaaa, fontFamily: "monospace" },
      });
      statsT.x = 4;
      statsT.y = 22;
      card.internalStatsText = statsT;
      card.addChild(statsT);

      /* Cost and trait text removed — redundant with visual preview + cost badge */

      /* Trait color bar at top */
      var traitBar = new PIXI.Graphics();
      traitBar.rect(0, 0, cardW, 3).fill({ color: 0xffffff });
      traitBar.tint = 0x333333;
      card.internalTraitBar = traitBar;
      card.addChild(traitBar);

      card.x = cardStartX + i * (cardW + 10);
      card.y = 38;
      card.eventMode = "static";
      card.cursor = "pointer";

      /* Unit preview — larger, uses per-unit context */
      var miniPreview = new PIXI.Graphics(TRAIT_CONTEXTS.warrior);
      miniPreview.scale.set(0.8);
      miniPreview.x = cardW / 2;
      miniPreview.y = 58;
      card.internalMiniPreview = miniPreview;
      card.addChild(miniPreview);

      /* Gold cost badge */
      var costBadge = new PIXI.Graphics();
      costBadge.circle(0, 0, 9).fill({ color: 0xd97706 });
      costBadge.x = cardW - 12;
      costBadge.y = 12;
      card.internalCostBadge = costBadge;
      card.addChild(costBadge);

      var costBadgeText = new PIXI.Text({
        text: "1",
        style: {
          fontSize: 8,
          fill: 0xffffff,
          fontFamily: "monospace",
          fontWeight: "bold",
        },
      });
      costBadgeText.anchor.set(0.5, 0.5);
      costBadgeText.x = cardW - 12;
      costBadgeText.y = 12;
      card.internalCostBadgeText = costBadgeText;
      card.addChild(costBadgeText);

      /* Hover animations */
      card.on(
        "pointerover",
        (function (c) {
          return function () {
            Tween.killTweensOf(c);
            Tween.to(c, { scaleX: 1.05, scaleY: 1.05 }, 150, "backOut");
          };
        })(card),
      );
      card.on(
        "pointerout",
        (function (c) {
          return function () {
            Tween.killTweensOf(c);
            Tween.to(c, { scaleX: 1, scaleY: 1 }, 150, "easeOut");
          };
        })(card),
      );

      card.on(
        "pointertap",
        (function (idx) {
          return function () {
            var actions = ShopPanel.internalLegalActions;
            for (var a = 0; a < actions.length; a++) {
              if (actions[a].type === "buy" && actions[a].shopIndex === idx) {
                var c = ShopPanel.internalCards[idx];
                if (c) {
                  Tween.killTweensOf(c);
                  Tween.to(
                    c,
                    { alpha: 0, scaleX: 0.8, scaleY: 0.8 },
                    200,
                    "easeOut",
                  );
                }
                if (playgent.sound) playgent.sound("coin.purchase");
                playgent.submitAction(actions[a]);
                return;
              }
            }
          };
        })(i),
      );

      card.scaleX = 1;
      card.scaleY = 1;
      ShopPanel.internalCards.push(card);
      cont.addChild(card);
    }

    /* Sell button — left of reroll, greyed out unless bench unit selected */
    var sellBtn = new PIXI.Container();
    var sellBg = new PIXI.Graphics();
    sellBg.roundRect(0, 0, 56, 30, 6).fill({ color: 0xdc2626 });
    sellBtn.addChild(sellBg);
    sellBtn.internalBg = sellBg;
    var sellT = new PIXI.Text({
      text: "Sell",
      style: {
        fontSize: 12,
        fill: 0xffffff,
        fontFamily: "monospace",
        fontWeight: "bold",
      },
    });
    sellT.anchor.set(0.5, 0.5);
    sellT.x = 28;
    sellT.y = 15;
    sellBtn.addChild(sellT);
    sellBtn.x = w / 2 - 102;
    sellBtn.y = 5;
    sellBtn.alpha = 0.3;
    sellBtn.eventMode = "none";
    sellBtn.cursor = "pointer";
    sellBtn.on("pointertap", function () {
      var benchIdx = BenchPanel.internalSelectedIdx;
      if (benchIdx < 0) return;
      var actions = BenchPanel.internalLegalActions;
      for (var a = 0; a < actions.length; a++) {
        if (actions[a].type === "sell" && actions[a].benchIndex === benchIdx) {
          if (playgent.sound) playgent.sound("coin.sell");
          playgent.submitAction(actions[a]);
          BenchPanel.internalSelectedIdx = -1;
          BenchPanel.internalHighlightSelected();
          BoardView.clearHighlights();
          return;
        }
      }
    });
    ShopPanel.internalSellBtn = sellBtn;
    cont.addChild(sellBtn);

    /* Reroll button — right of sell */
    var rerollBtn = new PIXI.Container();
    var rerollBg = new PIXI.Graphics();
    rerollBg.roundRect(0, 0, 72, 30, 6).fill({ color: 0x1e40af });
    rerollBtn.addChild(rerollBg);
    rerollBtn.internalBg = rerollBg;
    var rerollT = new PIXI.Text({
      text: "Reroll",
      style: {
        fontSize: 12,
        fill: 0xffffff,
        fontFamily: "monospace",
        fontWeight: "bold",
      },
    });
    rerollT.anchor.set(0.5, 0.5);
    rerollT.x = 36;
    rerollT.y = 15;
    rerollBtn.addChild(rerollT);
    rerollBtn.x = w / 2 - 38;
    rerollBtn.y = 5;
    rerollBtn.eventMode = "static";
    rerollBtn.cursor = "pointer";
    rerollBtn.on("pointertap", function () {
      var actions = ShopPanel.internalLegalActions;
      for (var a = 0; a < actions.length; a++) {
        if (actions[a].type === "reroll") {
          if (playgent.sound) playgent.sound("coin.purchase");
          playgent.submitAction(actions[a]);
          return;
        }
      }
    });
    ShopPanel.internalRerollBtn = rerollBtn;
    cont.addChild(rerollBtn);

    /* Ready button — larger, right of reroll */
    var readyBtn = new PIXI.Container();
    var readyBg = new PIXI.Graphics();
    readyBg.roundRect(0, 0, 72, 30, 6).fill({ color: 0xffffff });
    readyBg.tint = 0x059669;
    readyBtn.addChild(readyBg);
    readyBtn.internalBg = readyBg;
    var readyT = new PIXI.Text({
      text: "Ready",
      style: {
        fontSize: 12,
        fill: 0xffffff,
        fontFamily: "monospace",
        fontWeight: "bold",
      },
    });
    readyT.anchor.set(0.5, 0.5);
    readyT.x = 36;
    readyT.y = 15;
    readyBtn.addChild(readyT);
    readyBtn.internalLabel = readyT;
    readyBtn.x = w / 2 + 40;
    readyBtn.y = 5;
    readyBtn.eventMode = "static";
    readyBtn.cursor = "pointer";
    readyBtn.on("pointertap", function () {
      var actions = ShopPanel.internalLegalActions;
      for (var a = 0; a < actions.length; a++) {
        if (actions[a].type === "ready") {
          if (playgent.sound) playgent.sound("ui.confirm");
          playgent.submitAction(actions[a]);
          return;
        }
      }
    });
    ShopPanel.internalReadyBtn = readyBtn;
    cont.addChild(readyBtn);

    /* Gift Unit button (2v2 only) — right of ready */
    var giftUnitBtn = new PIXI.Container();
    var guBg = new PIXI.Graphics();
    guBg.roundRect(0, 0, 44, 30, 6).fill({ color: 0x7c3aed });
    giftUnitBtn.addChild(guBg);
    giftUnitBtn.internalBg = guBg;
    var guLabel = new PIXI.Text({
      text: "Gift",
      style: {
        fontSize: 10,
        fill: 0xffffff,
        fontFamily: "monospace",
        fontWeight: "bold",
      },
    });
    guLabel.anchor.set(0.5, 0.5);
    guLabel.x = 22;
    guLabel.y = 10;
    giftUnitBtn.addChild(guLabel);
    var guSub = new PIXI.Text({
      text: "Unit",
      style: { fontSize: 8, fill: 0xcccccc, fontFamily: "monospace" },
    });
    guSub.anchor.set(0.5, 0.5);
    guSub.x = 22;
    guSub.y = 22;
    giftUnitBtn.internalSubLabel = guSub;
    giftUnitBtn.addChild(guSub);
    giftUnitBtn.x = w / 2 + 118;
    giftUnitBtn.y = 5;
    giftUnitBtn.visible = false;
    giftUnitBtn.eventMode = "none";
    giftUnitBtn.cursor = "pointer";
    giftUnitBtn.on("pointertap", function () {
      var benchIdx = BenchPanel.internalSelectedIdx;
      if (benchIdx < 0) return;
      var actions = ShopPanel.internalLegalActions;
      for (var a = 0; a < actions.length; a++) {
        if (
          actions[a].type === "giftUnit" &&
          actions[a].benchIndex === benchIdx
        ) {
          if (playgent.sound) playgent.sound("card.pass");
          playgent.submitAction(actions[a]);
          BenchPanel.internalSelectedIdx = -1;
          BenchPanel.internalHighlightSelected();
          return;
        }
      }
    });
    ShopPanel.internalGiftUnitBtn = giftUnitBtn;
    cont.addChild(giftUnitBtn);

    /* Gift Gold button (2v2 only) — right of gift unit */
    var giftGoldBtn = new PIXI.Container();
    var ggBg = new PIXI.Graphics();
    ggBg.roundRect(0, 0, 44, 30, 6).fill({ color: 0xb45309 });
    giftGoldBtn.addChild(ggBg);
    giftGoldBtn.internalBg = ggBg;
    var ggLabel = new PIXI.Text({
      text: "Gift",
      style: {
        fontSize: 10,
        fill: 0xffffff,
        fontFamily: "monospace",
        fontWeight: "bold",
      },
    });
    ggLabel.anchor.set(0.5, 0.5);
    ggLabel.x = 22;
    ggLabel.y = 10;
    giftGoldBtn.addChild(ggLabel);
    var ggSub = new PIXI.Text({
      text: "2→1g",
      style: { fontSize: 8, fill: 0xffd700, fontFamily: "monospace" },
    });
    ggSub.anchor.set(0.5, 0.5);
    ggSub.x = 22;
    ggSub.y = 22;
    giftGoldBtn.internalSubLabel = ggSub;
    giftGoldBtn.addChild(ggSub);
    giftGoldBtn.x = w / 2 + 168;
    giftGoldBtn.y = 5;
    giftGoldBtn.visible = false;
    giftGoldBtn.eventMode = "none";
    giftGoldBtn.cursor = "pointer";
    giftGoldBtn.on("pointertap", function () {
      var actions = ShopPanel.internalLegalActions;
      for (var a = 0; a < actions.length; a++) {
        if (actions[a].type === "giftGold") {
          if (playgent.sound) playgent.sound("coin.purchase");
          playgent.submitAction(actions[a]);
          return;
        }
      }
    });
    ShopPanel.internalGiftGoldBtn = giftGoldBtn;
    cont.addChild(giftGoldBtn);

    /* Waiting overlay */
    var waitingText = new PIXI.Text({
      text: "WAITING...",
      style: {
        fontSize: 16,
        fill: 0xffd700,
        fontFamily: "monospace",
        fontWeight: "bold",
      },
    });
    waitingText.anchor.set(0.5, 0.5);
    waitingText.x = w / 2;
    waitingText.y = 80;
    waitingText.visible = false;
    ShopPanel.internalWaitingText = waitingText;
    cont.addChild(waitingText);

    cont.y = Layout.shopY(h);
    parent.addChild(cont);
  },

  reposition: function (w, h) {
    if (!ShopPanel.internalContainer) return;
    ShopPanel.internalContainer.y = Layout.shopY(h);
    if (ShopPanel.internalSellBtn) ShopPanel.internalSellBtn.x = w / 2 - 102;
    ShopPanel.internalRerollBtn.x = w / 2 - 38;
    ShopPanel.internalReadyBtn.x = w / 2 + 40;
    if (ShopPanel.internalGiftUnitBtn)
      ShopPanel.internalGiftUnitBtn.x = w / 2 + 118;
    if (ShopPanel.internalGiftGoldBtn)
      ShopPanel.internalGiftGoldBtn.x = w / 2 + 168;
    if (ShopPanel.internalGoldIcon) {
      ShopPanel.internalGoldIcon.x = w / 2 - 140;
    }
    if (ShopPanel.internalGoldText) {
      ShopPanel.internalGoldText.x = w / 2 - 128;
    }
  },

  update: function (shopUnits, gold, legalActions, isReady, isSpectator, mode) {
    ShopPanel.internalLegalActions = legalActions || [];
    var goldStr = "" + (gold !== undefined ? gold : "?");
    if (ShopPanel.internalGoldText.text !== goldStr) {
      ShopPanel.internalGoldText.text = goldStr;
      Tween.killTweensOf(ShopPanel.internalGoldText);
      ShopPanel.internalGoldText.scale.set(1.3);
      Tween.to(
        ShopPanel.internalGoldText,
        { scaleX: 1, scaleY: 1 },
        300,
        "backOut",
      );

      if (
        gold !== undefined &&
        ShopPanel.internalLastGold >= 0 &&
        gold > ShopPanel.internalLastGold
      ) {
        var diff = gold - ShopPanel.internalLastGold;
        ShopPanel.internalGoldChangeText.text = "+" + diff + " gold";
        ShopPanel.internalGoldChangeText.alpha = 1;
        ShopPanel.internalGoldChangeText.y = 0;
        Tween.killTweensOf(ShopPanel.internalGoldChangeText);
        Tween.to(
          ShopPanel.internalGoldChangeText,
          { y: -20, alpha: 0 },
          1200,
          "easeOut",
        );
      }
      if (gold !== undefined) ShopPanel.internalLastGold = gold;
    }

    var canReroll = false;
    var canReady = false;
    for (var a = 0; a < ShopPanel.internalLegalActions.length; a++) {
      if (ShopPanel.internalLegalActions[a].type === "reroll") canReroll = true;
      if (ShopPanel.internalLegalActions[a].type === "ready") canReady = true;
    }

    for (var i = 0; i < 4; i++) {
      var card = ShopPanel.internalCards[i];
      var unit = shopUnits ? shopUnits[i] : null;
      if (unit) {
        card.visible = true;
        var nm = unit.name || unit.unitId || "?";
        if (card.internalNameText.text !== nm) card.internalNameText.text = nm;
        var st = (unit.atk || 0) + "/" + (unit.hp || 0);
        if (card.internalStatsText.text !== st)
          card.internalStatsText.text = st;

        var palette = TRAIT_PALETTES[unit.trait];
        var barColor = palette ? palette.primary : 0x333333;
        card.internalTraitBar.tint = barColor;

        /* Use per-unit context for preview */
        var unitCtx = _getUnitContext(unit.unitId, unit.trait);
        if (unitCtx && card.internalMiniPreview) {
          card.internalMiniPreview.context = unitCtx;
        }

        var tierCost = unit.tier || 1;
        if (card.internalCostBadgeText)
          card.internalCostBadgeText.text = "" + tierCost;

        card.eventMode = isSpectator ? "none" : "static";
        card.alpha = 1;
        card.scaleX = 1;
        card.scaleY = 1;
        var buyLegal = false;
        for (var buy = 0; buy < ShopPanel.internalLegalActions.length; buy++) {
          if (
            ShopPanel.internalLegalActions[buy].type === "buy" &&
            ShopPanel.internalLegalActions[buy].shopIndex === i
          ) {
            buyLegal = true;
            break;
          }
        }
        if (buyLegal && !isSpectator) {
          ShopPanel.internalRegisterRegion("shop-buy-" + i, card, nm, "buy");
        }
      } else {
        card.visible = false;
      }
    }

    ShopPanel.internalRerollBtn.alpha = canReroll && !isSpectator ? 1 : 0.4;
    ShopPanel.internalRerollBtn.eventMode =
      canReroll && !isSpectator ? "static" : "none";
    if (canReroll && !isSpectator)
      ShopPanel.internalRegisterRegion(
        "reroll",
        ShopPanel.internalRerollBtn,
        "Reroll",
        "reroll",
      );

    if (isReady) {
      ShopPanel.internalReadyBtn.internalLabel.text = "Ready!";
      ShopPanel.internalReadyBtn.internalBg.tint = 0x374151;
      ShopPanel.internalReadyBtn.eventMode = "none";
      ShopPanel.internalReadyBtn.alpha = 0.6;
      for (var d = 0; d < 4; d++) {
        ShopPanel.internalCards[d].alpha = 0.4;
        ShopPanel.internalCards[d].eventMode = "none";
      }
      ShopPanel.internalRerollBtn.alpha = 0.3;
      ShopPanel.internalRerollBtn.eventMode = "none";
      if (ShopPanel.internalWaitingText)
        ShopPanel.internalWaitingText.visible = true;
    } else {
      ShopPanel.internalReadyBtn.internalLabel.text = "Ready";
      ShopPanel.internalReadyBtn.internalBg.tint = 0x059669;
      ShopPanel.internalReadyBtn.alpha = canReady && !isSpectator ? 1 : 0.4;
      ShopPanel.internalReadyBtn.eventMode =
        canReady && !isSpectator ? "static" : "none";
      if (canReady && !isSpectator)
        ShopPanel.internalRegisterRegion(
          "ready",
          ShopPanel.internalReadyBtn,
          "Ready",
          "ready",
        );
      if (ShopPanel.internalWaitingText)
        ShopPanel.internalWaitingText.visible = false;
    }

    /* Gift buttons — visible only in 2v2, enabled based on legal actions */
    var hasGiftUnit = false;
    var hasGiftGold = false;
    for (var g = 0; g < ShopPanel.internalLegalActions.length; g++) {
      if (ShopPanel.internalLegalActions[g].type === "giftUnit")
        hasGiftUnit = true;
      if (ShopPanel.internalLegalActions[g].type === "giftGold")
        hasGiftGold = true;
    }
    var is2v2 = mode === "2v2";

    if (ShopPanel.internalGiftUnitBtn) {
      // Show in 2v2 mode (detect from view data passed via legalActions presence)
      ShopPanel.internalGiftUnitBtn.visible = is2v2;
      if (
        hasGiftUnit &&
        BenchPanel.internalSelectedIdx >= 0 &&
        !isSpectator &&
        !isReady
      ) {
        // Check if the selected bench unit has a matching giftUnit action
        var benchIdx = BenchPanel.internalSelectedIdx;
        var hasMatchingGift = false;
        for (var gu = 0; gu < ShopPanel.internalLegalActions.length; gu++) {
          if (
            ShopPanel.internalLegalActions[gu].type === "giftUnit" &&
            ShopPanel.internalLegalActions[gu].benchIndex === benchIdx
          ) {
            hasMatchingGift = true;
            break;
          }
        }
        ShopPanel.internalGiftUnitBtn.alpha = hasMatchingGift ? 1 : 0.3;
        ShopPanel.internalGiftUnitBtn.eventMode = hasMatchingGift
          ? "static"
          : "none";
        ShopPanel.internalGiftUnitBtn.internalSubLabel.text = "Unit";
      } else {
        ShopPanel.internalGiftUnitBtn.alpha = 0.3;
        ShopPanel.internalGiftUnitBtn.eventMode = "none";
        if (!hasGiftUnit && is2v2)
          ShopPanel.internalGiftUnitBtn.internalSubLabel.text = "Next rnd";
      }
    }

    if (ShopPanel.internalGiftGoldBtn) {
      ShopPanel.internalGiftGoldBtn.visible = is2v2;
      if (hasGiftGold && !isSpectator && !isReady) {
        ShopPanel.internalGiftGoldBtn.alpha = 1;
        ShopPanel.internalGiftGoldBtn.eventMode = "static";
        ShopPanel.internalGiftGoldBtn.internalSubLabel.text = "2\u21921g";
        ShopPanel.internalRegisterRegion(
          "gift-gold",
          ShopPanel.internalGiftGoldBtn,
          "Gift Gold",
          "giftGold",
        );
      } else {
        ShopPanel.internalGiftGoldBtn.alpha = 0.3;
        ShopPanel.internalGiftGoldBtn.eventMode = "none";
        if (!hasGiftGold && is2v2)
          ShopPanel.internalGiftGoldBtn.internalSubLabel.text = "Next rnd";
      }
    }

    /* Update sell button based on bench selection */
    ShopPanel.updateSellButton();
  },

  /** Enable/disable sell button based on whether a bench unit is selected */
  updateSellButton: function () {
    if (!ShopPanel.internalSellBtn) return;
    var benchIdx = BenchPanel.internalSelectedIdx;
    var hasSellAction = false;
    if (benchIdx >= 0) {
      var actions = BenchPanel.internalLegalActions;
      for (var s = 0; s < actions.length; s++) {
        if (actions[s].type === "sell" && actions[s].benchIndex === benchIdx) {
          hasSellAction = true;
          break;
        }
      }
    }
    if (hasSellAction) {
      ShopPanel.internalSellBtn.alpha = 1;
      ShopPanel.internalSellBtn.eventMode = "static";
      ShopPanel.internalRegisterRegion(
        "sell-bench-" + benchIdx,
        ShopPanel.internalSellBtn,
        "Sell",
        "sell",
      );
    } else {
      ShopPanel.internalSellBtn.alpha = 0.3;
      ShopPanel.internalSellBtn.eventMode = "none";
    }
  },
};
