/* ===== AMBIENT FX ===== */

/* Helper: determine if an attacker is front row (cells 0-3) via sprite position */
var internalIsFrontRow = function (unitId, sprites) {
  var sprite = sprites[unitId];
  if (!sprite) return true;
  /* Front row units are closer to the battle line (h*0.42).
     Own front=cells 0-3 (row 0, lower y for opp, higher y for own).
     Use cell index stored on sprite if available, else guess from y. */
  if (sprite.internalCellIdx !== undefined) return sprite.internalCellIdx < 4;
  return true; /* default front */
};

var AmbientFX = {
  internalDust: [],
  internalParent: null,

  create: function (parent, w, h) {
    AmbientFX.internalParent = parent;
    var traitColors = [
      0xd97706, 0x2563eb, 0x7c3aed, 0xbe185d, 0x059669, 0xea580c,
    ];
    /* 12 dust particles */
    for (var i = 0; i < 12; i++) {
      var dust = new PIXI.Graphics();
      dust.circle(0, 0, 1.5).fill({ color: traitColors[i % 6] });
      dust.alpha = 0.15 + (i % 4) * 0.05;
      dust.x = (i * 137.5) % w;
      dust.y = (i * 113.7) % h;
      dust.internalBaseX = dust.x;
      dust.internalSpeed = 0.3 + (i % 3) * 0.15;
      dust.internalSwayAmp = 15 + (i % 4) * 5;
      dust.internalSwayOff = i * 1.7;
      parent.addChild(dust);
      AmbientFX.internalDust.push(dust);
    }
  },

  reposition: function (w, h) {
    for (var i = 0; i < AmbientFX.internalDust.length; i++) {
      AmbientFX.internalDust[i].x = (i * 137.5) % w;
      AmbientFX.internalDust[i].y = (i * 113.7) % h;
      AmbientFX.internalDust[i].internalBaseX = AmbientFX.internalDust[i].x;
    }
  },

  update: function (time) {
    var sec = time * 0.001;
    for (var i = 0; i < AmbientFX.internalDust.length; i++) {
      var d = AmbientFX.internalDust[i];
      d.y -= d.internalSpeed;
      d.x =
        d.internalBaseX +
        Math.sin(sec * 0.8 + d.internalSwayOff) * d.internalSwayAmp;
      if (d.y < -10) {
        var parent = AmbientFX.internalParent;
        var pw = parent?.parent ? parent.parent.width || 400 : 400;
        var ph = parent?.parent ? parent.parent.height || 600 : 600;
        d.y = ph + 10;
        d.internalBaseX = (i * 137.5 + sec * 50) % pw;
      }
    }
  },
};

/* ===== EFFECT POOL ===== */

