/* ===== EFFECTS ===== */
/* Particle pool, screen shake, chip animations, celebrations */

var EffectPool = {
  internalSparks: [],
  internalActiveSparks: [],
  internalParent: null,

  create: function (fxLayer) {
    EffectPool.internalParent = fxLayer;
    for (var i = 0; i < C.POOL_SPARKS; i++) {
      var spark = new PIXI.Graphics();
      spark.circle(0, 0, 2);
      spark.fill({ color: 0xffffff });
      spark.visible = false;
      spark.internalVx = 0;
      spark.internalVy = 0;
      spark.internalLife = 0;
      spark.internalMaxLife = 0;
      spark.internalGravity = 0;
      fxLayer.addChild(spark);
      EffectPool.internalSparks.push(spark);
    }
  },

  internalGetSpark: function () {
    for (var i = 0; i < EffectPool.internalSparks.length; i++) {
      if (!EffectPool.internalSparks[i].visible)
        return EffectPool.internalSparks[i];
    }
    return null;
  },

  emitSparks: function (x, y, count, color, gravity) {
    for (var i = 0; i < count; i++) {
      var s = EffectPool.internalGetSpark();
      if (!s) break;
      s.tint = color || 0xffffff;
      s.x = x;
      s.y = y;
      s.alpha = 1;
      s.visible = true;
      s.scale.set(1);
      var angle = (i / count) * Math.PI * 2 + i * 0.3;
      var speed = 2 + (i % 3);
      s.internalVx = Math.cos(angle) * speed;
      s.internalVy = Math.sin(angle) * speed;
      s.internalGravity = gravity || 0;
      s.internalLife = 0;
      s.internalMaxLife = 20 + (i % 10);
      EffectPool.internalActiveSparks.push(s);
    }
  },

  /**
   * Chip rain effect — gold particles falling from top (legacy, full width).
   * @param {number} w - Canvas width used to center the rain.
   * @param {number} count - Number of coins to emit.
   */
  chipRain: function (w, count) {
    EffectPool.coinRainOnWinner(w / 2, w, count);
  },

  /**
   * Coin rain focused on a winner's position.
   * Larger coins (scale 3-5x) that fall with wobble and spin feel.
   * @param {number} centerX - X position of the winner
   * @param {number} spread - width of the rain area
   * @param {number} count - number of coins
   */
  coinRainOnWinner: function (centerX, spread, count) {
    var halfSpread = spread / 2;
    for (var i = 0; i < count; i++) {
      var s = EffectPool.internalGetSpark();
      if (!s) break;
      /* Alternate gold shades for variety */
      s.tint = i % 3 === 0 ? C.GOLD : i % 3 === 1 ? C.GOLD_DIM : 0xffe08a;
      s.x = centerX - halfSpread + (i / count) * spread + ((i * 23) % 30) - 15;
      s.y = -15 - (i % 4) * 25;
      s.alpha = 1;
      s.visible = true;
      /* Large coins: 3x-5x base size */
      s.scale.set(3 + (i % 5) * 0.5);
      /* Slight horizontal wobble */
      s.internalVx = Math.sin(i * 1.3) * 0.8;
      s.internalVy = 1.5 + (i % 4) * 0.5;
      s.internalGravity = 0.04;
      s.internalLife = 0;
      s.internalMaxLife = 80 + (i % 30);
      EffectPool.internalActiveSparks.push(s);
    }
  },

  clear: function () {
    for (var i = 0; i < EffectPool.internalActiveSparks.length; i++) {
      EffectPool.internalActiveSparks[i].visible = false;
    }
    EffectPool.internalActiveSparks = [];
  },

  update: function (dt) {
    for (var i = EffectPool.internalActiveSparks.length - 1; i >= 0; i--) {
      var p = EffectPool.internalActiveSparks[i];
      p.internalLife++;
      p.x += p.internalVx;
      p.y += p.internalVy;
      p.internalVy += p.internalGravity;
      p.alpha = 1 - p.internalLife / p.internalMaxLife;
      if (p.internalLife >= p.internalMaxLife) {
        p.visible = false;
        EffectPool.internalActiveSparks.splice(i, 1);
      }
    }
  },
};

/* ===== SCREEN SHAKE ===== */

