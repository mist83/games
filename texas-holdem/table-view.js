/* ===== TABLE VIEW ===== */
/* Stadium-shaped table: roundRect where cornerRadius = min(w,h)/2.
   Thin rail stroke, felt-dominated visual. No giant brown bars. */

var TableView = {
  internalFelt: null,
  internalRail: null,
  internalShadow: null,
  internalPotText: null,
  internalPotChips: null,
  internalCommunityCards: [],
  internalHudText: null,
  internalParent: null,
  internalCommunityParent: null,

  create: function (tableLayer, communityLayer, w, h) {
    TableView.internalParent = tableLayer;
    TableView.internalCommunityParent = communityLayer;

    var shadow = new PIXI.Graphics();
    tableLayer.addChild(shadow);
    TableView.internalShadow = shadow;

    var felt = new PIXI.Graphics();
    tableLayer.addChild(felt);
    TableView.internalFelt = felt;

    var rail = new PIXI.Graphics();
    tableLayer.addChild(rail);
    TableView.internalRail = rail;

    /* HUD */
    var hud = new PIXI.Text({
      text: "",
      style: { fontFamily: "monospace", fontSize: 11, fill: C.DIM },
    });
    communityLayer.addChild(hud);
    TableView.internalHudText = hud;

    /* Pot */
    var potChips = new PIXI.Graphics();
    potChips.visible = false;
    communityLayer.addChild(potChips);
    TableView.internalPotChips = potChips;

    var potText = new PIXI.Text({
      text: "",
      style: {
        fontFamily: '-apple-system, "Segoe UI", sans-serif',
        fontSize: 15,
        fontWeight: "bold",
        fill: C.GOLD,
        dropShadow: { color: "#000000", blur: 3, distance: 1, alpha: 0.6 },
      },
    });
    potText.anchor.set(0.5, 0);
    potText.visible = false;
    communityLayer.addChild(potText);
    TableView.internalPotText = potText;

    for (var i = 0; i < 5; i++) {
      var card = CardSprite.create("normal");
      card.visible = false;
      communityLayer.addChild(card);
      TableView.internalCommunityCards.push(card);
    }

    TableView.reposition(w, h);
  },

  internalTableRect: function () {
    var cx = Layout.feltCX(),
      cy = Layout.feltCY();
    var rx = Layout.feltRX(),
      ry = Layout.feltRY();
    var tw = rx * 2,
      th = ry * 2;
    var cornerR = Math.min(tw, th) / 2;
    return {
      x: cx - tw / 2,
      y: cy - th / 2,
      w: tw,
      h: th,
      r: cornerR,
      cx: cx,
      cy: cy,
    };
  },

  reposition: function (w, h) {
    /* Layout.update called by Renderer.internalOnResize before this */
    var t = TableView.internalTableRect();

    /* ── Soft shadow under the table ── */
    var shadow = TableView.internalShadow;
    shadow.clear();
    shadow.roundRect(t.x - 4, t.y + 3, t.w + 8, t.h + 8, t.r + 4);
    shadow.fill({ color: 0x000000, alpha: 0.4 });

    /* ── Felt: the star of the show ── */
    var felt = TableView.internalFelt;
    felt.clear();

    /* Base fill */
    felt.roundRect(t.x, t.y, t.w, t.h, t.r);
    felt.fill({ color: 0x0e4422 });

    /* Radial gradient for depth — lighter center, dark edges */
    var feltGrad = new PIXI.FillGradient({
      type: "radial",
      center: { x: 0.5, y: 0.45 },
      innerRadius: 0,
      outerCenter: { x: 0.5, y: 0.5 },
      outerRadius: 0.5,
      colorStops: [
        { offset: 0, color: "#1d7a3a" },
        { offset: 0.4, color: "#156830" },
        { offset: 0.75, color: "#0f5425" },
        { offset: 1, color: "#0b3d1a" },
      ],
    });
    felt.roundRect(t.x, t.y, t.w, t.h, t.r);
    felt.fill(feltGrad);

    /* Subtle inner vignette — single soft ellipse, not harsh bands */
    felt.ellipse(t.cx, t.cy, t.w * 0.48, t.h * 0.48);
    felt.stroke({ color: 0x000000, width: t.w * 0.08, alpha: 0.06 });

    /* ── Rail: thin elegant stroke, not a giant brown bar ── */
    var rail = TableView.internalRail;
    rail.clear();
    /* Outer dark stroke */
    rail.roundRect(t.x - 1, t.y - 1, t.w + 2, t.h + 2, t.r + 1);
    rail.stroke({ color: 0x5a4118, width: 4 });
    /* Gold inner highlight */
    rail.roundRect(t.x, t.y, t.w, t.h, t.r);
    rail.stroke({ color: 0xa8872a, width: 2 });
    /* Bright edge catch */
    rail.roundRect(t.x + 1, t.y + 1, t.w - 2, t.h - 2, t.r - 1);
    rail.stroke({ color: 0xd4b355, width: 0.8, alpha: 0.3 });

    /* HUD */
    TableView.internalHudText.x = Layout.hudX();
    TableView.internalHudText.y = Layout.hudY();

    /* Pot */
    TableView.internalPotText.x = Layout.potX();
    TableView.internalPotText.y = Layout.potY() + 12;
    TableView.internalPotChips.x = Layout.potX();
    TableView.internalPotChips.y = Layout.potY() - 6;

    /* Community cards */
    for (var i = 0; i < 5; i++) {
      var card = TableView.internalCommunityCards[i];
      card.x = Layout.communityX(i, 5);
      card.y = Layout.communityY();
      CardSprite.resize(card);
    }
  },

  /**
   * @param {object} view - game view state
   * @param {object} [animatingCards] - set of card indices currently being animated (skip these)
   */
  update: function (view, animatingCards) {
    TableView.internalHudText.text =
      "Hand #" +
      view.handNumber +
      "  \u2022  Blinds " +
      view.blinds.small +
      "/" +
      view.blinds.big;

    if (view.pot > 0) {
      TableView.internalPotText.visible = true;
      TableView.internalPotText.text = internalChips(view.pot);
      TableView.internalPotChips.visible = true;
      TableView.internalPotChips.clear();
      var chipR = Math.max(8, Layout.vmin(1.8));
      var stackCount = Math.min(5, Math.ceil(view.pot / 80));
      for (var s = 0; s < stackCount; s++) {
        var ox = (s - (stackCount - 1) / 2) * chipR * 1.1;
        TableView.internalPotChips.ellipse(
          ox,
          -s * 2 + 1.5,
          chipR,
          chipR * 0.45,
        );
        TableView.internalPotChips.fill({ color: 0x000000, alpha: 0.3 });
        TableView.internalPotChips.ellipse(ox, -s * 2, chipR, chipR * 0.45);
        TableView.internalPotChips.fill({
          color: Layout.chipColor(view.pot / stackCount),
        });
        TableView.internalPotChips.ellipse(
          ox,
          -s * 2,
          chipR * 0.55,
          chipR * 0.25,
        );
        TableView.internalPotChips.stroke({
          color: C.CHIP_STRIPE,
          width: 0.8,
          alpha: 0.35,
        });
      }
    } else {
      TableView.internalPotText.visible = false;
      TableView.internalPotChips.visible = false;
    }

    var cc = view.communityCards || [];
    for (var i = 0; i < 5; i++) {
      /* Skip cards that are currently being animated — animation owns their state */
      if (animatingCards?.[i]) continue;
      var card = TableView.internalCommunityCards[i];
      if (i < cc.length) {
        card.visible = true;
        /* Always re-apply card data — resize rebuilds text objects with empty content */
        card.setCard(cc[i]);
        card.showFace();
      } else {
        card.visible = false;
      }
    }
  },

  getCard: function (index) {
    return TableView.internalCommunityCards[index];
  },
};

function internalChips(n) {
  return n >= 10000
    ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k"
    : String(n);
}