var EffectPool = {
  internalSparks: [],
  internalDmgTexts: [],
  internalDebris: [],
  internalActiveSparks: [],
  internalActiveDmg: [],
  internalActiveDebris: [],

  create: function (parent) {
    for (var i = 0; i < 80; i++) {
      var spark = new PIXI.Graphics();
      spark.circle(0, 0, 2).fill({ color: 0xffffff });
      spark.visible = false;
      spark.internalVx = 0;
      spark.internalVy = 0;
      spark.internalLife = 0;
      spark.internalMaxLife = 0;
      parent.addChild(spark);
      EffectPool.internalSparks.push(spark);
    }
    /* Try BitmapFont for crispy damage numbers, fall back to Text */
    var internalUseBitmapDmg = false;
    try {
      PIXI.BitmapFont.from("DamageFont", {
        fontFamily: "monospace",
        fontSize: 18,
        fill: 0xffffff,
        fontWeight: "bold",
        strokeThickness: 3,
        stroke: 0x000000,
      });
      internalUseBitmapDmg = true;
    } catch (e) {
      // Game runs in sandboxed iframe without Sentry access — fall back to
      // regular PIXI.Text when BitmapFont isn't available.
      console.warn("[effects] BitmapFont unavailable, using Text fallback", e);
    }
    EffectPool.internalUseBitmapDmg = internalUseBitmapDmg;

    for (var j = 0; j < 10; j++) {
      var dmg;
      if (internalUseBitmapDmg) {
        dmg = new PIXI.BitmapText({
          text: "",
          style: { fontFamily: "DamageFont", fontSize: 18 },
        });
      } else {
        dmg = new PIXI.Text({
          text: "",
          style: {
            fontSize: 18,
            fill: 0xef4444,
            fontFamily: "monospace",
            fontWeight: "bold",
            dropShadow: { color: "#000000", blur: 4, distance: 2 },
          },
        });
      }
      dmg.anchor.set(0.5, 0.5);
      dmg.visible = false;
      dmg.internalVy = 0;
      dmg.internalLife = 0;
      dmg.internalMaxLife = 0;
      parent.addChild(dmg);
      EffectPool.internalDmgTexts.push(dmg);
    }
    for (var k = 0; k < 20; k++) {
      var db = new PIXI.Graphics();
      db.rect(-2, -2, 4, 4).fill({ color: 0x888888 });
      db.visible = false;
      db.internalVx = 0;
      db.internalVy = 0;
      db.internalLife = 0;
      db.internalMaxLife = 0;
      db.internalGravity = 0;
      parent.addChild(db);
      EffectPool.internalDebris.push(db);
    }
  },

  internalGetSpark: function () {
    for (var i = 0; i < EffectPool.internalSparks.length; i++) {
      if (!EffectPool.internalSparks[i].visible)
        return EffectPool.internalSparks[i];
    }
    return null;
  },

  internalGetDmg: function () {
    for (var i = 0; i < EffectPool.internalDmgTexts.length; i++) {
      if (!EffectPool.internalDmgTexts[i].visible)
        return EffectPool.internalDmgTexts[i];
    }
    return null;
  },

  internalGetDebris: function () {
    for (var i = 0; i < EffectPool.internalDebris.length; i++) {
      if (!EffectPool.internalDebris[i].visible)
        return EffectPool.internalDebris[i];
    }
    return null;
  },

  emitSparks: function (x, y, count, color) {
    for (var i = 0; i < count; i++) {
      var s = EffectPool.internalGetSpark();
      if (!s) break;
      s.tint = color || 0xffffff;
      s.x = x;
      s.y = y;
      s.alpha = 1;
      s.visible = true;
      var angle = (i / count) * Math.PI * 2 + i * 0.3;
      var speed = 2 + (i % 3);
      s.internalVx = Math.cos(angle) * speed;
      s.internalVy = Math.sin(angle) * speed;
      s.internalLife = 0;
      s.internalMaxLife = 20 + (i % 10);
      EffectPool.internalActiveSparks.push(s);
    }
  },

  showDamage: function (x, y, amount, type) {
    var d = EffectPool.internalGetDmg();
    if (!d) return;
    d.text = type === "heal" ? "+" + amount : "-" + amount;
    var color =
      type === "heal" ? 0x22c55e : type === "splash" ? 0xf97316 : 0xef4444;
    if (EffectPool.internalUseBitmapDmg) {
      d.tint = color;
    } else {
      d.style.fill = color;
    }
    d.x = x;
    d.y = y;
    d.alpha = 1;
    d.scale.set(1.5);
    d.visible = true;
    d.internalVy = -0.33;
    d.internalLife = 0;
    d.internalMaxLife = 120;
    EffectPool.internalActiveDmg.push(d);
  },

  emitDebris: function (x, y, count, color) {
    for (var i = 0; i < count; i++) {
      var db = EffectPool.internalGetDebris();
      if (!db) break;
      db.tint = color || 0x888888;
      db.x = x;
      db.y = y;
      db.alpha = 1;
      db.visible = true;
      var angle = (i / count) * Math.PI * 2 + i * 0.5;
      db.internalVx = Math.cos(angle) * (1.5 + (i % 3));
      db.internalVy = Math.sin(angle) * 2 - 2;
      db.internalGravity = 0.15;
      db.internalLife = 0;
      db.internalMaxLife = 30 + (i % 15);
      EffectPool.internalActiveDebris.push(db);
    }
  },

  clear: function () {
    var lists = [
      EffectPool.internalActiveSparks,
      EffectPool.internalActiveDmg,
      EffectPool.internalActiveDebris,
    ];
    for (var l = 0; l < lists.length; l++) {
      for (var i = 0; i < lists[l].length; i++) {
        lists[l][i].visible = false;
      }
      lists[l].length = 0;
    }
  },

  update: function (dt) {
    var i, p;
    for (i = EffectPool.internalActiveSparks.length - 1; i >= 0; i--) {
      p = EffectPool.internalActiveSparks[i];
      p.internalLife++;
      p.x += p.internalVx;
      p.y += p.internalVy;
      p.alpha = 1 - p.internalLife / p.internalMaxLife;
      if (p.internalLife >= p.internalMaxLife) {
        p.visible = false;
        EffectPool.internalActiveSparks.splice(i, 1);
      }
    }
    for (i = EffectPool.internalActiveDmg.length - 1; i >= 0; i--) {
      p = EffectPool.internalActiveDmg[i];
      p.internalLife++;
      p.y += p.internalVy;
      var lifeRatio = p.internalLife / p.internalMaxLife;
      if (lifeRatio < 0.75) {
        p.alpha = 1;
      } else {
        p.alpha = 1 - (lifeRatio - 0.75) / 0.25;
      }
      var sc = 1.5 - 0.3 * lifeRatio;
      p.scale.set(sc);
      if (p.internalLife >= p.internalMaxLife) {
        p.visible = false;
        EffectPool.internalActiveDmg.splice(i, 1);
      }
    }
    for (i = EffectPool.internalActiveDebris.length - 1; i >= 0; i--) {
      p = EffectPool.internalActiveDebris[i];
      p.internalLife++;
      p.x += p.internalVx;
      p.y += p.internalVy;
      p.internalVy += p.internalGravity;
      p.alpha = 1 - p.internalLife / p.internalMaxLife;
      if (p.internalLife >= p.internalMaxLife) {
        p.visible = false;
        EffectPool.internalActiveDebris.splice(i, 1);
      }
    }
  },
};

