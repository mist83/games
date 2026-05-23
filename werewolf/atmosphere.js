/* ===== ATMOSPHERE ===== */
/* PixiJS background layer: ambient particles + CSS gradient crossfade.
   Phase configs live in C.PHASES — this module just applies them. */

var Atmosphere = {
  internalParticles: [],
  internalActiveParticles: [],
  internalParent: null,
  internalCurrentPhase: null,
  internalW: 0,
  internalH: 0,
  internalVignette: null,
  internalCrossfadeTimer: null,

  create: function (layer, w, h) {
    Atmosphere.internalParent = layer;
    Atmosphere.internalW = w;
    Atmosphere.internalH = h;

    /* Vignette overlay (darkened edges for vote/night) */
    var vig = new PIXI.Graphics();
    vig.alpha = 0;
    layer.addChild(vig);
    Atmosphere.internalVignette = vig;

    /* Particle pool */
    for (var i = 0; i < C.POOL_AMBIENT; i++) {
      var p = new PIXI.Graphics();
      p.visible = false;
      p.blendMode = "add";
      p.internalVx = 0;
      p.internalVy = 0;
      p.internalLife = 0;
      p.internalMaxLife = 0;
      p.internalShape = "";
      layer.addChild(p);
      Atmosphere.internalParticles.push(p);
    }

    Atmosphere.internalSetBg(C.BG, C.BG);
  },

  /* ── Background crossfade (CSS gradients, not PixiJS) ── */

  internalSetBg: function (topColor, botColor) {
    var base = document.getElementById("bg-base");
    var fade = document.getElementById("bg-crossfade");
    if (!base) return;

    var grad = Atmosphere.internalGradientCss(topColor, botColor);

    if (!fade) {
      base.style.background = grad;
      return;
    }

    fade.style.background = grad;
    void fade.offsetHeight; /* force reflow */
    fade.style.opacity = "1";

    if (Atmosphere.internalCrossfadeTimer)
      clearTimeout(Atmosphere.internalCrossfadeTimer);
    Atmosphere.internalCrossfadeTimer = setTimeout(function () {
      base.style.background = grad;
      fade.classList.add("no-transition");
      fade.style.opacity = "0";
      setTimeout(function () {
        fade.classList.remove("no-transition");
      }, 50);
    }, C.BG_CROSSFADE_DUR + 100);
  },

  internalGradientCss: function (top, bot) {
    return (
      "linear-gradient(to bottom,#" +
      top.toString(16).padStart(6, "0") +
      ",#" +
      bot.toString(16).padStart(6, "0") +
      ")"
    );
  },

  /* ── Vignette ── */

  internalDrawVignette: function () {
    var vig = Atmosphere.internalVignette;
    vig.clear();
    vig.rect(0, 0, Atmosphere.internalW, Atmosphere.internalH);
    vig.fill({ color: 0x000000 });
  },

  /* ── Particle shapes ── */

  internalSetShape: function (p, shape) {
    if (p.internalShape === shape) return;
    p.internalShape = shape;
    p.clear();
    if (shape === "streak") {
      p.rect(-6, -0.5, 12, 1);
    } else {
      p.circle(0, 0, 2);
    }
    p.fill({ color: 0xffffff });
  },

  internalGetParticle: function () {
    for (var i = 0; i < Atmosphere.internalParticles.length; i++) {
      if (!Atmosphere.internalParticles[i].visible)
        return Atmosphere.internalParticles[i];
    }
    return null;
  },

  internalSpawn: function (opts) {
    var w = Atmosphere.internalW;
    var h = Atmosphere.internalH;
    var shape = opts.shape || "circle";
    var isStreak = shape === "streak";

    for (var i = 0; i < opts.count; i++) {
      var p = Atmosphere.internalGetParticle();
      if (!p) break;
      Atmosphere.internalSetShape(p, shape);
      p.tint = opts.color;
      p.x = (performance.now() * 0.01 + i * 137.5) % w;
      p.y = (performance.now() * 0.007 + i * 89.3) % h;
      p.alpha = isStreak ? 0.08 + (i % 4) * 0.03 : 0.15 + (i % 5) * 0.05;
      p.scale.set(isStreak ? 1.5 + (i % 3) * 0.8 : 0.8 + (i % 4) * 0.3);
      p.visible = true;
      p.internalVx = opts.driftX + Math.sin(i * 1.3) * 0.1;
      p.internalVy = opts.driftY + Math.cos(i * 0.9) * 0.1;
      p.internalLife = 0;
      p.internalMaxLife = 200 + (i % 80);
      Atmosphere.internalActiveParticles.push(p);
    }
  },

  /* ── Public API ── */

  transition: function (phase) {
    if (phase === Atmosphere.internalCurrentPhase) return;
    Atmosphere.internalCurrentPhase = phase;

    Atmosphere.clearParticles();

    var cfg = C.phaseConfig(phase);

    Atmosphere.internalSetBg(cfg.top, cfg.bot);
    Atmosphere.internalDrawVignette();
    Tween.killTweensOf(Atmosphere.internalVignette);
    Tween.to(
      Atmosphere.internalVignette,
      { alpha: cfg.vignette },
      C.PHASE_TRANSITION_DUR,
      "easeOut",
    );
    Atmosphere.internalSpawn({
      count: cfg.count,
      color: cfg.particle,
      driftX: cfg.driftX,
      driftY: cfg.driftY,
      shape: cfg.shape,
    });
  },

  wolfWin: function () {
    Atmosphere.internalSetBg(C.BLOOD_MIST, C.FLASH_RED);
    Atmosphere.clearParticles();
    Atmosphere.internalSpawn({
      count: 20,
      color: C.FLASH_RED,
      driftX: 0,
      driftY: -0.4,
      shape: "circle",
    });
    Tween.to(Atmosphere.internalVignette, { alpha: 0 }, 500, "easeOut");
  },

  villageWin: function () {
    Atmosphere.internalSetBg(C.GOLD, 0x3568a0);
    Atmosphere.clearParticles();
    Atmosphere.internalSpawn({
      count: 20,
      color: C.FLASH_GOLD,
      driftX: 0.1,
      driftY: -0.15,
      shape: "circle",
    });
    Tween.to(Atmosphere.internalVignette, { alpha: 0 }, 500, "easeOut");
  },

  clearParticles: function () {
    for (var i = 0; i < Atmosphere.internalActiveParticles.length; i++) {
      Atmosphere.internalActiveParticles[i].visible = false;
    }
    Atmosphere.internalActiveParticles = [];
  },

  update: function (dt) {
    var remaining = [];
    for (var i = 0; i < Atmosphere.internalActiveParticles.length; i++) {
      var p = Atmosphere.internalActiveParticles[i];
      p.internalLife += 1;
      if (p.internalLife >= p.internalMaxLife) {
        p.visible = false;
        continue;
      }
      p.x += p.internalVx * dt;
      p.y += p.internalVy * dt;
      if (p.y < -10) p.y = Atmosphere.internalH + 10;
      if (p.y > Atmosphere.internalH + 10) p.y = -10;
      if (p.x < -10) p.x = Atmosphere.internalW + 10;
      if (p.x > Atmosphere.internalW + 10) p.x = -10;
      var lifeRatio = p.internalLife / p.internalMaxLife;
      if (lifeRatio > 0.8) p.alpha = (1 - lifeRatio) * 5 * 0.3;
      remaining.push(p);
    }
    Atmosphere.internalActiveParticles = remaining;

    /* Respawn when particles get sparse */
    if (
      Atmosphere.internalCurrentPhase &&
      Atmosphere.internalActiveParticles.length < 8
    ) {
      var cfg = C.phaseConfig(Atmosphere.internalCurrentPhase);
      Atmosphere.internalSpawn({
        count: 3,
        color: cfg.particle,
        driftX: cfg.driftX,
        driftY: cfg.driftY,
        shape: cfg.shape,
      });
    }
  },

  resize: function (w, h) {
    Atmosphere.internalW = w;
    Atmosphere.internalH = h;
    if (Atmosphere.internalCurrentPhase)
      Atmosphere.transition(Atmosphere.internalCurrentPhase);
  },
};
