/* ===== TEXAS HOLD'EM — UI CONSTANTS ===== */

var C = {
  /* ── Felt & table ── */
  FELT: 0x0d4020,
  FELT_GLOW: 0x1a5c2c,
  FELT_EDGE: 0x092e16,
  FELT_DARK: 0x061a0e,
  TABLE_BORDER: 0x2a7a42,
  BG: 0x0a0e1a,

  /* ── Golden rail ── */
  RAIL_DARK: 0x6b4f1a,
  RAIL_GOLD: 0xc9a84c,
  RAIL_HIGHLIGHT: 0xf0d87a,

  /* ── Chip denomination colors ── */
  CHIP_WHITE: 0xe2e8f0,
  CHIP_RED: 0xef4444,
  CHIP_GREEN: 0x22c55e,
  CHIP_BLUE: 0x3b82f6,
  CHIP_BLACK: 0x1e293b,
  CHIP_STRIPE: 0xffffff,

  /* ── Cards ── */
  CARD_FACE: 0xfaf6ed,
  CARD_FACE2: 0xe8dfc9,
  CARD_BACK1: 0x1e1240,
  CARD_BACK2: 0x2d1a5e,
  CARD_BORDER: 0x5b3a9e,
  CARD_RED: 0xdc2626,
  CARD_BLACK: 0x1a1a2e,

  /* ── Chips & gold ── */
  GOLD: 0xfcd34d,
  GOLD_DIM: 0xb8941f,

  /* ── Player states ── */
  GREEN: 0x4ade80,
  BLUE: 0x60a5fa,
  RED: 0xdc2626,
  ORANGE: 0xf97316,
  DIM: 0x64748b,
  TEXT: 0xe2e8f0,
  PURPLE: 0xa78bfa,
  WIN_GLOW: 0xfbbf24,

  /* ── Action buttons ── */
  BTN_FOLD_BG: 0x374151,
  BTN_FOLD_FG: 0xf87171,
  BTN_CHECK_BG: 0x1e3a5f,
  BTN_CHECK_FG: 0x60a5fa,
  BTN_CALL_BG: 0x1e3a5f,
  BTN_CALL_FG: 0x60a5fa,
  BTN_RAISE_BG: 0x3b2e0a,
  BTN_RAISE_FG: 0xfcd34d,
  BTN_ALLIN_BG1: 0x7c2d12,
  BTN_ALLIN_BG2: 0x991b1b,
  BTN_ALLIN_FG: 0xfcd34d,
  BTN_CONT_BG: 0x14532d,
  BTN_CONT_FG: 0x4ade80,

  /* ── Badges ── */
  BADGE_D: 0xfcd34d,
  BADGE_S: 0x60a5fa,
  BADGE_B: 0xf87171,

  /* ── Panel ── */
  PANEL: 0x000000,
  PANEL_A: 0.6,

  /* ── Suits ── */
  SUITS: { s: "\u2660", h: "\u2665", d: "\u2666", c: "\u2663" },
  RED_SUITS: { h: 1, d: 1 },

  /* ── Animation timing (ms) ── */
  DEAL_STAGGER: 100,
  FLIP_HALF: 150,
  FOLD_DUR: 300,
  BTN_SCALE_DUR: 200,
  ACTION_TAG_DUR: 2000,
  CHIP_MOVE_DUR: 400,
  FLOP_SHAKE: 0.3,
  TURN_PAUSE: 200,
  RIVER_PAUSE: 300,
  RIVER_FLIP: 300,
  ALLIN_DIM_A: 0.3,
  ALLIN_TEXT_DUR: 1500,
  SHOWDOWN_DIM_A: 0.15,
  WIN_RAIN_DUR: 2000,

  /* ── Particle pool sizes ── */
  POOL_SPARKS: 60,
  POOL_CELEBRATE: 40,
  POOL_AMBIENT: 15,

  /* ── Layout ── */
  FELT_RX_RATIO: 0.42 /* ellipse rx as fraction of canvas width */,
  FELT_RY_RATIO: 0.3 /* ellipse ry as fraction of canvas height */,
  FELT_CY_RATIO: 0.4 /* ellipse center Y as fraction of canvas height */,
  PLAYER_RX: 0.44 /* player orbit rx */,
  PLAYER_RY: 0.34 /* player orbit ry */,

  /* ── Card sizes (% of vmin) ── */
  CARD_W: 6.5 /* community card width */,
  CARD_H: 9.5 /* community card height */,
  MY_CARD_W: 9.0 /* player's own hole cards */,
  MY_CARD_H: 12.0,
  MINI_CARD_W: 4.0 /* mini cards on player nodes */,
  MINI_CARD_H: 5.5,

  /* ── Avatar size (% of vmin) ── */
  AVATAR_R: 3.2,

  /* ── Seat container (% of vmin) ── */
  SEAT_W: 12,
  SEAT_H: 5,
  SEAT_PAD: 0.8,
  SEAT_SCALE_MIN: 0.75,
  SEAT_BG_ALPHA: 0.55,
  SEAT_BG_RADIUS: 6,

  /* ── Button sizes ── */
  BTN_MIN_H: 48 /* px, touch target minimum */,
  BTN_PAD_X: 16,
  BTN_PAD_Y: 10,
  BTN_GAP: 8,
  BTN_RADIUS: 12,
};