/* ===== BATTLE REPLAY ===== */

var BattleReplay = {
  internalPlaying: false,
  internalQueue: [],
  internalElapsed: 0,
  internalMaxExpectedTime: 0,
  internalShakeAmplitude: 0,
  internalShakeDecay: 0.9,

  play: function (battleLog, unitSprites, postBattleBoards) {
    if (!battleLog || battleLog.length === 0) return;
    BattleReplay.stop();
    BattleReplay.internalPlaying = true;
    BattleReplay.internalElapsed = 0;
    BattleReplay.internalQueue = [];

    /* Snapshot grid positions and HP — these are stable and never change during battle */
    var spriteKeys = Object.keys(unitSprites);
    for (var si = 0; si < spriteKeys.length; si++) {
      var sp = unitSprites[spriteKeys[si]];
      if (sp && !sp.destroyed) {
        sp.internalGridX = sp.x;
        sp.internalGridY = sp.y;
        sp.internalReplayHp = sp.internalLastHp || 0;
        sp.internalReplayMaxHp = sp.internalLastMaxHp || 1;
      }
    }

    /* Group events by round */
    var rounds = {};
    var maxRound = -1;
    for (var k = 0; k < battleLog.length; k++) {
      var r = battleLog[k].round || 0;
      if (!rounds[r]) rounds[r] = [];
      rounds[r].push(battleLog[k]);
      if (r > maxRound) maxRound = r;
    }

    var delay = 200;
    for (var rnd = 0; rnd <= maxRound; rnd++) {
      var events = rounds[rnd];
      if (!events) continue;

      /* Stagger offsets by type within this round (2x slower for watchability) */
      var healOff = 0;
      var leapOff = 600;
      var frontOff = 1200;
      var backOff = 2000;
      var deathOff = 2800;

      /* Track per-type sub-index for slight stagger within category */
      var healIdx = 0,
        leapIdx = 0,
        frontIdx = 0,
        backIdx = 0,
        deathEntries = [];

      for (var ei = 0; ei < events.length; ei++) {
        var e = events[ei];

        if (e.type === "heal") {
          (function (ev, t, sprites) {
            BattleReplay.internalQueue.push({
              time: t,
              fn: function () {
                var unit = sprites[ev.unitId];
                if (!unit || unit.destroyed) return;
                if (typeof playgent !== "undefined" && playgent.sound)
                  playgent.sound("magic.heal");
                EffectPool.showDamage(unit.x, unit.y - 15, ev.amount, "heal");
                EffectPool.emitSparks(unit.x, unit.y, 4, 0x22c55e);
                unit.internalReplayHp = Math.min(
                  unit.internalReplayMaxHp,
                  unit.internalReplayHp + ev.amount,
                );
                UnitSprite.updateHP(
                  unit,
                  unit.internalReplayHp,
                  unit.internalReplayMaxHp,
                );
              },
            });
          })(e, delay + healOff + healIdx * 100, unitSprites);
          healIdx++;
        } else if (e.type === "leap") {
          (function (ev, t, sprites) {
            BattleReplay.internalQueue.push({
              time: t,
              fn: function () {
                var unit = sprites[ev.unitId];
                if (!unit || unit.destroyed) return;
                if (typeof playgent !== "undefined" && playgent.sound)
                  playgent.sound("piece.move");
                /* Find a target cell position for the leap destination */
                var startX = unit.x,
                  startY = unit.y;
                /* Leap towards enemy back row — move vertically toward opposite side */
                var leapDy = ev.toRow > ev.fromRow ? 80 : -80;
                Tween.killTweensOf(unit);
                /* Purple spark trail at start */
                EffectPool.emitSparks(startX, startY, 4, 0x7c3aed);
                Tween.to(
                  unit,
                  { y: startY + leapDy },
                  200,
                  "easeOut",
                  function () {
                    if (unit && !unit.destroyed) {
                      /* Purple spark on landing */
                      EffectPool.emitSparks(unit.x, unit.y, 4, 0xa78bfa);
                      /* Update grid position — assassin now lives at the new row */
                      unit.internalGridX = unit.x;
                      unit.internalGridY = unit.y;
                    }
                  },
                );
              },
            });
          })(e, delay + leapOff + leapIdx * 100, unitSprites);
          leapIdx++;
        } else if (e.type === "attack" || e.type === "splash") {
          var attackerId = e.attackerId || e.attacker;
          var isFront = internalIsFrontRow(attackerId, unitSprites);
          var typeOff = isFront ? frontOff : backOff;
          var typeIdx = isFront ? frontIdx : backIdx;

          (function (ev, startDelay, pacing, sprites) {
            var atkId = ev.attackerId || ev.attacker;
            var tgtId = ev.targetId || ev.target;

            BattleReplay.internalQueue.push({
              time: startDelay,
              fn: function () {
                var atk = sprites[atkId];
                if (!atk || atk.destroyed) return;
                Tween.killTweensOf(atk);
                Tween.to(atk, { scaleX: 1.1, scaleY: 1.1 }, 100, "backOut");
              },
            });

            BattleReplay.internalQueue.push({
              time: startDelay + 120,
              fn: function () {
                var atk = sprites[atkId];
                var tgt = sprites[tgtId];
                if (!atk || atk.destroyed) return;
                if (!tgt || tgt.destroyed) return;
                var dx = (tgt.x - atk.internalGridX) * 0.3;
                var dy = (tgt.y - atk.internalGridY) * 0.3;
                Tween.to(
                  atk,
                  { x: atk.internalGridX + dx, y: atk.internalGridY + dy },
                  150,
                  "easeOut",
                );
                /* Trait-colored attack trail sparks */
                var traitName = atk.internalTrait || "warrior";
                var trailPalette =
                  TRAIT_PALETTES[traitName] || TRAIT_PALETTES.warrior;
                for (var ti = 1; ti <= 3; ti++) {
                  var lerpT = ti / 4;
                  var trailX =
                    atk.internalGridX + (tgt.x - atk.internalGridX) * lerpT;
                  var trailY =
                    atk.internalGridY + (tgt.y - atk.internalGridY) * lerpT;
                  EffectPool.emitSparks(trailX, trailY, 2, trailPalette.light);
                }
              },
            });

            BattleReplay.internalQueue.push({
              time: startDelay + 300,
              fn: function () {
                var tgt = sprites[tgtId];
                if (!tgt || tgt.destroyed) return;
                var dmg = ev.damage || 0;
                var trait = ev.attackerTrait || "warrior";
                var palette = TRAIT_PALETTES[trait] || TRAIT_PALETTES.warrior;
                EffectPool.emitSparks(tgt.x, tgt.y, 6, palette.light);
                if (dmg > 0) {
                  if (typeof playgent !== "undefined" && playgent.sound)
                    playgent.sound("combat.hit");
                  EffectPool.showDamage(
                    tgt.x,
                    tgt.y - 15,
                    dmg,
                    ev.type === "splash" ? "splash" : "attack",
                  );
                  tgt.internalReplayHp = Math.max(
                    0,
                    tgt.internalReplayHp - dmg,
                  );
                  UnitSprite.updateHP(
                    tgt,
                    tgt.internalReplayHp,
                    tgt.internalReplayMaxHp,
                  );
                }
                Tween.killTweensOf(tgt);
                var pushX =
                  (tgt.x - (sprites[atkId] ? sprites[atkId].x : tgt.x)) * 0.1;
                var pushY =
                  (tgt.y - (sprites[atkId] ? sprites[atkId].y : tgt.y)) * 0.1;
                Tween.to(
                  tgt,
                  { x: tgt.x + pushX, y: tgt.y + pushY },
                  80,
                  "easeOut",
                  function () {
                    if (
                      tgt &&
                      !tgt.destroyed &&
                      tgt.internalGridX !== undefined
                    ) {
                      Tween.to(
                        tgt,
                        { x: tgt.internalGridX, y: tgt.internalGridY },
                        120,
                        "elasticOut",
                      );
                    }
                  },
                );
                BattleReplay.internalShakeAmplitude = Math.min(
                  4 + dmg * 0.5,
                  10,
                );
              },
            });

            BattleReplay.internalQueue.push({
              time: startDelay + 420,
              fn: function () {
                var atk = sprites[atkId];
                if (!atk || atk.destroyed) return;
                Tween.to(
                  atk,
                  {
                    x: atk.internalGridX,
                    y: atk.internalGridY,
                    scaleX: 1,
                    scaleY: 1,
                  },
                  200,
                  "easeOut",
                );
              },
            });
          })(e, delay + typeOff + typeIdx * 100, 1.0, unitSprites);

          if (isFront) frontIdx++;
          else backIdx++;
        }
      }

      /* Detect deaths at end of round via _replayHp (battleLog doesn't have targetHp field) */
      var sprKeys = Object.keys(unitSprites);
      for (var ski = 0; ski < sprKeys.length; ski++) {
        var dSpr = unitSprites[sprKeys[ski]];
        if (
          dSpr &&
          !dSpr.destroyed &&
          dSpr.internalReplayHp !== undefined &&
          dSpr.internalReplayHp <= 0 &&
          !dSpr.internalIsDead
        ) {
          deathEntries.push({ unitId: sprKeys[ski], sprites: unitSprites });
        }
      }

      /* Schedule deaths at the end of the round */
      for (var di = 0; di < deathEntries.length; di++) {
        (function (de, t) {
          var tgtId = de.unitId;
          BattleReplay.internalQueue.push({
            time: t,
            fn: function () {
              var tgt = de.sprites[tgtId];
              if (!tgt || tgt.destroyed) return;
              var palette = TRAIT_PALETTES.warrior; /* default debris color */
              if (typeof playgent !== "undefined" && playgent.sound)
                playgent.sound("piece.capture");
              EffectPool.emitDebris(tgt.x, tgt.y, 8, palette.primary);
              BattleReplay.internalShakeAmplitude = 6;
              Tween.to(
                tgt,
                { alpha: 0.2, scaleX: 0.5, scaleY: 0.5 },
                400,
                "easeIn",
              );
              /* Show empty HP bar */
              UnitSprite.updateHP(tgt, 0, tgt.internalReplayMaxHp || 1);
              /* Tint body red to mark death (replaces old _nameText color change) */
              if (tgt.internalBody) tgt.internalBody.tint = 0xef4444;
              /* Mark as dead so stop() can clean up */
              tgt.internalIsDead = true;
            },
          });
        })(deathEntries[di], delay + deathOff + di * 100);
      }

      delay += 3400; /* full round duration before next round (2x slower) */
    }

    BattleReplay.internalQueue.push({
      time: delay + 200,
      fn: function () {
        /* Snap all units back to grid positions */
        var keys = Object.keys(unitSprites);
        for (var i = 0; i < keys.length; i++) {
          var s = unitSprites[keys[i]];
          if (s && !s.destroyed && s.internalGridX !== undefined) {
            Tween.killTweensOf(s);
            s.x = s.internalGridX;
            s.y = s.internalGridY;
            s.scale.set(1, 1);
          }
        }
        BattleReplay.internalPlaying = false;
      },
    });

    BattleReplay.internalQueue.sort(function (a, b) {
      return a.time - b.time;
    });
    BattleReplay.internalMaxExpectedTime =
      BattleReplay.internalQueue.length > 0
        ? BattleReplay.internalQueue[BattleReplay.internalQueue.length - 1]
            .time + 2000
        : 0;
  },

  update: function (dt) {
    if (
      !BattleReplay.internalPlaying &&
      BattleReplay.internalShakeAmplitude <= 0.1
    )
      return;
    var ms = dt * 16.67;
    BattleReplay.internalElapsed += ms;

    while (
      BattleReplay.internalQueue.length > 0 &&
      BattleReplay.internalQueue[0].time <= BattleReplay.internalElapsed
    ) {
      var action = BattleReplay.internalQueue.shift();
      action.fn();
    }

    if (BattleReplay.internalShakeAmplitude > 0.1 && GameRenderer.gameWorld) {
      var t = performance.now() * 0.05;
      GameRenderer.gameWorld.pivot.x =
        Math.sin(t * 7) * BattleReplay.internalShakeAmplitude;
      GameRenderer.gameWorld.pivot.y =
        Math.cos(t * 11) * BattleReplay.internalShakeAmplitude * 0.7;
      BattleReplay.internalShakeAmplitude *= BattleReplay.internalShakeDecay;
    } else if (GameRenderer.gameWorld) {
      GameRenderer.gameWorld.pivot.x = 0;
      GameRenderer.gameWorld.pivot.y = 0;
    }

    if (
      BattleReplay.internalQueue.length === 0 &&
      BattleReplay.internalPlaying
    ) {
      BattleReplay.internalPlaying = false;
    }
    /* Safety: force stop if elapsed far exceeds expected end time */
    if (
      BattleReplay.internalPlaying &&
      BattleReplay.internalMaxExpectedTime > 0 &&
      BattleReplay.internalElapsed > BattleReplay.internalMaxExpectedTime
    ) {
      BattleReplay.stop();
    }
  },

  stop: function (unitSprites) {
    BattleReplay.internalPlaying = false;
    BattleReplay.internalQueue = [];
    BattleReplay.internalElapsed = 0;
    BattleReplay.internalMaxExpectedTime = 0;
    BattleReplay.internalShakeAmplitude = 0;
    if (GameRenderer.gameWorld) {
      GameRenderer.gameWorld.pivot.x = 0;
      GameRenderer.gameWorld.pivot.y = 0;
    }
    /* Clean up dead unit ghosts */
    if (unitSprites) {
      var keys = Object.keys(unitSprites);
      for (var i = 0; i < keys.length; i++) {
        var s = unitSprites[keys[i]];
        if (s && !s.destroyed && s.internalIsDead) {
          s.visible = false;
          s.internalIsDead = false;
          if (s.internalBody) s.internalBody.tint = 0xffffff;
        }
      }
    }
    EffectPool.clear();
  },

  isPlaying: function () {
    return BattleReplay.internalPlaying;
  },
};
