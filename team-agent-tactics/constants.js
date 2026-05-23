/* ===== UI CONSTANTS ===== */

var TRAIT_PALETTES = {
  warrior: { primary: 0xd97706, light: 0xfbbf24, dark: 0x92400e },
  guardian: { primary: 0x2563eb, light: 0x60a5fa, dark: 0x1e40af },
  assassin: { primary: 0x7c3aed, light: 0xa78bfa, dark: 0x4c1d95 },
  mage: { primary: 0xbe185d, light: 0xec4899, dark: 0x831843 },
  healer: { primary: 0x059669, light: 0x10b981, dark: 0x064e3b },
  ranger: { primary: 0xea580c, light: 0xf97316, dark: 0x7c2d12 },
};

var UNIT_DATA = {
  squire: { trait: "warrior", tier: 1 },
  brawler: { trait: "warrior", tier: 1 },
  knight: { trait: "warrior", tier: 2 },
  berserker: { trait: "warrior", tier: 2 },
  warlord: { trait: "warrior", tier: 3 },
  sentinel: { trait: "guardian", tier: 1 },
  bulwark: { trait: "guardian", tier: 1 },
  ironclad: { trait: "guardian", tier: 2 },
  titan: { trait: "guardian", tier: 3 },
  scout: { trait: "assassin", tier: 1 },
  cutpurse: { trait: "assassin", tier: 1 },
  shadowblade: { trait: "assassin", tier: 2 },
  phantom: { trait: "assassin", tier: 3 },
  apprentice: { trait: "mage", tier: 1 },
  initiate: { trait: "mage", tier: 1 },
  sorcerer: { trait: "mage", tier: 2 },
  archmage: { trait: "mage", tier: 3 },
  herbalist: { trait: "healer", tier: 1 },
  acolyte: { trait: "healer", tier: 1 },
  cleric: { trait: "healer", tier: 2 },
  druid: { trait: "healer", tier: 2 },
  oracle: { trait: "healer", tier: 3 },
  archer: { trait: "ranger", tier: 1 },
  tracker: { trait: "ranger", tier: 1 },
  marksman: { trait: "ranger", tier: 2 },
  sniper: { trait: "ranger", tier: 3 },
};

/* Base stats for star upgrade display (atk, hp before star multiplier) */
var UNIT_BASE_STATS = {
  squire: { atk: 3, hp: 7 },
  brawler: { atk: 4, hp: 6 },
  knight: { atk: 6, hp: 10 },
  berserker: { atk: 8, hp: 8 },
  warlord: { atk: 10, hp: 14 },
  sentinel: { atk: 2, hp: 8 },
  bulwark: { atk: 1, hp: 9 },
  ironclad: { atk: 3, hp: 14 },
  titan: { atk: 5, hp: 22 },
  scout: { atk: 4, hp: 5 },
  cutpurse: { atk: 5, hp: 4 },
  shadowblade: { atk: 7, hp: 7 },
  phantom: { atk: 12, hp: 9 },
  apprentice: { atk: 3, hp: 6 },
  initiate: { atk: 4, hp: 5 },
  sorcerer: { atk: 6, hp: 8 },
  archmage: { atk: 10, hp: 11 },
  herbalist: { atk: 2, hp: 7 },
  acolyte: { atk: 3, hp: 6 },
  cleric: { atk: 4, hp: 11 },
  druid: { atk: 3, hp: 12 },
  oracle: { atk: 6, hp: 16 },
  archer: { atk: 3, hp: 5 },
  tracker: { atk: 2, hp: 7 },
  marksman: { atk: 5, hp: 8 },
  sniper: { atk: 8, hp: 12 },
};

var TRAIT_NAMES = [
  "warrior",
  "guardian",
  "assassin",
  "mage",
  "healer",
  "ranger",
];
var BOARD_CELLS = 8;
var FRONT_ROW_START = 0;
var BACK_ROW_START = 4;
var COLS = 4;
var TIER_SCALES = { 1: 1.0, 2: 1.15, 3: 1.3 };
var MAX_HP = 50;
var MAX_ROUNDS = 10;
var MAX_PLAYERS = 12;