var ScreenShake = {
  internalAmplitude: 0,
  internalDecay: 0.9,
  internalTarget: null,

  init: function (gameWorld) {
    ScreenShake.internalTarget = gameWorld;
  },

  shake: function (intensity) {
    ScreenShake.internalAmplitude = Math.min(intensity, 12);
  },

  update: function () {
    if (ScreenShake.internalAmplitude < 0.1) {
      if (ScreenShake.internalTarget) {
        ScreenShake.internalTarget.pivot.x = 0;
        ScreenShake.internalTarget.pivot.y = 0;
      }
      return;
    }
    if (ScreenShake.internalTarget) {
      var t = performance.now() * 0.05;
      ScreenShake.internalTarget.pivot.x =
        Math.sin(t * 7) * ScreenShake.internalAmplitude;
      ScreenShake.internalTarget.pivot.y =
        Math.cos(t * 11) * ScreenShake.internalAmplitude * 0.7;
    }
    ScreenShake.internalAmplitude *= ScreenShake.internalDecay;
  },
};

/* ===== CHIP ANIMATION ===== */

var ChipAnim = {
  internalChips: [],
  internalParent: null,

  init: function (chipLayer) {
    ChipAnim.internalParent = chipLayer;
    /* Pre-create a pool of chip graphics */
    for (var i = 0; i < 20; i++) {
      var chip = new PIXI.Graphics();
      chip.circle(0, 0, 4);
      chip.fill({ color: C.GOLD });
      chip.circle(0, 0, 2.5);
      chip.fill({ color: C.GOLD_DIM });
      chip.visible = false;
      chipLayer.addChild(chip);
      ChipAnim.internalChips.push(chip);
    }
  },

  internalGetChip: function () {
    for (var i = 0; i < ChipAnim.internalChips.length; i++) {
      if (!ChipAnim.internalChips[i].visible) return ChipAnim.internalChips[i];
    }
    return null;
  },

  /**
   * Animate chips from source position to pot center.
   * @param {number} fromX - Source x coordinate.
   * @param {number} fromY - Source y coordinate.
   * @param {number} count - Number of chip sprites to animate.
   */
  betToPot: function (fromX, fromY, count) {
    var toX = Layout.potX();
    var toY = Layout.potY();
    for (var i = 0; i < Math.min(count, 5); i++) {
      var chip = ChipAnim.internalGetChip();
      if (!chip) break;
      chip.x = fromX + (i % 3) * 4 - 4;
      chip.y = fromY;
      chip.alpha = 1;
      chip.visible = true;
      (function (c, delay) {
        setTimeout(function () {
          Tween.to(
            c,
            { x: toX + (delay % 3) * 3 - 3, y: toY },
            C.CHIP_MOVE_DUR,
            "easeOut",
            function () {
              c.visible = false;
            },
          );
        }, delay * 60);
      })(chip, i);
    }
  },

  /**
   * Animate chips from pot to winner position.
   * @param {number} toX - Winner x coordinate.
   * @param {number} toY - Winner y coordinate.
   * @param {number} count - Number of chip sprites to animate.
   */
  potToWinner: function (toX, toY, count) {
    var fromX = Layout.potX();
    var fromY = Layout.potY();
    for (var i = 0; i < Math.min(count, 8); i++) {
      var chip = ChipAnim.internalGetChip();
      if (!chip) break;
      chip.x = fromX + (i % 3) * 3 - 3;
      chip.y = fromY;
      chip.alpha = 1;
      chip.visible = true;
      (function (c, delay) {
        setTimeout(function () {
          /* Arc trajectory: chips fly up then down to winner */
          var midY = Math.min(fromY, toY) - 30;
          Tween.to(
            c,
            { x: (fromX + toX) / 2, y: midY },
            C.CHIP_MOVE_DUR / 2,
            "easeOut",
            function () {
              Tween.to(
                c,
                { x: toX + (delay % 3) * 4 - 4, y: toY },
                C.CHIP_MOVE_DUR / 2,
                "easeIn",
                function () {
                  EffectPool.emitSparks(toX, toY, 3, C.GOLD);
                  c.visible = false;
                },
              );
            },
          );
        }, delay * 80);
      })(chip, i);
    }
  },
};

/* ===== ALL-IN EFFECT ===== */

