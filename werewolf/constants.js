/* ===== WEREWOLF — UI CONSTANTS ===== */
/*
   Single source of truth for colors, timing, layout, and phase configs.
   Every visual parameter lives here. No magic numbers in module code.
*/

var C = {
  /* ── Background ── */
  BG: 0x0f0f1a,

  /* ── Role colors (canonical — used everywhere) ── */
  ROLE_COLORS: {
    werewolf: 0xef4444,
    seer: 0xa855f7,
    doctor: 0x22c55e,
    villager: 0x60a5fa,
  },

  /* ── Role colors as CSS hex strings ── */
  ROLE_CSS: {
    werewolf: "#ef4444",
    seer: "#a855f7",
    doctor: "#22c55e",
    villager: "#60a5fa",
  },

  /* ── UI colors ── */
  TEXT: 0xe2e8f0,
  TEXT_DIM: 0x94a3b8,
  TEXT_DARK: 0x64748b,
  GOLD: 0xfcd34d,
  PANEL: 0x1a1a2e,
  BORDER: "#334155",

  /* ── Effect colors ── */
  FLASH_WHITE: 0xffffff,
  FLASH_RED: 0xef4444,
  FLASH_GREEN: 0x22c55e,
  FLASH_GOLD: 0xfbbf24,
  BLOOD_MIST: 0x991b1b,
  NIGHT_MIST: 0x6366f1,

  /* ── Phase atmosphere configs ──
     Each phase maps to its full visual config: gradient, particles, vignette.
     Eliminates if/else chains in atmosphere.js and scene-director.js. */
  PHASES: {
    roleReveal: {
      top: 0x1a0a2e,
      bot: 0x0f0f1a,
      particle: 0xa855f7,
      shape: "circle",
      driftX: 0,
      driftY: -0.15,
      count: 12,
      vignette: 0.2,
    },
    day_discussion: {
      top: 0x3568a0,
      bot: 0x2a8a30,
      particle: 0xf0e0b0,
      shape: "streak",
      driftX: 0.6,
      driftY: -0.05,
      count: 12,
      vignette: 0,
    },
    day_vote: {
      top: 0x1a1535,
      bot: 0x6a3010,
      particle: 0xf0e0b0,
      shape: "streak",
      driftX: 0.6,
      driftY: -0.05,
      count: 12,
      vignette: 0.35,
    },
    day_result: {
      top: 0x3568a0,
      bot: 0x2a8a30,
      particle: 0xf0e0b0,
      shape: "streak",
      driftX: 0.3,
      driftY: 0,
      count: 12,
      vignette: 0.15,
    },
    night: {
      top: 0x0a0a1f,
      bot: 0x050510,
      particle: 0x6366f1,
      shape: "circle",
      driftX: 0.02,
      driftY: -0.2,
      count: 20,
      vignette: 0.25,
    },
    night_result: {
      top: 0x0a0a1f,
      bot: 0x050510,
      particle: 0x6366f1,
      shape: "circle",
      driftX: 0.02,
      driftY: -0.2,
      count: 20,
      vignette: 0.25,
    },
    gameOver: {
      top: 0x0f0f1a,
      bot: 0x0f0f1a,
      particle: 0xfcd34d,
      shape: "circle",
      driftX: 0,
      driftY: -0.3,
      count: 12,
      vignette: 0,
    },
    // `finished` is the persistent post-game phase (see game.js). Without a
    // config the atmosphere falls back to a flat BG with zero particles.
    finished: {
      top: 0x0f0f1a,
      bot: 0x0f0f1a,
      particle: 0xfcd34d,
      shape: "circle",
      driftX: 0,
      driftY: -0.3,
      count: 12,
      vignette: 0,
    },
  },

  /* ── Particle pool sizes ── */
  POOL_AMBIENT: 25,
  POOL_BURST: 15,

  /* ── Timing (ms) ── */
  VOTE_BOLT_DURATION: 500,
  VOTE_LINE_STAGGER: 200,
  VOTE_LINE_TEARDOWN: 600,
  ELIMINATION_BUILDUP: 800,
  ELIMINATION_REVEAL: 500,
  NIGHT_KILL_BUILDUP: 1000,
  NIGHT_KILL_REVEAL: 400,
  DOCTOR_SAVE_BUILDUP: 500,
  DOCTOR_SAVE_REVEAL: 300,
  GAME_END_BUILDUP: 500,
  GAME_END_REVEAL: 2000,
  PHASE_TRANSITION_DUR: 1000,
  BG_CROSSFADE_DUR: 3000,

  /* ── Vote trail visual params ── */
  TRAIL_PUFF_COUNT: 14,
  TRAIL_MAX_SIZE: 10,
  TRAIL_MIN_SIZE: 1.5,
  TRAIL_TAPER: 0.85,
  TRAIL_ALPHA_MIN: 0.06,
  TRAIL_ALPHA_MAX: 0.18,
  TRAIL_WOBBLE_FREQ: 2.1,
  TRAIL_WOBBLE_AMP: 4,
  TRAIL_AGE_LIMIT: 25,
  TRAIL_HISTORY_MAX: 20,
  BOLT_HEAD_OUTER: 7,
  BOLT_HEAD_INNER: 3.5,
  BOLT_HEAD_CORE: 2.5,
  MARK_BASE_RADIUS: 20,
  MARK_VOTE_SCALE: 6,
  MARK_PULSE_SPEED: 0.04,

  /* ── Layout ── */
  CIRCLE_RADIUS_RATIO: 0.32,
  CIRCLE_CENTER_Y: 0.42,
  AVATAR_SIZE: 48,

  /* ── Scene director ── */
  QUEUE_MAX: 5,

  /* ── Screen shake ── */
  SHAKE_AMPLITUDE: 4,
  SHAKE_DURATION: 300,

  /* ── Phase timeout seconds (for UI timer display) ── */
  PHASE_TIMEOUTS: {
    roleReveal: 5,
    day_discussion: 90,
    day_vote: 60,
    day_result: 8,
    night: 45,
    night_result: 8,
    gameOver: 8,
  },

  /* ── Helpers ── */

  /**
   * Get role color as PixiJS hex number.
   * @param {string} role - Role id to resolve.
   * @returns {number} PixiJS hex color.
   */
  roleHex: function (role) {
    return C.ROLE_COLORS[role] || C.ROLE_COLORS.villager;
  },

  /**
   * Get role color as CSS string.
   * @param {string} role - Role id to resolve.
   * @returns {string} CSS color string.
   */
  roleCss: function (role) {
    return C.ROLE_CSS[role] || C.ROLE_CSS.villager;
  },

  /**
   * Is this a day phase?
   * @param {string} phase - Phase id to check.
   * @returns {boolean} Whether the phase is day-facing.
   */
  isDay: function (phase) {
    return (
      phase === "day_discussion" ||
      phase === "day_vote" ||
      phase === "day_result"
    );
  },

  /**
   * Get phase config (gradient, particles, vignette).
   * @param {string} phase - Phase id to resolve.
   * @returns {object} Phase visual configuration.
   */
  phaseConfig: function (phase) {
    return (
      C.PHASES[phase] || {
        top: C.BG,
        bot: C.BG,
        particle: C.TEXT_DIM,
        shape: "circle",
        driftX: 0,
        driftY: 0,
        count: 0,
        vignette: 0,
      }
    );
  },
};
