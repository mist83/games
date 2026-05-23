/* ===== UNIT SPRITE (per-unit GraphicsContext, no text, glow ring) ===== */

var UnitSprite = {
  internalCreateChildren: function (container) {
    /* Star glow ring — behind everything, only visible for starred units */
    var glowRing = new PIXI.Graphics();
    glowRing.circle(0, 4, 22).stroke({ color: 0xffd700, width: 3, alpha: 0.6 });
    glowRing.alpha = 0;
    glowRing.visible = false;
    glowRing.label = "glowRing";
    container.internalGlowRing = glowRing;
    container.addChild(glowRing);

    /* Trait-colored aura — subtle background glow */
    var aura = new PIXI.Graphics();
    aura.circle(0, 4, 20).fill({ color: 0xd97706 });
    aura.alpha = 0.1;
    aura.label = "aura";
    container.internalAura = aura;
    container.addChild(aura);

    /* Unit body — draws from per-unit GraphicsContext */
    var body = new PIXI.Graphics(TRAIT_CONTEXTS.warrior);
    body.label = "body";
    body.y = -4;
    container.internalBody = body;
    container.addChild(body);

    /* HP bar background — wider than before */
    var hpBg = new PIXI.Graphics();
    hpBg.roundRect(-16, 18, 32, 5, 2).fill({ color: 0x1a1a2e });
    hpBg.label = "hpBg";
    container.internalHpBg = hpBg;
    container.addChild(hpBg);

    /* HP bar fill */
    var hpFill = new PIXI.Graphics();
    hpFill.roundRect(-15, 18, 30, 5, 2).fill({ color: 0xffffff });
    hpFill.label = "hpFill";
    container.internalHpFill = hpFill;
    container.addChild(hpFill);

    /* Star badge text — small gold star above unit, only visible for starred */
    var starBadge = new PIXI.Text({
      text: "\u2605",
      style: { fontSize: 12, fill: 0xffd700, fontFamily: "monospace" },
    });
    starBadge.anchor.set(0.5, 0.5);
    starBadge.x = 0;
    starBadge.y = -20;
    starBadge.visible = false;
    container.internalStarBadge = starBadge;
    container.addChild(starBadge);

    container.internalLastHp = -1;
    container.internalLastMaxHp = -1;
    container.internalUnitId = null;
    container.internalTrait = null;
    container.internalLastAtk = 0;
  },

  setup: function (container, unit) {
    if (!container.internalBody) UnitSprite.internalCreateChildren(container);
    Tween.killTweensOf(container);

    var trait = unit.trait || "warrior";
    var unitId = unit.unitId || unit.id;
    var ctx = internalGetUnitContext(unitId, trait);
    container.internalBody.context = ctx;
    container.internalTrait = trait;

    var tier = unit.tier || 1;
    var sc = TIER_SCALES[tier] || 1;
    container.internalBody.scale.set(sc);
    container.internalBody.internalTier = tier;
    container.scaleX = 1;
    container.scaleY = 1;
    container.alpha = 1;

    var palette = TRAIT_PALETTES[trait];
    if (palette && container.internalAura) {
      container.internalAura.clear();
      container.internalAura
        .circle(0, 4, 20 * sc)
        .fill({ color: palette.primary });
      container.internalAura.alpha = 0.1;
    }

    /* Star glow ring */
    var isStar = !!unit.star;
    container.internalGlowRing.visible = isStar;
    container.internalGlowRing.alpha = isStar ? 0.6 : 0;
    if (isStar && palette) {
      container.internalGlowRing.clear();
      container.internalGlowRing
        .circle(0, 4, 22 * sc)
        .stroke({ color: 0xffd700, width: 3, alpha: 0.6 });
    }

    container.internalStarBadge.visible = isStar;
    container.internalWasStar = isStar;
    container.internalUnitId = unitId;
    container.internalLastHp = -1;
    container.internalLastAtk = unit.atk || 0;
    UnitSprite.updateHP(container, unit.hp, unit.maxHp);
  },

  updateHP: function (container, hp, maxHp) {
    if (!container.internalHpFill) return;
    if (
      container.internalLastHp === hp &&
      container.internalLastMaxHp === maxHp
    )
      return;
    container.internalLastHp = hp;
    container.internalLastMaxHp = maxHp;

    var ratio = maxHp > 0 ? hp / maxHp : 0;
    if (ratio < 0) ratio = 0;
    if (ratio > 1) ratio = 1;
    var color = ratio > 0.6 ? 0x22c55e : ratio > 0.3 ? 0xeab308 : 0xef4444;

    container.internalHpFill.scale.x = ratio;
    container.internalHpFill.tint = color;
    container.internalHpFill.visible = ratio > 0;
  },

  updateAllIdle: function (unitSprites, time) {
    var sec = time * 0.001;
    for (var id in unitSprites) {
      var sp = unitSprites[id];
      if (!sp || sp.destroyed || !sp.visible || !sp.internalBody) continue;
      var phase =
        sec + (sp.internalUnitId ? sp.internalUnitId.length * 0.3 : 0);
      var breathe = 1.0 + 0.02 * Math.sin(phase * Math.PI);
      sp.internalBody.scale.set(
        (TIER_SCALES[sp.internalBody.internalTier] || 1) * breathe,
      );

      /* Pulse star glow ring for starred units */
      if (sp.internalGlowRing?.visible) {
        sp.internalGlowRing.alpha = 0.4 + 0.2 * Math.sin(sec * 2 + phase);
      }
    }
  },
};