var AllInEffect = {
  internalOverlay: null,
  internalText: null,

  create: function (fxLayer, w, h) {
    var overlay = new PIXI.Graphics();
    overlay.rect(0, 0, w, h);
    overlay.fill({ color: 0x000000 });
    overlay.alpha = 0;
    overlay.visible = false;
    fxLayer.addChild(overlay);
    AllInEffect.internalOverlay = overlay;

    var txt = new PIXI.Text({
      text: "ALL IN",
      style: {
        fontFamily: "monospace",
        fontSize: 32,
        fontWeight: "bold",
        fill: C.GOLD,
      },
    });
    txt.anchor.set(0.5, 0.5);
    txt.x = w / 2;
    txt.y = h / 2;
    txt.visible = false;
    fxLayer.addChild(txt);
    AllInEffect.internalText = txt;
  },

  play: function (w, h) {
    var ov = AllInEffect.internalOverlay;
    var txt = AllInEffect.internalText;
    ov.clear();
    ov.rect(0, 0, w, h);
    ov.fill({ color: 0x000000 });
    ov.alpha = 0;
    ov.visible = true;
    Tween.to(ov, { alpha: C.ALLIN_DIM_A }, 300, "easeOut");

    txt.x = w / 2;
    txt.y = h / 2;
    txt.visible = true;
    txt.scale.set(2.5);
    txt.alpha = 1;
    Tween.to(txt.scale, { x: 1, y: 1 }, 400, "elasticOut");

    setTimeout(function () {
      Tween.to(ov, { alpha: 0 }, 400, "easeIn", function () {
        ov.visible = false;
      });
      Tween.to(txt, { alpha: 0 }, 400, "easeIn", function () {
        txt.visible = false;
      });
    }, C.ALLIN_TEXT_DUR);
  },

  reposition: function (w, h) {
    if (AllInEffect.internalOverlay) {
      AllInEffect.internalOverlay.clear();
      AllInEffect.internalOverlay.rect(0, 0, w, h);
      AllInEffect.internalOverlay.fill({ color: 0x000000 });
    }
    if (AllInEffect.internalText) {
      AllInEffect.internalText.x = w / 2;
      AllInEffect.internalText.y = h / 2;
    }
  },
};

/* ===== SHOWDOWN BANNER ===== */
/* Overlay banner showing winner name, hand, and pot amount */