/* ===== SPRITE POOL ===== */

var SpritePool = {
  internalPools: {},

  get: function (type) {
    if (!SpritePool.internalPools[type]) SpritePool.internalPools[type] = [];
    var pool = SpritePool.internalPools[type];
    if (pool.length > 0) {
      var sprite = pool.pop();
      sprite.visible = true;
      return sprite;
    }
    return new PIXI.Container();
  },

  release: function (type, sprite) {
    if (!sprite) return;
    sprite.visible = false;
    if (sprite.parent) sprite.parent.removeChild(sprite);
    if (!SpritePool.internalPools[type]) SpritePool.internalPools[type] = [];
    SpritePool.internalPools[type].push(sprite);
  },
};

/* ===== TRAIT BODY FACTORIES =====
   Each factory draws a base body silhouette in the trait's color palette.
   Returns nothing — draws directly on the passed GraphicsContext.
   Bounding box target: ~35px tall, ~24px wide (before TIER_SCALES). */

function internalBodyWarrior(ctx, p) {
  /* Stocky rectangular body + round head */
  ctx.roundRect(-10, 2, 20, 18, 3).fill({ color: p.primary });
  ctx.circle(0, -6, 8).fill({ color: p.light });
  /* Shoulder plates */
  ctx.roundRect(-13, 2, 6, 6, 2).fill({ color: p.dark });
  ctx.roundRect(7, 2, 6, 6, 2).fill({ color: p.dark });
}

function internalBodyGuardian(ctx, p) {
  /* Wide sturdy body + helmet visor head */
  ctx.roundRect(-12, 0, 24, 20, 4).fill({ color: p.primary });
  ctx.roundRect(-8, -10, 16, 12, 3).fill({ color: p.light });
  /* Visor slit */
  ctx.rect(-5, -5, 10, 3).fill({ color: p.dark });
}

function internalBodyAssassin(ctx, p) {
  /* Slim diamond body + pointed hood */
  ctx.poly([0, -2, 10, 10, 0, 22, -10, 10]).fill({ color: p.primary });
  ctx.poly([0, -14, 7, -4, -7, -4]).fill({ color: p.light });
  /* Cloak edges */
  ctx.poly([-10, 10, -14, 18, -6, 18]).fill({ color: p.dark });
  ctx.poly([10, 10, 14, 18, 6, 18]).fill({ color: p.dark });
}

function internalBodyMage(ctx, p) {
  /* Triangle robe + pointed hat */
  ctx.poly([-12, 20, 0, 0, 12, 20]).fill({ color: p.primary });
  ctx.poly([0, -16, 7, -2, -7, -2]).fill({ color: p.light });
  /* Hat brim */
  ctx.rect(-9, -3, 18, 3).fill({ color: p.dark });
}

function internalBodyHealer(ctx, p) {
  /* Gentle ellipse body + round head + aura glow */
  ctx.ellipse(0, 10, 11, 12).fill({ color: p.primary });
  ctx.circle(0, -5, 7).fill({ color: p.light });
  /* Soft glow circle behind */
  ctx.circle(0, 4, 16).fill({ color: p.primary });
}

function internalBodyRanger(ctx, p) {
  /* Lean athletic body + round head + feathered cap */
  ctx.roundRect(-8, 0, 16, 20, 3).fill({ color: p.primary });
  ctx.circle(0, -6, 7).fill({ color: p.light });
  /* Cap feather */
  ctx.poly([4, -12, 10, -18, 6, -10]).fill({ color: p.dark });
}

/* ===== WEAPON/ACCESSORY OVERLAYS =====
   Each overlay draws a distinctive weapon or accessory. */

function internalWeaponSword(ctx, p) {
  /* Vertical sword on right side */
  ctx.rect(12, -4, 3, 22).fill({ color: 0xcccccc });
  ctx.rect(9, -2, 9, 3).fill({ color: p.dark }); /* crossguard */
}

function internalWeaponGreatsword(ctx, p) {
  /* Wider two-handed sword */
  ctx.rect(11, -8, 4, 28).fill({ color: 0xdddddd });
  ctx.rect(8, -4, 10, 4).fill({ color: p.dark }); /* wide crossguard */
}

