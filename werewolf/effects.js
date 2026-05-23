/* ===== EFFECTS ===== */
/* Screen flash, screen shake, burst particles.
   Burst particles use the same pool pattern as Atmosphere but
   with gravity and radial emission instead of ambient drift. */

var Effects = {
  internalFlashOverlay: null,
  internalPool: [],
  internalActive: [],
  internalGameWorld: null,
  internalShakeElapsed: 0,
  internalShakeDuration: 0,

  create: function (fxLayer, gameWorld) {
    Effects.internalGameWorld = gameWorld;

    /* Screen flash overlay */
    var flash = new PIXI.Graphics();
    flash.rect(0, 0, 1, 1);
    flash.fill({ color: 0xffffff });
    flash.visible = false;
    fxLayer.addChild(flash);
    Effects.internalFlashOverlay = flash;

    /* Burst particle pool */
    for (var i = 0; i < C.POOL_BURST; i++) {
      var p = new PIXI.Graphics();
      p.circle(0, 0, 3);
      p.fill({ color: 0xffffff });
      p.visible = false;
      p.blendMode = "add";
      p.internalVx = 0;
      p.internalVy = 0;
      p.internalLife = 0;
      p.internalMaxLife = 0;
      p.internalGravity = 0;
      fxLayer.addChild(p);
      Effects.internalPool.push(p);
    }
  },

  flash: function (color, w, h, duration) {
    var f = Effects.internalFlashOverlay;
    f.clear();
    f.rect(0, 0, w, h);
    f.fill({ color: color || C.FLASH_WHITE });
    f.alpha = 0.6;
    f.visible = true;
    Tween.killTweensOf(f);
    Tween.to(f, { alpha: 0 }, duration || 500, "easeOut", function () {
      f.visible = false;
    });
  },

  shake: function () {
    Effects.internalShakeElapsed = 0;
    Effects.internalShakeDuration = C.SHAKE_DURATION;
  },

  burst: function (x, y, count, color) {
    var n = count || 8;
    for (var i = 0; i < n; i++) {
      var p = Effects.internalAcquire();
      if (!p) break;
      p.tint = color || C.FLASH_WHITE;
      p.x = x;
      p.y = y;
      p.alpha = 1;
      p.visible = true;
      p.scale.set(1 + (i % 3) * 0.5);
      var angle = (i / n) * Math.PI * 2;
      var speed = 2 + (i % 3);
      p.internalVx = Math.cos(angle) * speed;
      p.internalVy = Math.sin(angle) * speed;
      p.internalGravity = 0.05;
      p.internalLife = 0;
      p.internalMaxLife = 30 + (i % 15);
      Effects.internalActive.push(p);
    }
  },

  internalAcquire: function () {
    for (var i = 0; i < Effects.internalPool.length; i++) {
      if (!Effects.internalPool[i].visible) return Effects.internalPool[i];
    }
    return null;
  },

  update: function (dt) {
    var ms = dt * 16.67;

    /* Screen shake: dampened sine wave */
    if (
      Effects.internalShakeElapsed < Effects.internalShakeDuration &&
      Effects.internalGameWorld
    ) {
      Effects.internalShakeElapsed += ms;
      var t = Effects.internalShakeElapsed / Effects.internalShakeDuration;
      var decay = 1 - t;
      Effects.internalGameWorld.x =
        Math.sin(t * Math.PI * 8) * C.SHAKE_AMPLITUDE * decay;
      Effects.internalGameWorld.y =
        Math.cos(t * Math.PI * 6) * C.SHAKE_AMPLITUDE * decay * 0.5;
      if (t >= 1) {
        Effects.internalGameWorld.x = 0;
        Effects.internalGameWorld.y = 0;
      }
    }

    /* Burst particles */
    var remaining = [];
    for (var i = 0; i < Effects.internalActive.length; i++) {
      var p = Effects.internalActive[i];
      p.internalLife += 1;
      if (p.internalLife >= p.internalMaxLife) {
        p.visible = false;
        continue;
      }
      p.x += p.internalVx * dt;
      p.y += p.internalVy * dt;
      p.internalVy += p.internalGravity;
      p.alpha = 1 - p.internalLife / p.internalMaxLife;
      remaining.push(p);
    }
    Effects.internalActive = remaining;
  },

  clearBursts: function () {
    for (var i = 0; i < Effects.internalActive.length; i++)
      Effects.internalActive[i].visible = false;
    Effects.internalActive = [];
  },
};
