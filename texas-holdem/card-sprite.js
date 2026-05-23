/* ===== CARD SPRITE (Premium) ===== */

var CardSprite = {
  /**
   * Create a premium card container with face and back sides.
   * @param {string} size - 'normal', 'large', or 'mini'
   * @returns {PIXI.Container} The configured card container.
   */
  create: function (size) {
    var container = new PIXI.Container();
    container.internalFaceUp = false;
    container.internalSize = size;

    CardSprite.internalBuildCard(container);
    return container;
  },

  internalBuildCard: function (container) {
    var size = container.internalSize;
    var h = container.internalCardHOverride || Layout.cardH(size);
    var w =
      container.internalCardWOverride ||
      (container.internalCardHOverride ? h * 0.68 : Layout.cardW(size));
    var r = Math.max(2, w * 0.1);
    container.internalCardW = w;
    container.internalCardH = h;

    while (container.children.length > 0) {
      var old = container.removeChildAt(0);
      old.destroy({ children: true });
    }

    /* ── Drop shadow (slightly larger, offset, blurred feel) ── */
    var shadow = new PIXI.Graphics();
    shadow.roundRect(-w / 2 + 1.5, -h / 2 + 2.5, w, h, r);
    shadow.fill({ color: 0x000000, alpha: 0.45 });
    container.addChild(shadow);

    /* ── Back side ── */
    var back = new PIXI.Container();

    /* Purple gradient body */
    var backBg = new PIXI.Graphics();
    var backGrad = new PIXI.FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
      colorStops: [
        { offset: 0, color: "#1e1240" },
        { offset: 0.5, color: "#2d1a5e" },
        { offset: 1, color: "#1e1240" },
      ],
    });
    backBg.roundRect(-w / 2, -h / 2, w, h, r);
    backBg.fill(backGrad);
    back.addChild(backBg);

    /* Diamond crosshatch pattern */
    if (size !== "mini") {
      var pattern = new PIXI.Graphics();
      var step = Math.max(6, w * 0.22);
      for (var dx = -w / 2 + step; dx < w / 2; dx += step) {
        for (var dy = -h / 2 + step; dy < h / 2; dy += step) {
          pattern.rect(dx - 1.5, dy - 1.5, 3, 3);
        }
      }
      pattern.fill({ color: C.CARD_BORDER, alpha: 0.12 });
      pattern.rotation = 0.785;
      var pmask = new PIXI.Graphics();
      pmask.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, Math.max(1, r - 2));
      pmask.fill({ color: 0xffffff });
      back.addChild(pmask);
      pattern.mask = pmask;
      back.addChild(pattern);
    }

    /* Inner gold border */
    var goldBorder = new PIXI.Graphics();
    goldBorder.roundRect(
      -w / 2 + 3,
      -h / 2 + 3,
      w - 6,
      h - 6,
      Math.max(1, r - 2),
    );
    goldBorder.stroke({ color: C.GOLD_DIM, width: 1, alpha: 0.4 });
    back.addChild(goldBorder);

    container.addChild(back);
    container.internalBack = back;

    /* ── Face side ── */
    var face = new PIXI.Container();
    face.visible = false;

    /* Card body — warm cream gradient */
    var faceBg = new PIXI.Graphics();
    var cardGrad = new PIXI.FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 0.5, y: 1 },
      colorStops: [
        { offset: 0, color: "#fdfaf3" },
        { offset: 1, color: "#ede4cc" },
      ],
    });
    faceBg.roundRect(-w / 2, -h / 2, w, h, r);
    faceBg.fill(cardGrad);
    face.addChild(faceBg);

    /* Subtle outer border */
    var faceOutline = new PIXI.Graphics();
    faceOutline.roundRect(-w / 2, -h / 2, w, h, r);
    faceOutline.stroke({ color: 0xb8b0a0, width: 0.8 });
    face.addChild(faceOutline);

    var isMini = size === "mini";

    if (!isMini) {
      /* ── Large center rank ── */
      var rankFontSize = h * 0.32;
      var rankText = new PIXI.Text({
        text: "",
        style: {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: rankFontSize,
          fontWeight: "bold",
          fill: C.CARD_BLACK,
        },
      });
      rankText.anchor.set(0.5, 0.5);
      rankText.y = -h * 0.06;
      face.addChild(rankText);
      container.internalRankText = rankText;

      /* ── Center suit (below rank) ── */
      var suitFontSize = h * 0.22;
      var suitText = new PIXI.Text({
        text: "",
        style: {
          fontFamily: "serif",
          fontSize: suitFontSize,
          fill: C.CARD_BLACK,
        },
      });
      suitText.anchor.set(0.5, 0.5);
      suitText.y = h * 0.22;
      face.addChild(suitText);
      container.internalSuitText = suitText;

      /* ── Top-left corner pip ── */
      var pipFontSize = w * 0.22;
      var pipR = new PIXI.Text({
        text: "",
        style: {
          fontFamily: "Georgia, serif",
          fontSize: pipFontSize,
          fontWeight: "bold",
          fill: C.CARD_BLACK,
        },
      });
      pipR.anchor.set(0.5, 0);
      pipR.x = -w / 2 + w * 0.2;
      pipR.y = -h / 2 + h * 0.05;
      face.addChild(pipR);
      container.internalPipR = pipR;

      var pipS = new PIXI.Text({
        text: "",
        style: { fontFamily: "serif", fontSize: w * 0.18, fill: C.CARD_BLACK },
      });
      pipS.anchor.set(0.5, 0);
      pipS.x = -w / 2 + w * 0.2;
      pipS.y = -h / 2 + h * 0.22;
      face.addChild(pipS);
      container.internalPipS = pipS;

      /* ── Bottom-right corner pip (rotated 180) ── */
      var pipR2 = new PIXI.Text({
        text: "",
        style: {
          fontFamily: "Georgia, serif",
          fontSize: pipFontSize,
          fontWeight: "bold",
          fill: C.CARD_BLACK,
        },
      });
      pipR2.anchor.set(0.5, 0);
      pipR2.x = w / 2 - w * 0.2;
      pipR2.y = h / 2 - h * 0.08;
      pipR2.rotation = Math.PI;
      face.addChild(pipR2);
      container.internalPipR2 = pipR2;

      var pipS2 = new PIXI.Text({
        text: "",
        style: { fontFamily: "serif", fontSize: w * 0.18, fill: C.CARD_BLACK },
      });
      pipS2.anchor.set(0.5, 0);
      pipS2.x = w / 2 - w * 0.2;
      pipS2.y = h / 2 - h * 0.25;
      pipS2.rotation = Math.PI;
      face.addChild(pipS2);
      container.internalPipS2 = pipS2;

      /* No watermark — it looked dirty/grey. Clean cards. */
      container.internalWatermark = null;
    } else {
      /* ── Mini card: compact rank + suit ── */
      var miniRank = new PIXI.Text({
        text: "",
        style: {
          fontFamily: "Georgia, serif",
          fontSize: w * 0.55,
          fontWeight: "bold",
          fill: C.CARD_BLACK,
        },
      });
      miniRank.anchor.set(0.5, 0.5);
      miniRank.y = -h * 0.1;
      face.addChild(miniRank);
      container.internalRankText = miniRank;

      var miniSuit = new PIXI.Text({
        text: "",
        style: { fontFamily: "serif", fontSize: w * 0.45, fill: C.CARD_BLACK },
      });
      miniSuit.anchor.set(0.5, 0.5);
      miniSuit.y = h * 0.2;
      face.addChild(miniSuit);
      container.internalSuitText = miniSuit;
    }

    container.addChild(face);
    container.internalFace = face;

    if (container.internalFaceUp) {
      back.visible = false;
      face.visible = true;
    } else {
      back.visible = true;
      face.visible = false;
    }
  },

  setCard: function (container, card) {
    if (!card) return;
    container.internalCurrentCard = card;
    var isRed = C.RED_SUITS[card.suit];
    var color = isRed ? C.CARD_RED : C.CARD_BLACK;
    var rankStr = card.rank === "T" ? "10" : card.rank;
    var suitStr = C.SUITS[card.suit] || "";

    container.internalRankText.text = rankStr;
    container.internalRankText.style.fill = color;
    container.internalSuitText.text = suitStr;
    container.internalSuitText.style.fill = color;

    if (container.internalPipR) {
      container.internalPipR.text = rankStr;
      container.internalPipR.style.fill = color;
      container.internalPipS.text = suitStr;
      container.internalPipS.style.fill = color;
      container.internalPipR2.text = rankStr;
      container.internalPipR2.style.fill = color;
      container.internalPipS2.text = suitStr;
      container.internalPipS2.style.fill = color;
    }
  },

  showFace: function (container) {
    container.internalFace.visible = true;
    container.internalBack.visible = false;
    container.internalFaceUp = true;
  },

  showBack: function (container) {
    container.internalFace.visible = false;
    container.internalBack.visible = true;
    container.internalFaceUp = false;
  },

  flip: function (container, toFace, onDone) {
    var dur = C.FLIP_HALF;
    Tween.killTweensOf(container.scale);
    Tween.to(container.scale, { x: 0 }, dur, "easeIn", function () {
      if (toFace) {
        container.internalFace.visible = true;
        container.internalBack.visible = false;
        container.internalFaceUp = true;
      } else {
        container.internalFace.visible = false;
        container.internalBack.visible = true;
        container.internalFaceUp = false;
      }
      Tween.to(container.scale, { x: 1 }, dur, "backOut", onDone || null);
    });
  },

  resize: function (container, cardH) {
    if (cardH && cardH > 0) {
      container.internalCardHOverride = cardH;
      container.internalCardWOverride = cardH * 0.68;
    } else {
      container.internalCardHOverride = null;
      container.internalCardWOverride = null;
    }
    CardSprite.internalBuildCard(container);
    /* Reapply card data — _buildCard creates fresh Text objects with empty text */
    if (container.internalCurrentCard) {
      CardSprite.setCard(container, container.internalCurrentCard);
    }
  },
};

/* Convenience methods on container instances */
(function () {
  CardSprite.create = function (size) {
    var c = new PIXI.Container();
    c.internalFaceUp = false;
    c.internalSize = size;
    CardSprite.internalBuildCard(c);
    c.setCard = function (card) {
      CardSprite.setCard(c, card);
    };
    c.showFace = function () {
      CardSprite.showFace(c);
    };
    c.showBack = function () {
      CardSprite.showBack(c);
    };
    c.flip = function (toFace, onDone) {
      CardSprite.flip(c, toFace, onDone);
    };
    c.resize = function (cardH) {
      CardSprite.resize(c, cardH);
    };
    return c;
  };
})();