function internalWeaponFists(ctx, p) {
  /* Two fist circles */
  ctx.circle(-14, 12, 5).fill({ color: p.light });
  ctx.circle(14, 12, 5).fill({ color: p.light });
}

function internalWeaponAxe(ctx, p) {
  /* Axe head on right */
  ctx.rect(12, -2, 3, 20).fill({ color: 0x8b6914 }); /* handle */
  ctx.poly([15, 0, 22, -4, 22, 8]).fill({ color: 0xcccccc }); /* blade */
}

function internalWeaponMace(ctx, p) {
  /* Mace with spiked head */
  ctx.rect(12, 2, 3, 16).fill({ color: 0x8b6914 }); /* handle */
  ctx.circle(13, -2, 6).fill({ color: 0xaaaaaa }); /* head */
}

function internalWeaponTallShield(ctx, p) {
  /* Tall narrow shield in front */
  ctx.roundRect(-6, -2, 12, 20, 3).fill({ color: p.light });
  ctx.rect(-2, 2, 4, 12).fill({ color: p.dark }); /* emblem stripe */
}

function internalWeaponWideShield(ctx, p) {
  /* Wide squat shield */
  ctx.roundRect(-10, 2, 20, 14, 4).fill({ color: p.light });
  ctx.circle(0, 9, 4).fill({ color: p.dark }); /* boss */
}

function internalWeaponTowerShield(ctx, p) {
  /* Massive tower shield covering body */
  ctx.roundRect(-14, -4, 28, 24, 4).fill({ color: p.light });
  ctx.rect(-2, 0, 4, 16).fill({ color: p.dark }); /* cross */
  ctx.rect(-8, 6, 16, 4).fill({ color: p.dark });
}

function internalWeaponSingleDagger(ctx, p) {
  /* Crouched pose + single dagger */
  ctx.moveTo(-12, 8).lineTo(-18, 0).stroke({ color: 0xcccccc, width: 2 });
}

function internalWeaponDualDaggers(ctx, p) {
  /* Two daggers crossed */
  ctx.moveTo(-12, 4).lineTo(-18, -4).stroke({ color: 0xcccccc, width: 2 });
  ctx.moveTo(12, 4).lineTo(18, -4).stroke({ color: 0xcccccc, width: 2 });
}

function internalWeaponKatana(ctx, p) {
  /* Long curved blade */
  ctx.moveTo(12, -8).lineTo(16, 20).stroke({ color: 0xdddddd, width: 2.5 });
  ctx.circle(13, -8, 3).fill({ color: p.dark }); /* pommel */
}

function internalWeaponScythe(ctx, p) {
  /* Curved scythe blade */
  ctx.rect(10, -10, 3, 28).fill({ color: 0x555555 }); /* handle */
  ctx
    .arc(12, -8, 12, -1.8, -0.2, false)
    .stroke({ color: 0xcccccc, width: 2.5 });
}

function internalWeaponStaff(ctx, p) {
  /* Staff with glowing orb */
  ctx.moveTo(-14, -6).lineTo(-14, 20).stroke({ color: 0x8b6914, width: 2.5 });
  ctx.circle(-14, -8, 5).fill({ color: p.light }); /* orb */
}

function internalWeaponBook(ctx, p) {
  /* Open book + spark */
  ctx.roundRect(8, 6, 10, 12, 2).fill({ color: p.dark });
  ctx.rect(12, 8, 2, 8).fill({ color: 0xffffff }); /* pages */
  ctx.circle(13, 2, 3).fill({ color: p.light }); /* spark */
}

function internalWeaponGrandStaff(ctx, p) {
  /* Ornate staff with large orb */
  ctx.moveTo(-14, -10).lineTo(-14, 22).stroke({ color: 0xaa8833, width: 3 });
  ctx.circle(-14, -12, 7).fill({ color: p.light }); /* large orb */
  ctx.circle(-14, -12, 4).fill({ color: 0xffffff }); /* inner glow */
}