var ShowdownBanner = {
  internalContainer: null,
  internalBg: null,
  internalBorder: null,
  internalTitleText: null,
  internalDetailText: null,
  internalHandCards: null,
  internalHandLabel: null,
  internalVisible: false,

  create: function (hudLayer) {
    var container = new PIXI.Container();
    container.visible = false;
    container.label = "showdownBanner";

    /* Semi-transparent dark background */
    var bg = new PIXI.Graphics();
    container.addChild(bg);
    ShowdownBanner.internalBg = bg;

    /* Gold border */
    var border = new PIXI.Graphics();
    container.addChild(border);
    ShowdownBanner.internalBorder = border;

    /* Title: "PlayerName Wins!" */
    var title = new PIXI.Text({
      text: "",
      style: {
        fontFamily: "monospace",
        fontSize: 16,
        fontWeight: "bold",
        fill: C.GOLD,
        dropShadow: { color: "#000000", blur: 2, distance: 1, alpha: 0.5 },
      },
    });
    title.anchor.set(0.5, 0);
    container.addChild(title);
    ShowdownBanner.internalTitleText = title;

    /* Detail: pot amount + hand name */
    var detail = new PIXI.Text({
      text: "",
      style: { fontFamily: "monospace", fontSize: 12, fill: C.TEXT },
    });
    detail.anchor.set(0.5, 0);
    container.addChild(detail);
    ShowdownBanner.internalDetailText = detail;

    /* Mini card row for winner's hand */
    var handCards = new PIXI.Container();
    container.addChild(handCards);
    ShowdownBanner.internalHandCards = handCards;

    /* Hand label below cards */
    var handLabel = new PIXI.Text({
      text: "",
      style: {
        fontFamily: "monospace",
        fontSize: 11,
        fontWeight: "bold",
        fill: C.GREEN,
      },
    });
    handLabel.anchor.set(0.5, 0);
    container.addChild(handLabel);
    ShowdownBanner.internalHandLabel = handLabel;

    hudLayer.addChild(container);
    ShowdownBanner.internalContainer = container;
  },

  show: function (view, context, w, h) {
    if (!view.result || ShowdownBanner.internalVisible) return;
    ShowdownBanner.internalVisible = true;
    var result = view.result;
    var container = ShowdownBanner.internalContainer;

    /* Determine winner name */
    var winnerIds = result.winners || [];
    var winnerNames = winnerIds.map(function (wid) {
      return internalGetPlayerName(wid, context);
    });
    var isSplit = result.mainWinners
      ? result.mainWinners.length > 1
      : winnerIds.length > 1;
    var hasSidePots = result.pots && result.pots.length > 1;
    var displayWinnerId = winnerIds[0];
    if (result.payouts) {
      var bestPayout = -1;
      for (var wi = 0; wi < winnerIds.length; wi++) {
        var payout = result.payouts[winnerIds[wi]] || 0;
        if (payout > bestPayout) {
          bestPayout = payout;
          displayWinnerId = winnerIds[wi];
        }
      }
    }

    /* Title */
    if (result.byFold) {
      ShowdownBanner.internalTitleText.text = winnerNames[0] + " Wins!";
      ShowdownBanner.internalDetailText.text =
        "Everyone folded \u2022 " + internalChips(result.pot) + " chips";
    } else {
      ShowdownBanner.internalTitleText.text = hasSidePots && winnerIds.length > 1
        ? "Side Pots!"
        : isSplit
          ? "Split Pot!"
          : winnerNames[0] + " Wins!";
      ShowdownBanner.internalDetailText.text = hasSidePots
        ? internalChips(result.pot) + " chips awarded"
        : internalChips(result.pot) + " chips";
    }

    /* Mini cards for winner's revealed hand */
    while (ShowdownBanner.internalHandCards.children.length > 0) {
      var oldCard = ShowdownBanner.internalHandCards.removeChildAt(0);
      oldCard.destroy({ children: true });
    }
    ShowdownBanner.internalHandLabel.text = "";

    if (!result.byFold && view.revealedHands) {
      var winnerId = displayWinnerId;
      var rh = view.revealedHands[winnerId];
      var shownCards = rh && rh.bestCards ? rh.bestCards : rh ? rh.cards : null;
      if (shownCards) {
        var cardW = Layout.cardW("mini");
        var gap = 3;
        var totalCardsW = shownCards.length * cardW + (shownCards.length - 1) * gap;
        for (var ci = 0; ci < shownCards.length; ci++) {
          var mc = CardSprite.create("mini");
          mc.x = -totalCardsW / 2 + ci * (cardW + gap) + cardW / 2;
          mc.setCard(shownCards[ci]);
          mc.showFace();
          ShowdownBanner.internalHandCards.addChild(mc);
        }
        ShowdownBanner.internalHandLabel.text = rh.handName || "";
      }
    }

    /* Layout the banner */
    var bannerW = Math.min(w * 0.85, 320);
    var padX = 16,
      padY = 10;

    ShowdownBanner.internalTitleText.x = bannerW / 2;
    ShowdownBanner.internalTitleText.y = padY;
    ShowdownBanner.internalDetailText.x = bannerW / 2;
    ShowdownBanner.internalDetailText.y = padY + 22;

    var cardsY = padY + 42;
    ShowdownBanner.internalHandCards.x = bannerW / 2;
    ShowdownBanner.internalHandCards.y = cardsY;
    ShowdownBanner.internalHandLabel.x = bannerW / 2;
    ShowdownBanner.internalHandLabel.y = cardsY + Layout.cardH("mini") / 2 + 4;

    var hasCards = ShowdownBanner.internalHandCards.children.length > 0;
    var bannerH = hasCards ? cardsY + Layout.cardH("mini") / 2 + 22 : padY + 44;

    /* Draw background */
    var bg = ShowdownBanner.internalBg;
    bg.clear();
    bg.roundRect(0, 0, bannerW, bannerH, 14);
    bg.fill({ color: 0x000000, alpha: 0.88 });

    var border = ShowdownBanner.internalBorder;
    border.clear();
    border.roundRect(0, 0, bannerW, bannerH, 14);
    border.stroke({ color: C.GOLD, width: 1.5 });

    /* Position banner: near top-center */
    container.x = (w - bannerW) / 2;
    container.y = Layout.vmin(6);

    /* Animate in */
    container.visible = true;
    container.alpha = 0;
    container.y += 12;
    Tween.to(container, { alpha: 1, y: container.y - 12 }, 350, "easeOut");
  },

  hide: function () {
    if (!ShowdownBanner.internalVisible) return;
    ShowdownBanner.internalVisible = false;
    var container = ShowdownBanner.internalContainer;
    Tween.to(container, { alpha: 0 }, 300, "easeIn", function () {
      container.visible = false;
    });
  },

  reposition: function (w, h) {
    /* Re-center if visible */
    if (ShowdownBanner.internalContainer && ShowdownBanner.internalVisible) {
      var bannerW = ShowdownBanner.internalBg.width || 280;
      ShowdownBanner.internalContainer.x = (w - bannerW) / 2;
      ShowdownBanner.internalContainer.y = Layout.vmin(6);
    }
  },
};