function internalWeaponRuneCircle(ctx, p) {
  /* Floating rune circle */
  ctx.circle(0, 24, 10).stroke({ color: p.light, width: 1.5 });
  ctx.circle(0, 24, 6).stroke({ color: p.light, width: 1 });
}

function internalWeaponLeaf(ctx, p) {
  /* Leaf/plant motif */
  ctx.poly([10, 4, 18, 0, 16, 10, 10, 8]).fill({ color: 0x22c55e });
  ctx.poly([12, 8, 20, 6, 18, 14, 12, 12]).fill({ color: 0x16a34a });
}

function internalWeaponCross(ctx, p) {
  /* Glowing plus/cross */
  ctx.rect(-2, -12, 4, 10).fill({ color: 0xffffff });
  ctx.rect(-5, -9, 10, 4).fill({ color: 0xffffff });
}

function internalWeaponCrossStaff(ctx, p) {
  /* Staff with cross on top */
  ctx.moveTo(14, -8).lineTo(14, 20).stroke({ color: 0xaa8833, width: 2.5 });
  ctx.rect(11, -12, 6, 4).fill({ color: 0xffffff }); /* cross top */
  ctx.rect(12, -14, 4, 8).fill({ color: 0xffffff });
}

function internalWeaponAntlers(ctx, p) {
  /* Antler headdress + nature aura */
  ctx.poly([-6, -12, -10, -22, -4, -16]).fill({ color: 0x8b6914 });
  ctx.poly([6, -12, 10, -22, 4, -16]).fill({ color: 0x8b6914 });
  ctx.circle(0, 10, 14).fill({ color: 0x059669 }); /* nature aura */
}

function internalWeaponSunDisc(ctx, p) {
  /* Floating sun disc aura */
  ctx.circle(0, -10, 10).fill({ color: p.light });
  ctx.circle(0, -10, 6).fill({ color: 0xffffff });
  /* Sun rays */
  for (var r = 0; r < 8; r++) {
    var angle = (r / 8) * Math.PI * 2;
    var rx = Math.cos(angle) * 13;
    var ry = Math.sin(angle) * 13 - 10;
    ctx.circle(rx, ry, 2).fill({ color: p.light });
  }
}

function internalWeaponBow(ctx, p) {
  /* Drawn bow on right */
  ctx.arc(16, 8, 12, -1.3, 1.3, false).stroke({ color: 0x8b6914, width: 2.5 });
  ctx
    .moveTo(16, -3)
    .lineTo(6, 8)
    .stroke({ color: 0xaaaaaa, width: 1 }); /* string top */
  ctx
    .moveTo(16, 19)
    .lineTo(6, 8)
    .stroke({ color: 0xaaaaaa, width: 1 }); /* string bot */
}

function internalWeaponCrossbow(ctx, p) {
  /* Crossbow + hat */
  ctx.rect(10, 4, 12, 3).fill({ color: 0x8b6914 }); /* stock */
  ctx
    .poly([18, 0, 24, -4, 24, 12, 18, 8])
    .fill({ color: 0x8b6914 }); /* bow arms */
  /* Ranger hat */
  ctx.roundRect(-8, -14, 16, 6, 2).fill({ color: p.dark });
}

function internalWeaponLongbow(ctx, p) {
  /* Large ornate longbow */
  ctx.arc(16, 6, 16, -1.4, 1.4, false).stroke({ color: 0xaa8833, width: 3 });
  ctx.moveTo(16, -9).lineTo(4, 6).stroke({ color: 0xcccccc, width: 1 });
  ctx.moveTo(16, 21).lineTo(4, 6).stroke({ color: 0xcccccc, width: 1 });
  /* Arrow */
  ctx.moveTo(4, 6).lineTo(-6, 6).stroke({ color: 0xaaaaaa, width: 1.5 });
  ctx.poly([-8, 4, -8, 8, -12, 6]).fill({ color: 0xcccccc }); /* arrowhead */
}

function internalWeaponSniperRifle(ctx, p) {
  /* Long rifle-like crossbow for sniper */
  ctx.rect(8, 4, 16, 3).fill({ color: 0x555555 });
  ctx.rect(6, 2, 4, 7).fill({ color: 0x8b6914 }); /* grip */
  ctx.circle(24, 5, 3).stroke({ color: p.light, width: 1 }); /* scope */
}

/* ===== 26 UNIT CONTEXTS =====
   Per-unit GraphicsContext: trait body + weapon overlay.
   Fallback: TRAIT_CONTEXTS[trait] for unknown unitIds. */

var UNIT_CONTEXTS = {};
var TRAIT_CONTEXTS = {};

function internalInitUnitContexts() {
  var bodyFns = {
    warrior: internalBodyWarrior,
    guardian: internalBodyGuardian,
    assassin: internalBodyAssassin,
    mage: internalBodyMage,
    healer: internalBodyHealer,
    ranger: internalBodyRanger,
  };

  /* Build per-trait fallback contexts (same as old 6-context system) */
  for (var t = 0; t < TRAIT_NAMES.length; t++) {
    var traitName = TRAIT_NAMES[t];
    var palette = TRAIT_PALETTES[traitName];
    var tCtx = new PIXI.GraphicsContext();
    bodyFns[traitName](tCtx, palette);
    TRAIT_CONTEXTS[traitName] = tCtx;
  }

  /* Unit definitions: [unitId, trait, weaponFn] */
  var units = [
    /* Warriors: stocky body + weapon variants */
    ["squire", "warrior", internalWeaponSword],
    ["brawler", "warrior", internalWeaponFists],
    ["knight", "warrior", internalWeaponGreatsword],
    ["berserker", "warrior", internalWeaponAxe],
    ["warlord", "warrior", internalWeaponMace],

    /* Guardians: wide body + shield variants */
    ["sentinel", "guardian", internalWeaponTallShield],
    ["bulwark", "guardian", internalWeaponWideShield],
    ["ironclad", "guardian", internalWeaponTowerShield],
    [
      "titan",
      "guardian",
      internalWeaponTowerShield,
    ] /* titan reuses tower shield, larger via TIER_SCALES */,

    /* Assassins: slim diamond body + blade variants */
    ["scout", "assassin", internalWeaponSingleDagger],
    ["cutpurse", "assassin", internalWeaponDualDaggers],
    ["shadowblade", "assassin", internalWeaponKatana],
    ["phantom", "assassin", internalWeaponScythe],

    /* Mages: triangle robe + magic variants */
    ["apprentice", "mage", internalWeaponStaff],
    ["initiate", "mage", internalWeaponBook],
    ["sorcerer", "mage", internalWeaponGrandStaff],
    ["archmage", "mage", internalWeaponRuneCircle],

    /* Healers: ellipse body + healing variants */
    ["herbalist", "healer", internalWeaponLeaf],
    ["acolyte", "healer", internalWeaponCross],
    ["cleric", "healer", internalWeaponCrossStaff],
    ["druid", "healer", internalWeaponAntlers],
    ["oracle", "healer", internalWeaponSunDisc],

    /* Rangers: lean body + ranged weapon variants */
    ["archer", "ranger", internalWeaponBow],
    ["tracker", "ranger", internalWeaponCrossbow],
    ["marksman", "ranger", internalWeaponLongbow],
    ["sniper", "ranger", internalWeaponSniperRifle],
  ];

  for (var i = 0; i < units.length; i++) {
    var unitId = units[i][0];
    var trait = units[i][1];
    var weaponFn = units[i][2];
    var uPalette = TRAIT_PALETTES[trait];
    var ctx = new PIXI.GraphicsContext();
    bodyFns[trait](ctx, uPalette);
    weaponFn(ctx, uPalette);
    UNIT_CONTEXTS[unitId] = ctx;
  }
}

/**
 * Look up a unit's GraphicsContext by unitId with trait fallback.
 * @param {string} unitId - Unit id to resolve.
 * @param {string} trait - Trait fallback when the unit id is unknown.
 * @returns {PIXI.GraphicsContext} The cached graphics context.
 */
function internalGetUnitContext(unitId, trait) {
  return UNIT_CONTEXTS[unitId] || TRAIT_CONTEXTS[trait || "warrior"];
}
