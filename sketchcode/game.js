var PROMPTS = [
  "apple",
  "mountain",
  "penguin",
  "robot",
  "cactus",
  "lighthouse",
  "umbrella",
  "bicycle",
  "octopus",
  "telescope",
  "volcano",
  "castle",
  "banana",
  "clock",
  "guitar",
  "crown",
  "ladder",
  "airplane",
  "anchor",
  "balloon",
  "basket",
  "beetle",
  "bridge",
  "camera",
  "candle",
  "carrot",
  "chair",
  "cheese",
  "cloud",
  "diamond",
  "dinosaur",
  "door",
  "drum",
  "feather",
  "flower",
  "glove",
  "hammer",
  "helmet",
  "island",
  "jacket",
  "key",
  "kite",
  "lantern",
  "magnet",
  "mushroom",
  "pencil",
  "piano",
  "pirate",
  "pumpkin",
  "rocket",
  "sailboat",
  "scissors",
  "snake",
  "snowman",
  "spider",
  "suitcase",
  "sunflower",
  "teapot",
  "toaster",
  "train",
  "tree",
  "turtle",
  "violin",
  "wizard",
  "whale",
  "window",
  "zebra",
  "moon",
  "planet",
  "book",
  "ant",
  "axe",
  "bag",
  "bat",
  "bed",
  "bell",
  "belt",
  "bird",
  "boat",
  "bone",
  "boot",
  "bottle",
  "bowl",
  "bread",
  "brick",
  "brush",
  "bucket",
  "bus",
  "button",
  "cake",
  "cap",
  "cart",
  "cat",
  "cave",
  "chain",
  "cherry",
  "comb",
  "cone",
  "cookie",
  "cow",
  "cup",
  "desk",
  "dice",
  "dog",
  "doll",
  "donut",
  "duck",
  "egg",
  "fan",
  "fish",
  "flag",
  "fork",
  "frog",
  "gate",
  "ghost",
  "grape",
  "hat",
  "heart",
  "hook",
  "horn",
  "house",
  "lamp",
  "leaf",
  "lemon",
  "lock",
  "mask",
  "mouse",
  "mug",
  "nest",
  "nose",
  "onion",
  "owl",
  "paint",
  "pants",
  "pear",
  "pizza",
  "plant",
  "plate",
  "pot",
  "ring",
  "saw",
  "shell",
  "shirt",
  "shoe",
  "sock",
  "spoon",
  "star",
  "stool",
  "sword",
  "table",
  "tent",
  "tooth",
  "tower",
  "truck",
  "vase",
  "watch",
  "wheel",
  "worm",
];

var ALIASES = {
  airplane: ["plane", "jet"],
  bicycle: ["bike", "cycle"],
  cactus: ["cacti"],
  lighthouse: ["beacon"],
  octopus: ["squid"],
  sailboat: ["boat", "ship"],
  suitcase: ["luggage"],
  teapot: ["kettle"],
  turtle: ["tortoise"],
  violin: ["fiddle"],
};

var COLORS = [
  "black",
  "white",
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "brown",
  "pink",
  "cyan",
  "tan",
];
var FILLS = ["none"].concat(COLORS);
var STROKES = ["none"].concat(COLORS);
var SHAPES = ["oval", "circle", "rect", "triangle"];
var PART_KINDS = ["oval", "rect", "line", "curve", "poly", "dot"];
var DRAW_STROKES = [
  "brown",
  "blue",
  "green",
  "red",
  "orange",
  "purple",
  "black",
  "gray",
  "pink",
  "cyan",
  "tan",
  "yellow",
  "white",
];
var DRAW_FILLS = [
  "none",
  "tan",
  "yellow",
  "green",
  "blue",
  "red",
  "orange",
  "purple",
  "brown",
  "pink",
  "cyan",
  "gray",
  "white",
  "black",
];
var DRAW_WIDTHS = [2, 4, 8, 14];
var DOT_RADII = [2, 3, 4, 6, 8];
var AGENT_DRAW_TYPES = ["draw_svg_layer"];
var HUMAN_DRAW_TYPES = ["draw_stroke"];
var STRUCTURED_DRAW_TYPES = AGENT_DRAW_TYPES.concat(HUMAN_DRAW_TYPES);
var COLOR_SET = makeSet(COLORS);
var FILL_SET = makeSet(FILLS);
var STROKE_SET = makeSet(STROKES);
var DRAW_STROKE_SET = makeSet(DRAW_STROKES);
var DRAW_FILL_SET = makeSet(DRAW_FILLS);
var SHAPE_SET = makeSet(SHAPES);
var PART_KIND_SET = makeSet(PART_KINDS);
var STRUCTURED_DRAW_TYPE_SET = makeSet(STRUCTURED_DRAW_TYPES);
var DRAW_WIDTH_SET = makeNumberSet(DRAW_WIDTHS);
var DOT_RADIUS_SET = makeNumberSet(DOT_RADII);
var DRAW_TIMEOUT_MS = 240000;
var DISCUSSION_TIMEOUT_MS = 30000;
var GUESS_LIMIT = 24;
var DRAW_SVG_MAX = 12000;
var DRAW_PARTS_MAX = 900;
var DRAW_PARTS_LIMIT = 1;
var GRID_COLS = "ABCDEFGHIJ";
var GRID_CELL_ACTION_PATTERN = "^[A-J](?:10|[1-9])$";
var GRID_BOX_ACTION_PATTERN = "^[A-J](?:10|[1-9])(?::[A-J](?:10|[1-9]))?$";
var GRID_POINT_LIST_ACTION_PATTERN =
  "^[A-J](?:10|[1-9])(?:,[A-J](?:10|[1-9])){2,7}$";
var DRAW_PART_KIND_PATTERN = "(?:oval|rect|line|curve|poly|dot)";
var DRAW_PART_PATTERN = DRAW_PART_KIND_PATTERN + "\\b[^;\\n]*";
var DRAW_PARTS_ACTION_PATTERN = "^\\s*" + DRAW_PART_PATTERN + "\\s*$";

function makeSet(items) {
  var out = {};
  for (var i = 0; i < items.length; i++) out[items[i]] = true;
  return out;
}

function makeNumberSet(items) {
  var out = {};
  for (var i = 0; i < items.length; i++) out[String(items[i])] = true;
  return out;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function playerIds(ctx) {
  var ids = [];
  for (var i = 0; i < ctx.players.length; i++) ids.push(ctx.players[i].id);
  return ids;
}

function stripUnsafeTextCharacters(text, preserveTabsAndNewlines) {
  var out = "";
  for (var i = 0; i < text.length; i++) {
    var ch = text.charAt(i);
    var code = text.charCodeAt(i);
    if (ch === "<" || ch === ">" || ch === "`" || ch === '"' || ch === "'")
      continue;
    if (code < 32 && (!preserveTabsAndNewlines || (code !== 9 && code !== 10)))
      continue;
    out += ch;
  }
  return out;
}

function cleanDisplayName(value, fallback) {
  var text = String(value === undefined || value === null ? "" : value)
    .trim()
    .slice(0, 32);
  text = stripUnsafeTextCharacters(text, false);
  if (!text || text.indexOf("player_") === 0 || text.indexOf("player-") === 0)
    return fallback;
  return text;
}

function playerNameMap(ctx) {
  var out = {};
  var used = {};
  var i, p, fallback, base, name, suffix;
  for (i = 0; i < ctx.players.length; i++) {
    p = ctx.players[i];
    fallback = "Player " + (i + 1);
    base = cleanDisplayName(p.name || p.username || p.handle, fallback);
    name = base;
    suffix = 2;
    while (used[name]) {
      name = base + " " + suffix;
      suffix += 1;
    }
    used[name] = true;
    out[p.id] = name;
  }
  return out;
}

function playerName(state, playerId) {
  return state.playerNames?.[playerId] ? state.playerNames[playerId] : "Player";
}

function scoreView(state) {
  var out = {};
  var i, pid;
  for (i = 0; i < state.players.length; i++) {
    pid = state.players[i];
    out[playerName(state, pid)] = state.scores[pid] || 0;
  }
  return out;
}

function roundScoreView(state) {
  var out = {};
  var i, pid;
  for (i = 0; i < state.players.length; i++) {
    pid = state.players[i];
    if (state.roundScores[pid])
      out[playerName(state, pid)] = state.roundScores[pid];
  }
  return out;
}

function playerNamesList(state) {
  var out = [];
  for (var i = 0; i < state.players.length; i++)
    out.push(playerName(state, state.players[i]));
  return out;
}

function initialScores(players) {
  var scores = {};
  for (var i = 0; i < players.length; i++) scores[players[i]] = 0;
  return scores;
}

function makePromptOrder(random) {
  var indexes = [];
  for (var i = 0; i < PROMPTS.length; i++) indexes.push(i);
  return random.shuffle(indexes);
}

function currentDrawer(state) {
  return state.players[state.drawerIndex];
}

function isGamePlayerId(state, playerId) {
  return state.players.indexOf(playerId) !== -1;
}

function nonDrawers(state) {
  var drawer = currentDrawer(state);
  var out = [];
  for (var i = 0; i < state.players.length; i++) {
    if (state.players[i] !== drawer) out.push(state.players[i]);
  }
  return out;
}

function allGuessersSolved(state) {
  var guessers = nonDrawers(state);
  for (var i = 0; i < guessers.length; i++) {
    if (!state.solved[guessers[i]]) return false;
  }
  return true;
}

function newGuessCounts(players) {
  var counts = {};
  for (var i = 0; i < players.length; i++) counts[players[i]] = 0;
  return counts;
}

function startRoundFrom(state, roundIndex, drawerIndex) {
  var prompt =
    PROMPTS[state.promptOrder[roundIndex % state.promptOrder.length]];
  return {
    phase: "draw",
    players: state.players.slice(),
    playerNames: clone(state.playerNames || {}),
    roundIndex: roundIndex,
    maxRounds: state.maxRounds,
    drawerIndex: drawerIndex,
    promptOrder: state.promptOrder.slice(),
    prompt: prompt,
    guessCounts: newGuessCounts(state.players),
    solved: {},
    drawEvents: [],
    geometryLog: [],
    guessLog: [],
    scores: clone(state.scores),
    roundScores: {},
    bonusAwarded: false,
    eventSeq: 0,
    groupSeq: 0,
    lastEvent: "A fresh canvas opened. The drawer is drawing on a grid.",
    lastDrawError: null,
    actionCount: state.actionCount + 1,
  };
}

function cleanString(value, max) {
  var text = String(value === undefined || value === null ? "" : value)
    .trim()
    .slice(0, max);
  return stripUnsafeTextCharacters(text, false);
}

function num(value, fallback) {
  var n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function clamp(value, min, max) {
  var n = num(value, min);
  if (n < min) n = min;
  if (n > max) n = max;
  return Math.round(n * 10) / 10;
}

function safeColor(value, fallback) {
  var c = cleanString(value, 16).toLowerCase();
  return COLOR_SET[c] ? c : fallback;
}

function safeFill(value, fallback) {
  var c = cleanString(value, 16).toLowerCase();
  return FILL_SET[c] ? c : fallback;
}

function safeStroke(value, fallback) {
  var c = cleanString(value, 16).toLowerCase();
  return STROKE_SET[c] ? c : fallback;
}

function safeShape(value) {
  var shape = cleanString(value, 16).toLowerCase();
  return SHAPE_SET[shape] ? shape : "oval";
}

function safeTool(value) {
  var tool = cleanString(value, 16).toLowerCase();
  return tool === "eraser" ? "eraser" : "brush";
}

function normalizedStyle(action, fallbackStroke, fallbackFill) {
  var stroke = safeStroke(
    action.stroke !== undefined ? action.stroke : action.color,
    fallbackStroke || "black",
  );
  var fill = safeFill(action.fill, fallbackFill || "none");
  var opacity = clamp(action.opacity === undefined ? 1 : action.opacity, 0, 1);
  var width = clamp(action.width === undefined ? 4 : action.width, 0, 22);
  if (stroke === "none" && fill === "none") return null;
  if (opacity <= 0) return null;
  if (stroke !== "none" && width <= 0) width = 1;
  return { stroke: stroke, fill: fill, width: width, opacity: opacity };
}

function isStructuredDrawType(type) {
  return !!STRUCTURED_DRAW_TYPE_SET[String(type || "")];
}

function requiredStrokeValue(value) {
  var text = cleanString(value, 16).toLowerCase();
  if (!DRAW_STROKE_SET[text])
    return {
      value: null,
      error: "stroke must be one of: " + DRAW_STROKES.join(", ") + ".",
    };
  return { value: text, error: null };
}

function requiredFillValue(value) {
  var text = cleanString(value, 16).toLowerCase();
  if (!DRAW_FILL_SET[text])
    return {
      value: null,
      error: "fill must be one of: " + DRAW_FILLS.join(", ") + ".",
    };
  return { value: text, error: null };
}

function requiredDrawWidth(value) {
  var n = Number(value);
  if (!DRAW_WIDTH_SET[String(n)])
    return {
      value: null,
      error: "width must be one of: " + DRAW_WIDTHS.join(", ") + ".",
    };
  return { value: n, error: null };
}

function requiredDotRadius(value) {
  var n = Number(value);
  if (!DOT_RADIUS_SET[String(n)])
    return {
      value: null,
      error: "r must be one of: " + DOT_RADII.join(", ") + ".",
    };
  return { value: n, error: null };
}

function structuredStrokeStyle(action, label) {
  var stroke = requiredStrokeValue(action?.stroke);
  var width;
  if (stroke.error) return { style: null, error: label + " " + stroke.error };
  width = requiredDrawWidth(action?.width);
  if (width.error) return { style: null, error: label + " " + width.error };
  return {
    style: {
      stroke: stroke.value,
      color: stroke.value,
      fill: "none",
      width: width.value,
      opacity: 1,
    },
    error: null,
  };
}

function structuredFillStyle(action, label) {
  var stroke = requiredStrokeValue(action?.stroke);
  var fill, width;
  if (stroke.error) return { style: null, error: label + " " + stroke.error };
  fill = requiredFillValue(action?.fill);
  if (fill.error) return { style: null, error: label + " " + fill.error };
  width = requiredDrawWidth(action?.width);
  if (width.error) return { style: null, error: label + " " + width.error };
  return {
    style: {
      stroke: stroke.value,
      color: stroke.value,
      fill: fill.value,
      width: width.value,
      opacity: 1,
    },
    error: null,
  };
}

function parsePoints(text, maxPoints) {
  var nums = String(text || "").match(/-?\d+(?:\.\d+)?/g) || [];
  var points = [];
  if (nums.length < 4 || nums.length % 2 !== 0 || nums.length / 2 > maxPoints)
    return null;
  for (var i = 0; i < nums.length; i += 2) {
    points.push([
      clamp(Number(nums[i]), 0, 100),
      clamp(Number(nums[i + 1]), 0, 100),
    ]);
  }
  return points;
}

function pointsToString(points) {
  var parts = [];
  for (var i = 0; i < points.length; i++)
    parts.push(points[i][0] + "," + points[i][1]);
  return parts.join(" ");
}

function pointBounds(points) {
  var minX = 100,
    maxX = 0,
    minY = 100,
    maxY = 0;
  for (var i = 0; i < points.length; i++) {
    if (points[i][0] < minX) minX = points[i][0];
    if (points[i][0] > maxX) maxX = points[i][0];
    if (points[i][1] < minY) minY = points[i][1];
    if (points[i][1] > maxY) maxY = points[i][1];
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  };
}

function distance(x1, y1, x2, y2) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function pointLineDistance(p, a, b) {
  var dx = b[0] - a[0];
  var dy = b[1] - a[1];
  var lenSq = dx * dx + dy * dy;
  var t, x, y;
  if (lenSq <= 0.0001) return distance(p[0], p[1], a[0], a[1]);
  t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  x = a[0] + t * dx;
  y = a[1] + t * dy;
  return distance(p[0], p[1], x, y);
}

function rdpKeep(points, first, last, epsilon, keep) {
  var maxDist = 0;
  var index = -1;
  var i, d;
  if (last <= first + 1) return;
  for (i = first + 1; i < last; i++) {
    d = pointLineDistance(points[i], points[first], points[last]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist > epsilon && index > -1) {
    keep[index] = true;
    rdpKeep(points, first, index, epsilon, keep);
    rdpKeep(points, index, last, epsilon, keep);
  }
}

function limitPoints(points, maxPoints) {
  var out = [];
  var seen = {};
  var i, idx, key;
  if (points.length <= maxPoints) return points;
  for (i = 0; i < maxPoints; i++) {
    idx = Math.round((i * (points.length - 1)) / (maxPoints - 1));
    key = idx + "";
    if (!seen[key]) {
      out.push(points[idx]);
      seen[key] = true;
    }
  }
  return out;
}

function simplifyPoints(points, epsilon, maxPoints) {
  var keep = {};
  var out = [];
  var i;
  if (!points || points.length <= 2) return points || [];
  keep[0] = true;
  keep[points.length - 1] = true;
  rdpKeep(points, 0, points.length - 1, epsilon, keep);
  for (i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return limitPoints(out, maxPoints);
}

function strokeLength(points) {
  var total = 0;
  for (var i = 1; i < points.length; i++)
    total += distance(
      points[i - 1][0],
      points[i - 1][1],
      points[i][0],
      points[i][1],
    );
  return total;
}

function gridIndex(value) {
  var n = Math.floor(clamp(value, 0, 99.9) / 10);
  if (n < 0) n = 0;
  if (n > 9) n = 9;
  return n;
}

function gridCell(x, y) {
  return GRID_COLS.charAt(gridIndex(x)) + String(gridIndex(y) + 1);
}

function gridBounds(bounds) {
  var a = gridCell(bounds.x, bounds.y);
  var b = gridCell(
    bounds.x + Math.max(0, bounds.width - 0.1),
    bounds.y + Math.max(0, bounds.height - 0.1),
  );
  return a === b ? a : a + ":" + b;
}

function parseGridCellValue(value) {
  var text = String(value || "")
    .trim()
    .toUpperCase();
  var m = /^([A-J])(10|[1-9])$/.exec(text);
  var col, row;
  if (!m) return null;
  col = GRID_COLS.indexOf(m[1]);
  row = Number(m[2]) - 1;
  if (col < 0 || row < 0 || row > 9) return null;
  return { col: col, row: row, x: col * 10 + 5, y: row * 10 + 5 };
}

function parseGridBoxValue(value) {
  var parts = String(value || "")
    .trim()
    .split(":");
  var a, b, c1, c2, r1, r2;
  if (parts.length < 1 || parts.length > 2) return null;
  a = parseGridCellValue(parts[0]);
  b = parseGridCellValue(parts.length === 2 ? parts[1] : parts[0]);
  if (!a || !b) return null;
  c1 = Math.min(a.col, b.col);
  c2 = Math.max(a.col, b.col);
  r1 = Math.min(a.row, b.row);
  r2 = Math.max(a.row, b.row);
  return {
    x: c1 * 10,
    y: r1 * 10,
    w: (c2 - c1 + 1) * 10,
    h: (r2 - r1 + 1) * 10,
  };
}

function parseGridSizeValue(value) {
  var text = String(value || "")
    .trim()
    .toLowerCase();
  var m, cols, rows;
  if (!text) return null;
  text = text.replace(/\*/g, "x");
  m = /^([1-9]|10)(?:x([1-9]|10))?$/.exec(text);
  if (!m) return null;
  cols = Number(m[1]);
  rows = Number(m[2] || m[1]);
  if (cols < 1 || cols > 10 || rows < 1 || rows > 10) return null;
  return { cols: cols, rows: rows };
}

function gridBoxFromCenterValue(centerValue, sizeValue) {
  var center = parseGridCellValue(centerValue);
  var size = parseGridSizeValue(sizeValue);
  var c1, r1, c2, r2;
  if (!center || !size) return null;
  c1 = center.col - Math.floor((size.cols - 1) / 2);
  r1 = center.row - Math.floor((size.rows - 1) / 2);
  c2 = c1 + size.cols - 1;
  r2 = r1 + size.rows - 1;
  if (c1 < 0) {
    c2 -= c1;
    c1 = 0;
  }
  if (r1 < 0) {
    r2 -= r1;
    r1 = 0;
  }
  if (c2 > 9) {
    c1 -= c2 - 9;
    c2 = 9;
  }
  if (r2 > 9) {
    r1 -= r2 - 9;
    r2 = 9;
  }
  if (c1 < 0) c1 = 0;
  if (r1 < 0) r1 = 0;
  return {
    x: c1 * 10,
    y: r1 * 10,
    w: (c2 - c1 + 1) * 10,
    h: (r2 - r1 + 1) * 10,
  };
}

function parseGridPointList(value, maxPoints) {
  var raw = String(value || "")
    .replace(/->/g, ",")
    .split(/[,|]+/);
  var points = [];
  var i, cell;
  if (raw.length < 1 || raw.length > maxPoints) return null;
  for (i = 0; i < raw.length; i++) {
    cell = parseGridCellValue(raw[i]);
    if (!cell) return null;
    points.push([cell.x, cell.y]);
  }
  return points;
}

function cleanPartsText(value) {
  var text = String(value === undefined || value === null ? "" : value).slice(
    0,
    DRAW_PARTS_MAX,
  );
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  text = stripUnsafeTextCharacters(text, true);
  return text.trim();
}

function svgSet(items) {
  var out = {};
  for (var i = 0; i < items.length; i++) out[items[i]] = true;
  return out;
}

var SVG_TAG_SET = svgSet([
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
]);
var SVG_VISIBLE_TAG_SET = svgSet([
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
]);
var SVG_ATTR_SET = svgSet([
  "d",
  "fill",
  "fill-opacity",
  "height",
  "opacity",
  "points",
  "r",
  "rx",
  "ry",
  "stroke",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-opacity",
  "stroke-width",
  "transform",
  "viewbox",
  "width",
  "x",
  "x1",
  "x2",
  "y",
  "y1",
  "y2",
  "cx",
  "cy",
]);

function svgAttrAllowed(tag, name) {
  if (!SVG_ATTR_SET[name]) return false;
  if (tag === "g") return name !== "d" && name !== "points";
  if (tag === "path") return name !== "points";
  if (tag === "polyline" || tag === "polygon") return name !== "d";
  return name !== "d" && name !== "points";
}

function escapeSvgAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function parseSvgAttributes(raw, tag) {
  var attrs = {};
  var clean = String(raw || "").replace(/\/\s*$/, "");
  var attrRe =
    /([a-zA-Z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  var consumed = "";
  var m, name, value;
  m = attrRe.exec(clean);
  while (m !== null) {
    consumed += clean.slice(consumed.length, m.index).replace(/\s+/g, "");
    name = m[1].toLowerCase();
    value = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5];
    consumed += m[0].replace(/\s+/g, "");
    if (name.indexOf("on") === 0 || name.indexOf(":") >= 0)
      return {
        attrs: null,
        error: "SVG event handlers and namespaced attributes are not allowed.",
      };
    if (!svgAttrAllowed(tag, name))
      return {
        attrs: null,
        error: "SVG attribute '" + name + "' is not allowed on <" + tag + ">.",
      };
    if (
      /[<>`]/.test(value) ||
      /(?:javascript|data|https?|url\s*\(|base64)/i.test(value)
    )
      return {
        attrs: null,
        error: "SVG attribute '" + name + "' contains unsafe content.",
      };
    if (value.length > 900)
      return {
        attrs: null,
        error: "SVG attribute '" + name + "' is too long.",
      };
    attrs[name] = value;
    m = attrRe.exec(clean);
  }
  if (clean.replace(attrRe, "").replace(/[/\s]+/g, "") !== "")
    return { attrs: null, error: "SVG has malformed attributes." };
  return { attrs: attrs, error: null };
}

function numberAttr(attrs, name, fallback) {
  var n = attrs && attrs[name] !== undefined ? Number(attrs[name]) : fallback;
  if (!Number.isFinite(n)) n = fallback;
  return n;
}

function clampSvgBounds(bounds) {
  var x1, y1, x2, y2;
  if (!bounds) return null;
  x1 = Math.max(0, Math.min(100, bounds.x));
  y1 = Math.max(0, Math.min(100, bounds.y));
  x2 = Math.max(0, Math.min(100, bounds.x + bounds.width));
  y2 = Math.max(0, Math.min(100, bounds.y + bounds.height));
  if (x2 < x1) {
    var tx = x1;
    x1 = x2;
    x2 = tx;
  }
  if (y2 < y1) {
    var ty = y1;
    y1 = y2;
    y2 = ty;
  }
  if (x2 - x1 < 0.1 || y2 - y1 < 0.1) return null;
  return {
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1,
    cx: (x1 + x2) / 2,
    cy: (y1 + y2) / 2,
  };
}

function unionSvgBounds(a, b) {
  var x1, y1, x2, y2;
  if (!a) return b;
  if (!b) return a;
  x1 = Math.min(a.x, b.x);
  y1 = Math.min(a.y, b.y);
  x2 = Math.max(a.x + a.width, b.x + b.width);
  y2 = Math.max(a.y + a.height, b.y + b.height);
  return {
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1,
    cx: (x1 + x2) / 2,
    cy: (y1 + y2) / 2,
  };
}

function pointsBounds(value) {
  var nums = String(value || "").match(/-?\d+(?:\.\d+)?/g);
  var bounds = null;
  var i, x, y, b;
  if (!nums || nums.length < 4) return null;
  for (i = 0; i + 1 < nums.length; i += 2) {
    x = Number(nums[i]);
    y = Number(nums[i + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    b = { x: x, y: y, width: 0.5, height: 0.5, cx: x, cy: y };
    bounds = unionSvgBounds(bounds, b);
  }
  return clampSvgBounds(bounds);
}

function pathBounds(value) {
  return pointsBounds(value);
}

function svgElementBounds(tag, attrs) {
  var x, y, w, h, r, rx, ry, x1, y1, x2, y2;
  if (tag === "rect") {
    x = numberAttr(attrs, "x", 0);
    y = numberAttr(attrs, "y", 0);
    w = numberAttr(attrs, "width", 0);
    h = numberAttr(attrs, "height", 0);
    return clampSvgBounds({
      x: x,
      y: y,
      width: w,
      height: h,
      cx: x + w / 2,
      cy: y + h / 2,
    });
  }
  if (tag === "circle") {
    x = numberAttr(attrs, "cx", 50);
    y = numberAttr(attrs, "cy", 50);
    r = numberAttr(attrs, "r", 0);
    return clampSvgBounds({
      x: x - r,
      y: y - r,
      width: r * 2,
      height: r * 2,
      cx: x,
      cy: y,
    });
  }
  if (tag === "ellipse") {
    x = numberAttr(attrs, "cx", 50);
    y = numberAttr(attrs, "cy", 50);
    rx = numberAttr(attrs, "rx", 0);
    ry = numberAttr(attrs, "ry", 0);
    return clampSvgBounds({
      x: x - rx,
      y: y - ry,
      width: rx * 2,
      height: ry * 2,
      cx: x,
      cy: y,
    });
  }
  if (tag === "line") {
    x1 = numberAttr(attrs, "x1", 0);
    y1 = numberAttr(attrs, "y1", 0);
    x2 = numberAttr(attrs, "x2", 0);
    y2 = numberAttr(attrs, "y2", 0);
    return clampSvgBounds({
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1) || 0.5,
      height: Math.abs(y2 - y1) || 0.5,
      cx: (x1 + x2) / 2,
      cy: (y1 + y2) / 2,
    });
  }
  if (tag === "polyline" || tag === "polygon")
    return pointsBounds(attrs.points);
  if (tag === "path") return pathBounds(attrs.d);
  return null;
}

function svgColorValue(value) {
  var text = String(value === undefined ? "" : value)
    .trim()
    .toLowerCase();
  if (!text || text === "none" || text === "transparent") return "";
  return text.slice(0, 24);
}

function svgOpacityValue(value, fallback) {
  var n = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(n)) n = fallback;
  if (n < 0) n = 0;
  if (n > 1) n = 1;
  return n;
}

function positiveSvgLength(value, fallback) {
  var n = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(n)) n = fallback;
  return n > 0;
}

function hasVisibleSvgPaint(tag, attrs) {
  var opacity = svgOpacityValue(attrs.opacity, 1);
  var fill, stroke, fillOpacity, strokeOpacity;
  if (opacity <= 0) return false;
  stroke = svgColorValue(attrs.stroke);
  strokeOpacity = svgOpacityValue(attrs["stroke-opacity"], 1);
  if (
    stroke &&
    strokeOpacity > 0 &&
    positiveSvgLength(attrs["stroke-width"], 1)
  )
    return true;
  if (tag === "line" || tag === "polyline") return false;
  fill = attrs.fill === undefined ? "black" : svgColorValue(attrs.fill);
  fillOpacity = svgOpacityValue(attrs["fill-opacity"], 1);
  return !!fill && fillOpacity > 0;
}

function summarizeSvgElement(tag, attrs, bounds) {
  var fill = svgColorValue(attrs.fill);
  var stroke = svgColorValue(attrs.stroke);
  var parts = [tag];
  if (fill) parts.push("fill=" + fill);
  if (stroke) parts.push("stroke=" + stroke);
  if (bounds) parts.push("bbox " + gridBounds(bounds));
  return parts.join(" ");
}

function sanitizeSvgLayer(value) {
  var text = String(value === undefined || value === null ? "" : value).trim();
  var tagRe = /<\/?([a-zA-Z][\w:-]*)([^>]*)>/g;
  var out = [];
  var visible = 0;
  var bounds = null;
  var tags = {};
  var colors = {};
  var summaries = [];
  var lastIndex = 0;
  var m,
    closing,
    tag,
    rawAttrs,
    parsed,
    attrs,
    attrNames,
    attrText,
    selfClose,
    b,
    fill,
    stroke,
    i,
    name;
  if (!text)
    return { event: null, error: "draw_svg_layer requires SVG content." };
  if (text.length > DRAW_SVG_MAX)
    return { event: null, error: "SVG layer is too long." };
  text = text
    .replace(/^\s*<svg\b[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .trim();
  if (
    /<!|<\?|<!--|<\s*(?:script|style|text|foreignobject|image|html|body|iframe|object|embed|audio|video|canvas|a)\b/i.test(
      text,
    )
  )
    return {
      event: null,
      error: "SVG layer contains unsafe or guess-leaking tags.",
    };
  if (
    /\bon[a-z]+\s*=|(?:href|src|xlink:href)\s*=|(?:javascript|data|https?|url\s*\(|base64)/i.test(
      text,
    )
  )
    return {
      event: null,
      error: "SVG layer contains unsafe references or event handlers.",
    };
  m = tagRe.exec(text);
  while (m !== null) {
    if (text.slice(lastIndex, m.index).trim() !== "")
      return {
        event: null,
        error: "SVG layer may only contain SVG elements, not text.",
      };
    lastIndex = tagRe.lastIndex;
    closing = m[0].charAt(1) === "/";
    tag = (m[1] || "").toLowerCase();
    rawAttrs = m[2] || "";
    if (!SVG_TAG_SET[tag])
      return { event: null, error: "SVG tag <" + tag + "> is not allowed." };
    if (closing) {
      out.push("</" + tag + ">");
      m = tagRe.exec(text);
      continue;
    }
    parsed = parseSvgAttributes(rawAttrs, tag);
    if (parsed.error) return { event: null, error: parsed.error };
    attrs = parsed.attrs;
    attrNames = Object.keys(attrs).toSorted();
    attrText = "";
    for (i = 0; i < attrNames.length; i++) {
      name = attrNames[i];
      attrText += " " + name + '="' + escapeSvgAttr(attrs[name]) + '"';
    }
    selfClose = /\/\s*$/.test(rawAttrs);
    out.push("<" + tag + attrText + (selfClose ? "/>" : ">"));
    tags[tag] = true;
    fill = svgColorValue(attrs.fill);
    stroke = svgColorValue(attrs.stroke);
    if (fill) colors[fill] = true;
    if (stroke) colors[stroke] = true;
    if (SVG_VISIBLE_TAG_SET[tag]) {
      b = svgElementBounds(tag, attrs);
      if (b && hasVisibleSvgPaint(tag, attrs)) {
        visible += 1;
        bounds = unionSvgBounds(bounds, b);
        summaries.push(summarizeSvgElement(tag, attrs, b));
      }
    }
    m = tagRe.exec(text);
  }
  if (text.slice(lastIndex).trim() !== "")
    return { event: null, error: "SVG layer has malformed trailing content." };
  if (out.length === 0 || visible === 0 || !bounds)
    return {
      event: null,
      error: "SVG layer must contain at least one visible shape.",
    };
  return {
    event: {
      type: "svg_layer",
      svg: out.join(""),
      elementCount: visible,
      tags: Object.keys(tags).toSorted(),
      colors: Object.keys(colors).toSorted(),
      bounds: bounds,
      layerSummary: summaries.slice(0, 3).join("; "),
      cost: 1,
    },
    error: null,
  };
}

function parsePartSpecResult(text, index) {
  var tokens = String(text || "")
    .trim()
    .split(/\s+/);
  var kind = cleanString(tokens[0], 16).toLowerCase();
  var attrs = { kind: kind };
  var i, token, eq, key, value;
  if (!PART_KIND_SET[kind]) {
    return {
      attrs: null,
      error:
        "part " +
        index +
        " uses unknown kind '" +
        cleanString(tokens[0], 16) +
        "'. Use oval, rect, line, curve, poly, or dot.",
    };
  }
  for (i = 1; i < tokens.length; i++) {
    token = tokens[i];
    eq = token.indexOf("=");
    if (eq <= 0) {
      return {
        attrs: null,
        error:
          "part " +
          index +
          " has invalid token '" +
          cleanString(token, 24) +
          "'. Use key=value attributes.",
      };
    }
    key = cleanString(token.slice(0, eq), 18).toLowerCase();
    value = cleanString(token.slice(eq + 1), 80);
    if (!key || !value) {
      return {
        attrs: null,
        error:
          "part " +
          index +
          " has an empty key or value. Use key=value attributes.",
      };
    }
    attrs[key] = value;
  }
  return { attrs: attrs, error: null };
}

function parsePartSpec(text) {
  var result = parsePartSpecResult(text, 1);
  return result.attrs;
}

function actionStyleFromAttrs(attrs, fillFallback) {
  return {
    stroke: attrs.stroke !== undefined ? attrs.stroke : attrs.color,
    color: attrs.color !== undefined ? attrs.color : attrs.stroke,
    fill: attrs.fill !== undefined ? attrs.fill : fillFallback,
    width: attrs.width === undefined ? 4 : Number(attrs.width),
    opacity: attrs.opacity === undefined ? 1 : Number(attrs.opacity),
  };
}

function attachPartMetadata(event, attrs, prompt) {
  return event;
}

function shapeBoxError(kind, attrs) {
  var centerText;
  if (attrs && (attrs.center !== undefined || attrs.at !== undefined)) {
    centerText = attrs.center || attrs.at;
    if (!parseGridCellValue(centerText))
      return (
        kind +
        " center=" +
        cleanString(centerText, 12) +
        " is invalid. Use an A1-J10 cell like center=E6."
      );
    if (attrs.size === undefined)
      return (
        kind +
        " with center=" +
        cleanString(centerText, 12) +
        " also needs size=3x3. Or use box=D4:G7."
      );
    if (!parseGridSizeValue(attrs.size))
      return kind + " size must be 1-10 cells, like size=3x3 or size=4.";
  }
  return kind + " requires box=D4:G7, or center=E6 size=3x3.";
}

function normalizeGridPartResult(attrs, prompt, index) {
  var kind = attrs?.kind;
  var action, box, from, to, ctrl, points, at, event, style;
  if (kind === "oval" || kind === "rect") {
    box = parseGridBoxValue(attrs.box || attrs.bbox);
    if (!box && (attrs.center !== undefined || attrs.at !== undefined))
      box = gridBoxFromCenterValue(attrs.center || attrs.at, attrs.size);
    if (!box)
      return {
        event: null,
        error: "part " + index + ": " + shapeBoxError(kind, attrs),
      };
    style = actionStyleFromAttrs(attrs, "none");
    action = {
      shape: kind,
      stroke: style.stroke,
      fill: style.fill,
      width: style.width,
      opacity: style.opacity,
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
    };
    event = normalizeShape(action);
    return event
      ? { event: attachPartMetadata(event, attrs, prompt), error: null }
      : {
          event: null,
          error:
            "part " + index + ": " + kind + " needs a visible stroke or fill.",
        };
  }
  if (kind === "line") {
    from = parseGridCellValue(attrs.from);
    to = parseGridCellValue(attrs.to);
    if (!from || !to)
      return {
        event: null,
        error:
          "part " + index + ": line requires from=D4 to=G7 using A1-J10 cells.",
      };
    style = actionStyleFromAttrs(attrs, "none");
    action = {
      color: style.stroke || style.color,
      stroke: style.stroke || style.color,
      width: style.width,
      opacity: style.opacity,
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
    };
    event = normalizeLine(action);
    return event
      ? { event: attachPartMetadata(event, attrs, prompt), error: null }
      : {
          event: null,
          error:
            "part " +
            index +
            ": line needs a visible stroke and two different cells.",
        };
  }
  if (kind === "curve") {
    from = parseGridCellValue(attrs.from);
    ctrl = parseGridCellValue(attrs.ctrl || attrs.control);
    to = parseGridCellValue(attrs.to);
    if (!from || !ctrl || !to)
      return {
        event: null,
        error:
          "part " +
          index +
          ": curve requires from=D4 ctrl=F2 to=G7 using A1-J10 cells.",
      };
    style = actionStyleFromAttrs(attrs, "none");
    action = {
      color: style.stroke || style.color,
      stroke: style.stroke || style.color,
      width: style.width,
      opacity: style.opacity,
      x1: from.x,
      y1: from.y,
      cx: ctrl.x,
      cy: ctrl.y,
      x2: to.x,
      y2: to.y,
    };
    event = normalizeCurve(action);
    return event
      ? { event: attachPartMetadata(event, attrs, prompt), error: null }
      : {
          event: null,
          error:
            "part " +
            index +
            ": curve needs a visible stroke and distinct cells.",
        };
  }
  if (kind === "poly") {
    points = parseGridPointList(attrs.points, 8);
    if (!points || points.length < 3)
      return {
        event: null,
        error:
          "part " +
          index +
          ": poly requires points=D7,E5,G7 with 3-8 A1-J10 cells.",
      };
    style = actionStyleFromAttrs(attrs, "none");
    action = {
      points: pointsToString(points),
      stroke: style.stroke,
      fill: style.fill,
      width: style.width,
      opacity: style.opacity,
    };
    event = normalizePolygon(action);
    return event
      ? { event: attachPartMetadata(event, attrs, prompt), error: null }
      : {
          event: null,
          error: "part " + index + ": poly needs a visible stroke or fill.",
        };
  }
  if (kind === "dot") {
    at = parseGridCellValue(attrs.at || attrs.center);
    if (!at)
      return {
        event: null,
        error: "part " + index + ": dot requires at=F5 using an A1-J10 cell.",
      };
    style = actionStyleFromAttrs(
      attrs,
      attrs.fill === undefined ? "black" : "none",
    );
    action = {
      x: at.x,
      y: at.y,
      r: attrs.r === undefined ? 3 : Number(attrs.r),
      stroke: style.stroke,
      fill: style.fill,
      width: style.width,
      opacity: style.opacity,
    };
    event = normalizeDot(action);
    return event
      ? { event: attachPartMetadata(event, attrs, prompt), error: null }
      : {
          event: null,
          error: "part " + index + ": dot needs a visible stroke or fill.",
        };
  }
  return {
    event: null,
    error:
      "part " +
      index +
      " uses unknown kind. Use oval, rect, line, curve, poly, or dot.",
  };
}

function normalizeGridPart(attrs, prompt) {
  var result = normalizeGridPartResult(attrs, prompt, 1);
  return result.event;
}

function normalizeDrawPartsResult(action, prompt) {
  var text = cleanPartsText(action?.parts);
  var rawSpecs = text ? text.split(/[;\n]+/) : [];
  var specs = [];
  var events = [];
  var i, spec, parsed, attrs, normalized;
  for (i = 0; i < rawSpecs.length; i++) {
    spec = rawSpecs[i].trim();
    if (spec) specs.push(spec);
  }
  if (specs.length < 1)
    return { events: null, error: "draw_parts requires exactly 1 grid part." };
  if (specs.length > DRAW_PARTS_LIMIT)
    return {
      events: null,
      error:
        "draw_parts accepts exactly 1 grid part per action. Do not use semicolons.",
    };
  for (i = 0; i < specs.length; i++) {
    spec = specs[i];
    parsed = parsePartSpecResult(spec, i + 1);
    attrs = parsed.attrs;
    if (!attrs) return { events: null, error: parsed.error };
    normalized = normalizeGridPartResult(attrs, prompt, i + 1);
    if (!normalized.event) return { events: null, error: normalized.error };
    events.push(normalized.event);
  }
  return events.length
    ? { events: events, error: null }
    : {
        events: null,
        error: "draw_parts did not contain any drawable grid parts.",
      };
}

function normalizeDrawParts(action, prompt) {
  var result = normalizeDrawPartsResult(action, prompt);
  return result.events;
}

function normalizeStructuredDrawResult(action, prompt) {
  var type = String(action?.type || "");
  var styleResult,
    style,
    from,
    mid,
    to,
    ctrl,
    box,
    points,
    at,
    radius,
    event,
    eventA,
    eventB,
    layer;
  if (!isStructuredDrawType(type))
    return { events: null, error: "unknown draw action type." };
  if (type === "draw_svg_layer") {
    layer = sanitizeSvgLayer(action?.svg);
    return layer.event
      ? { events: [layer.event], error: null }
      : { events: null, error: layer.error };
  }
  if (type === "draw_stroke") {
    styleResult = structuredStrokeStyle(action, "draw_stroke");
    if (styleResult.error) return { events: null, error: styleResult.error };
    style = styleResult.style;
    event = normalizeStroke({
      points: action.points,
      color: style.stroke,
      stroke: style.stroke,
      width: style.width,
      opacity: 1,
      tool: "brush",
    });
    return event
      ? { events: [event], error: null }
      : {
          events: null,
          error: "draw_stroke requires a visible freehand path as x,y pairs.",
        };
  }
  if (type === "draw_line") {
    from = parseGridCellValue(action.from);
    to = parseGridCellValue(action.to);
    if (!from || !to)
      return {
        events: null,
        error: "draw_line requires from=D4 and to=G7 using A1-J10 cells.",
      };
    styleResult = structuredStrokeStyle(action, "draw_line");
    if (styleResult.error) return { events: null, error: styleResult.error };
    style = styleResult.style;
    event = normalizeLine({
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      stroke: style.stroke,
      color: style.stroke,
      width: style.width,
      opacity: 1,
    });
    return event
      ? { events: [event], error: null }
      : { events: null, error: "draw_line needs two different cells." };
  }
  if (type === "draw_curve") {
    from = parseGridCellValue(action.from);
    ctrl = parseGridCellValue(action.ctrl);
    to = parseGridCellValue(action.to);
    if (!from || !ctrl || !to)
      return {
        events: null,
        error: "draw_curve requires from=D4 ctrl=F2 to=G7 using A1-J10 cells.",
      };
    styleResult = structuredStrokeStyle(action, "draw_curve");
    if (styleResult.error) return { events: null, error: styleResult.error };
    style = styleResult.style;
    event = normalizeCurve({
      x1: from.x,
      y1: from.y,
      cx: ctrl.x,
      cy: ctrl.y,
      x2: to.x,
      y2: to.y,
      stroke: style.stroke,
      color: style.stroke,
      width: style.width,
      opacity: 1,
    });
    return event
      ? { events: [event], error: null }
      : {
          events: null,
          error: "draw_curve needs visible distance between its cells.",
        };
  }
  if (type === "draw_oval" || type === "draw_rect") {
    box = parseGridBoxValue(action.box);
    if (!box)
      return {
        events: null,
        error: type + " requires box=D4:G7 using A1-J10 cells.",
      };
    styleResult = structuredFillStyle(action, type);
    if (styleResult.error) return { events: null, error: styleResult.error };
    style = styleResult.style;
    event = normalizeShape({
      shape: type === "draw_rect" ? "rect" : "oval",
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      stroke: style.stroke,
      fill: style.fill,
      width: style.width,
      opacity: 1,
    });
    return event
      ? { events: [event], error: null }
      : { events: null, error: type + " needs a visible stroke or fill." };
  }
  if (type === "draw_poly") {
    points = parseGridPointList(action.points, 8);
    if (!points || points.length < 3)
      return {
        events: null,
        error: "draw_poly requires points=D7,F4,H7 with 3-8 A1-J10 cells.",
      };
    styleResult = structuredFillStyle(action, "draw_poly");
    if (styleResult.error) return { events: null, error: styleResult.error };
    style = styleResult.style;
    event = normalizePolygon({
      points: pointsToString(points),
      stroke: style.stroke,
      fill: style.fill,
      width: style.width,
      opacity: 1,
    });
    return event
      ? { events: [event], error: null }
      : { events: null, error: "draw_poly needs a visible polygon." };
  }
  if (type === "draw_dot") {
    at = parseGridCellValue(action.at);
    if (!at)
      return {
        events: null,
        error: "draw_dot requires at=F5 using an A1-J10 cell.",
      };
    styleResult = structuredFillStyle(action, "draw_dot");
    if (styleResult.error) return { events: null, error: styleResult.error };
    radius = requiredDotRadius(action.r);
    if (radius.error)
      return { events: null, error: "draw_dot " + radius.error };
    style = styleResult.style;
    event = normalizeDot({
      x: at.x,
      y: at.y,
      r: radius.value,
      stroke: style.stroke,
      fill: style.fill,
      width: style.width,
      opacity: 1,
    });
    return event
      ? { events: [event], error: null }
      : { events: null, error: "draw_dot needs a visible stroke or fill." };
  }
  if (type === "draw_stroke_pair") {
    from = parseGridCellValue(action.from);
    mid = parseGridCellValue(action.mid);
    to = parseGridCellValue(action.to);
    if (!from || !mid || !to)
      return {
        events: null,
        error:
          "draw_stroke_pair requires from=D7 mid=F5 to=H7 using A1-J10 cells.",
      };
    styleResult = structuredStrokeStyle(action, "draw_stroke_pair");
    if (styleResult.error) return { events: null, error: styleResult.error };
    style = styleResult.style;
    eventA = normalizeLine({
      x1: from.x,
      y1: from.y,
      x2: mid.x,
      y2: mid.y,
      stroke: style.stroke,
      color: style.stroke,
      width: style.width,
      opacity: 1,
    });
    eventB = normalizeLine({
      x1: mid.x,
      y1: mid.y,
      x2: to.x,
      y2: to.y,
      stroke: style.stroke,
      color: style.stroke,
      width: style.width,
      opacity: 1,
    });
    if (!eventA || !eventB)
      return {
        events: null,
        error:
          "draw_stroke_pair needs three cells that make exactly two visible connected line segments.",
      };
    return { events: [eventA, eventB], error: null };
  }
  return { events: null, error: "unknown draw action type." };
}

function normalizeDrawActionResult(action, prompt) {
  if (action && isStructuredDrawType(action.type))
    return normalizeStructuredDrawResult(action, prompt);
  return { events: null, error: "unknown draw action type." };
}

function normalizeDrawAction(action, prompt) {
  var result = normalizeDrawActionResult(action, prompt);
  return result.events;
}

function compactCells(points, maxCells) {
  var cells = [];
  var last = "";
  var i, cell, limited;
  for (i = 0; i < points.length; i++) {
    cell = gridCell(points[i][0], points[i][1]);
    if (cell !== last) {
      cells.push(cell);
      last = cell;
    }
  }
  limited = limitPoints(cells, maxCells);
  return limited.join(" -> ");
}

function directionFromDelta(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy) * 1.8)
    return dx >= 0 ? "left-to-right" : "right-to-left";
  if (Math.abs(dy) > Math.abs(dx) * 1.8)
    return dy >= 0 ? "top-to-bottom" : "bottom-to-top";
  if (dx >= 0 && dy >= 0) return "upper-left to lower-right";
  if (dx < 0 && dy >= 0) return "upper-right to lower-left";
  if (dx >= 0 && dy < 0) return "lower-left to upper-right";
  return "lower-right to upper-left";
}

function turnStats(points) {
  var turns = 0;
  var sharpTurns = 0;
  var signChanges = 0;
  var lastSign = 0;
  var i, ax, ay, bx, by, cross, dot, mag, angle, sign;
  for (i = 1; i < points.length - 1; i++) {
    ax = points[i][0] - points[i - 1][0];
    ay = points[i][1] - points[i - 1][1];
    bx = points[i + 1][0] - points[i][0];
    by = points[i + 1][1] - points[i][1];
    mag = Math.sqrt((ax * ax + ay * ay) * (bx * bx + by * by));
    if (mag <= 0.0001) continue;
    cross = ax * by - ay * bx;
    dot = ax * bx + ay * by;
    angle = Math.acos(Math.max(-1, Math.min(1, dot / mag)));
    if (angle > 0.35) turns += 1;
    if (angle > 1.15) sharpTurns += 1;
    sign = cross > 1 ? 1 : cross < -1 ? -1 : 0;
    if (sign !== 0) {
      if (lastSign !== 0 && sign !== lastSign) signChanges += 1;
      lastSign = sign;
    }
  }
  return { turns: turns, sharpTurns: sharpTurns, signChanges: signChanges };
}

function pathExtremaShape(points, bounds) {
  var first = points[0];
  var last = points[points.length - 1];
  var endY = (first[1] + last[1]) / 2;
  var start = Math.max(1, Math.floor(points.length / 4));
  var stop = Math.min(points.length - 2, Math.ceil((points.length * 3) / 4));
  var minMidY = 100;
  var maxMidY = 0;
  var threshold = Math.max(5, bounds.height * 0.22);
  var i;
  if (points.length < 4 || bounds.width < 10 || bounds.height < 8) return "";
  if (Math.abs(first[1] - last[1]) > bounds.height * 0.45 + 3) return "";
  for (i = start; i <= stop; i++) {
    if (points[i][1] < minMidY) minMidY = points[i][1];
    if (points[i][1] > maxMidY) maxMidY = points[i][1];
  }
  if (maxMidY > endY + threshold) return "U-shaped curve";
  if (minMidY < endY - threshold) return "arched curve";
  return "";
}

function analyzePointPath(points, bounds, length) {
  var first = points[0];
  var last = points[points.length - 1];
  var direct = distance(first[0], first[1], last[0], last[1]);
  var diag = Math.max(
    1,
    distance(
      bounds.x,
      bounds.y,
      bounds.x + bounds.width,
      bounds.y + bounds.height,
    ),
  );
  var endGap = direct;
  var turns = turnStats(points);
  var pathRatio = length / diag;
  var closed = endGap < Math.max(4, diag * 0.18) && length > 18;
  var shape = "";
  if (closed) shape = "near-closed loop";
  else if ((turns.sharpTurns >= 5 && pathRatio > 2.2) || pathRatio > 4.2)
    shape = "complex scribble";
  else if (turns.signChanges >= 3 && turns.turns >= 4)
    shape = "zigzag or squiggle";
  else shape = pathExtremaShape(points, bounds);
  if (
    !shape &&
    turns.signChanges >= 1 &&
    turns.turns >= 2 &&
    Math.max(bounds.width, bounds.height) > 14
  )
    shape = "S-shaped curve";
  if (!shape && pathRatio < 1.18) shape = "straight-ish stroke";
  if (!shape && bounds.height > bounds.width * 1.7)
    shape = "mostly vertical stroke";
  if (!shape && bounds.width > bounds.height * 1.7)
    shape = "mostly horizontal stroke";
  if (!shape) shape = "curved stroke";
  return {
    shapeClass: shape,
    direction: directionFromDelta(last[0] - first[0], last[1] - first[1]),
    gridPath: compactCells(points, 8),
    bboxGrid: gridBounds(bounds),
    startCell: gridCell(first[0], first[1]),
    endCell: gridCell(last[0], last[1]),
    complexity:
      pathRatio > 3.2 || turns.turns > 6
        ? "high"
        : pathRatio > 1.8 || turns.turns > 2
          ? "medium"
          : "low",
    closedness: closed ? "near-closed" : "open",
  };
}

function eventCost(event) {
  if (event.type === "stroke") {
    if (event.pointCount > 42 || event.length > 150) return 3;
    if (event.pointCount > 20 || event.length > 75) return 2;
    return 1;
  }
  if (event.type === "shape") {
    var area = event.w * event.h;
    if (area > 3200) return 3;
    if (area > 1100) return 2;
    return 1;
  }
  if (event.type === "polygon") {
    if (event.pointCount > 5) return 2;
    return 1;
  }
  if (event.type === "dot") return 1;
  if (event.type === "line") return event.length > 65 ? 2 : 1;
  if (event.type === "curve") return event.length > 80 ? 2 : 1;
  return 1;
}

function normalizeStroke(action) {
  var points = parsePoints(action.points, 80);
  var b, len, tool;
  /** @type {Object} */
  var event;
  if (!points) return null;
  points = simplifyPoints(points, 1.1, 36);
  b = pointBounds(points);
  len = strokeLength(points);
  if (Math.max(b.width, b.height, len) < 1.5) return null;
  tool = safeTool(action.tool);
  /** @type {Object} */
  event = {
    type: "stroke",
    tool: tool,
    color: tool === "eraser" ? "white" : safeColor(action.color, "black"),
    width: clamp(action.width, 1, 22),
    points: points,
    pointText: pointsToString(points),
    pointCount: points.length,
    bounds: b,
    length: Math.round(len * 10) / 10,
    analysis: analyzePointPath(points, b, len),
  };
  event.cost = eventCost(event);
  event.summary = describeEvent(event);
  return event;
}

function normalizeLine(action) {
  var x1 = clamp(action.x1, 0, 100);
  var y1 = clamp(action.y1, 0, 100);
  var x2 = clamp(action.x2, 0, 100);
  var y2 = clamp(action.y2, 0, 100);
  var len = distance(x1, y1, x2, y2);
  /** @type {Object} */
  var event;
  var style, b;
  if (len < 1.5) return null;
  style = normalizedStyle(action, "black", "none");
  if (!style || style.stroke === "none") return null;
  b = pointBounds([
    [x1, y1],
    [x2, y2],
  ]);
  /** @type {Object} */
  event = {
    type: "line",
    color: style.stroke,
    stroke: style.stroke,
    fill: "none",
    width: style.width,
    opacity: style.opacity,
    x1: x1,
    y1: y1,
    x2: x2,
    y2: y2,
    bounds: b,
    length: Math.round(len * 10) / 10,
    analysis: analyzePointPath(
      [
        [x1, y1],
        [x2, y2],
      ],
      b,
      len,
    ),
  };
  event.cost = eventCost(event);
  event.summary = describeEvent(event);
  return event;
}

function normalizeCurve(action) {
  var x1 = clamp(action.x1, 0, 100);
  var y1 = clamp(action.y1, 0, 100);
  var cx = clamp(action.cx, 0, 100);
  var cy = clamp(action.cy, 0, 100);
  var x2 = clamp(action.x2, 0, 100);
  var y2 = clamp(action.y2, 0, 100);
  var len = distance(x1, y1, cx, cy) + distance(cx, cy, x2, y2);
  /** @type {Object} */
  var event;
  var style, b;
  if (len < 2) return null;
  style = normalizedStyle(action, "black", "none");
  if (!style || style.stroke === "none") return null;
  b = pointBounds([
    [x1, y1],
    [cx, cy],
    [x2, y2],
  ]);
  /** @type {Object} */
  event = {
    type: "curve",
    color: style.stroke,
    stroke: style.stroke,
    fill: "none",
    width: style.width,
    opacity: style.opacity,
    x1: x1,
    y1: y1,
    cx: cx,
    cy: cy,
    x2: x2,
    y2: y2,
    bounds: b,
    length: Math.round(len * 10) / 10,
    analysis: analyzePointPath(
      [
        [x1, y1],
        [cx, cy],
        [x2, y2],
      ],
      b,
      len,
    ),
  };
  event.cost = eventCost(event);
  event.summary = describeEvent(event);
  return event;
}

function normalizeShape(action) {
  var x = clamp(action.x, 0, 99);
  var y = clamp(action.y, 0, 99);
  var w = clamp(action.w, 1, 100 - x);
  var h = clamp(action.h, 1, 100 - y);
  /** @type {Object} */
  var event;
  var style, b, shape;
  if (Math.max(w, h) < 2) return null;
  style = normalizedStyle(action, "black", "none");
  if (!style) return null;
  shape = safeShape(action.shape);
  b = { x: x, y: y, width: w, height: h, cx: x + w / 2, cy: y + h / 2 };
  /** @type {Object} */
  event = {
    type: "shape",
    shape: shape,
    stroke: style.stroke,
    fill: style.fill,
    width: clamp(style.width, 0, 14),
    opacity: style.opacity,
    x: x,
    y: y,
    w: w,
    h: h,
    bounds: b,
    analysis: {
      shapeClass: shape,
      direction: w >= h ? "left-to-right" : "top-to-bottom",
      gridPath: gridBounds(b),
      bboxGrid: gridBounds(b),
      startCell: gridCell(x, y),
      endCell: gridCell(x + w, y + h),
      complexity: "low",
      closedness: "outlined",
    },
  };
  if (event.fill === "none" && event.width <= 0) event.width = 2;
  if (event.fill !== "none") event.analysis.closedness = "filled";
  event.cost = eventCost(event);
  event.summary = describeEvent(event);
  return event;
}

function normalizePolygon(action) {
  var points = parsePoints(action.points, 8);
  var style = normalizedStyle(action, "black", "none");
  var b, len;
  /** @type {Object} */
  var event;
  if (!points || points.length < 3 || !style) return null;
  b = pointBounds(points);
  len = strokeLength(points.concat([points[0]]));
  if (Math.max(b.width, b.height) < 2) return null;
  /** @type {Object} */
  event = {
    type: "polygon",
    stroke: style.stroke,
    fill: style.fill,
    width: clamp(style.width, 0, 14),
    opacity: style.opacity,
    points: points,
    pointText: pointsToString(points),
    pointCount: points.length,
    bounds: b,
    length: Math.round(len * 10) / 10,
    analysis: {
      shapeClass: points.length === 3 ? "triangle polygon" : "polygon",
      direction: b.width >= b.height ? "left-to-right" : "top-to-bottom",
      gridPath: compactCells(points, 8),
      bboxGrid: gridBounds(b),
      startCell: gridCell(points[0][0], points[0][1]),
      endCell: gridCell(
        points[points.length - 1][0],
        points[points.length - 1][1],
      ),
      complexity: points.length > 5 ? "medium" : "low",
      closedness: style.fill !== "none" ? "filled" : "outlined",
    },
  };
  if (event.fill === "none" && event.stroke === "none") return null;
  if (event.stroke !== "none" && event.width <= 0) event.width = 1;
  event.cost = eventCost(event);
  event.summary = describeEvent(event);
  return event;
}

function normalizeDot(action) {
  var x = clamp(action.x, 0, 100);
  var y = clamp(action.y, 0, 100);
  var r = clamp(action.r === undefined ? 3 : action.r, 1, 12);
  var style = normalizedStyle(
    action,
    "black",
    action.fill === undefined ? "black" : "none",
  );
  var b;
  /** @type {Object} */
  var event;
  if (!style) return null;
  b = {
    x: Math.max(0, x - r),
    y: Math.max(0, y - r),
    width: Math.min(100, x + r) - Math.max(0, x - r),
    height: Math.min(100, y + r) - Math.max(0, y - r),
    cx: x,
    cy: y,
  };
  /** @type {Object} */
  event = {
    type: "dot",
    stroke: style.stroke,
    fill: style.fill,
    width: clamp(style.width, 0, 10),
    opacity: style.opacity,
    x: x,
    y: y,
    r: r,
    bounds: b,
    analysis: {
      shapeClass: "dot",
      direction: "point mark",
      gridPath: gridCell(x, y),
      bboxGrid: gridBounds(b),
      startCell: gridCell(x, y),
      endCell: gridCell(x, y),
      complexity: "low",
      closedness: style.fill !== "none" ? "filled" : "outlined",
    },
  };
  if (event.fill === "none" && event.stroke === "none") return null;
  if (event.stroke !== "none" && event.width <= 0) event.width = 1;
  event.cost = eventCost(event);
  event.summary = describeEvent(event);
  return event;
}

function sizePhrase(bounds) {
  var major = Math.max(bounds.width, bounds.height);
  if (major >= 65) return "huge";
  if (major >= 40) return "large";
  if (major >= 20) return "medium";
  if (major >= 8) return "small";
  return "tiny";
}

function widthPhrase(width) {
  if (width >= 14) return "very thick";
  if (width >= 8) return "thick";
  if (width >= 3) return "medium";
  return "thin";
}

function positionPhrase(bounds) {
  var vertical = bounds.cy < 33 ? "upper" : bounds.cy > 67 ? "lower" : "middle";
  var horizontal =
    bounds.cx < 33 ? "left" : bounds.cx > 67 ? "right" : "center";
  if (vertical === "middle" && horizontal === "center") return "center";
  return vertical + "-" + horizontal;
}

function directionPhrase(event) {
  return directionFromDelta(event.x2 - event.x1, event.y2 - event.y1);
}

function boundsOverlap(a, b, pad) {
  return (
    a.x <= b.x + b.width + pad &&
    a.x + a.width + pad >= b.x &&
    a.y <= b.y + b.height + pad &&
    a.y + a.height + pad >= b.y
  );
}

function relationPhrase(event, previousEvents) {
  var i, other, d;
  for (i = previousEvents.length - 1; i >= 0; i--) {
    other = previousEvents[i];
    if (!other?.bounds || other.id === event.id) continue;
    if (boundsOverlap(event.bounds, other.bounds, 0))
      return "overlapping layer #" + other.id;
    if (boundsOverlap(event.bounds, other.bounds, 4))
      return "touching or near layer #" + other.id;
    d = distance(
      event.bounds.cx,
      event.bounds.cy,
      other.bounds.cx,
      other.bounds.cy,
    );
    if (d < 13) return "near layer #" + other.id;
  }
  return "";
}

function eventGeometryPhrase(event) {
  var a = event.analysis || {};
  var grid = a.gridPath || gridBounds(event.bounds);
  var bbox = a.bboxGrid || gridBounds(event.bounds);
  var shape = a.shapeClass || event.type;
  if (event.type === "stroke") {
    var tool =
      event.tool === "eraser" ? "eraser mark" : event.color + " freehand mark";
    return (
      widthPhrase(event.width) +
      " " +
      tool +
      "; " +
      shape +
      "; path " +
      grid +
      "; bbox " +
      bbox +
      "; " +
      (a.direction || "unknown direction")
    );
  }
  if (event.type === "line") {
    return (
      widthPhrase(event.width) +
      " " +
      event.color +
      " line; " +
      shape +
      "; path " +
      grid +
      "; bbox " +
      bbox +
      "; " +
      (a.direction || directionPhrase(event))
    );
  }
  if (event.type === "curve") {
    return (
      widthPhrase(event.width) +
      " " +
      event.color +
      " quadratic curve; " +
      shape +
      "; path " +
      grid +
      "; bbox " +
      bbox +
      "; " +
      (a.direction || directionPhrase(event))
    );
  }
  if (event.type === "shape") {
    var fill = event.fill === "none" ? "unfilled" : event.fill + " filled";
    return (
      sizePhrase(event.bounds) +
      " " +
      fill +
      " " +
      event.shape +
      " with " +
      event.stroke +
      " outline; bbox " +
      bbox +
      "; center " +
      gridCell(event.bounds.cx, event.bounds.cy)
    );
  }
  if (event.type === "polygon") {
    var pfill = event.fill === "none" ? "unfilled" : event.fill + " filled";
    return (
      sizePhrase(event.bounds) +
      " " +
      pfill +
      " polygon with " +
      event.pointCount +
      " points and " +
      event.stroke +
      " outline; path " +
      grid +
      "; bbox " +
      bbox
    );
  }
  if (event.type === "dot") {
    var dfill = event.fill === "none" ? "unfilled" : event.fill + " filled";
    return (
      sizePhrase(event.bounds) +
      " " +
      dfill +
      " dot with " +
      event.stroke +
      " outline at " +
      gridCell(event.x, event.y) +
      "; bbox " +
      bbox
    );
  }
  if (event.type === "svg_layer") {
    var colors = event.colors?.length ? event.colors.join("/") : "no color";
    return (
      "SVG layer; " +
      (event.layerSummary || "simple shape") +
      "; colors " +
      colors +
      "; bbox " +
      bbox
    );
  }
  return "drawing mark";
}

function describeEvent(event) {
  var layer = event.id ? "layer #" + event.id + ": " : "";
  var relation = event.relation ? ", " + event.relation : "";
  return (
    layer +
    eventGeometryPhrase(event) +
    "; area " +
    sizePhrase(event.bounds) +
    " at " +
    positionPhrase(event.bounds) +
    relation
  );
}

function refreshEventSummary(event, previousEvents) {
  event.relation = relationPhrase(event, previousEvents || []);
  event.summary = describeEvent(event);
  return event;
}

function addDrawAction(state, playerId, action) {
  var result, events, s, i, event, groupId;
  if (state.phase !== "draw") return state;
  result = normalizeDrawActionResult(action, state.prompt);
  events = result.events;
  if (!events) {
    s = clone(state);
    s.lastDrawError = result.error || "Invalid draw action.";
    s.lastEvent = "Draw rejected: " + s.lastDrawError;
    s.actionCount += 1;
    return s;
  }
  s = clone(state);
  s.lastDrawError = null;
  s.groupSeq = (s.groupSeq || 0) + 1;
  groupId = s.groupSeq;
  for (i = 0; i < events.length; i++) {
    s.eventSeq += 1;
    event = events[i];
    event.id = s.eventSeq;
    event.groupId = groupId;
    event = refreshEventSummary(event, s.drawEvents);
    s.drawEvents.push(event);
    s.geometryLog.push(event.summary);
  }
  s.lastEvent =
    "The drawer added " +
    events.length +
    " drawing layer" +
    (events.length === 1 ? "" : "s") +
    ".";
  s.actionCount += 1;
  return s;
}

function addDrawParts(state, playerId, action) {
  return addDrawAction(state, playerId, action);
}

function undoDraw(state, playerId) {
  var s, removed, groupId, count;
  if (
    state.phase !== "draw" ||
    playerId !== currentDrawer(state) ||
    state.drawEvents.length === 0
  )
    return state;
  s = clone(state);
  removed = s.drawEvents.pop();
  groupId = removed.groupId || removed.id;
  count = 1;
  while (
    s.drawEvents.length > 0 &&
    (s.drawEvents[s.drawEvents.length - 1].groupId ||
      s.drawEvents[s.drawEvents.length - 1].id) === groupId
  ) {
    s.drawEvents.pop();
    count += 1;
  }
  s.geometryLog.push(
    "Undo removed " + count + " drawing layer" + (count === 1 ? "" : "s") + ".",
  );
  s.lastEvent = "The drawer undid the latest drawing layer.";
  s.lastDrawError = null;
  s.actionCount += 1;
  return s;
}

function normalizeGuess(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function singularize(value) {
  if (value.length > 3 && value.slice(-3) === "ies")
    return value.slice(0, -3) + "y";
  if (value.length > 3 && value.slice(-2) === "es") return value.slice(0, -2);
  if (value.length > 2 && value.slice(-1) === "s") return value.slice(0, -1);
  return value;
}

function isCorrectGuess(guess, prompt) {
  var g = normalizeGuess(guess);
  var p = normalizeGuess(prompt);
  var list, i, a;
  if (!g || !p) return false;
  if (g === p || singularize(g) === p || g === p + "s" || g === p + "es")
    return true;
  list = ALIASES[p] || [];
  for (i = 0; i < list.length; i++) {
    a = normalizeGuess(list[i]);
    if (g === a || singularize(g) === a) return true;
  }
  return false;
}

function hasGuessedNormalized(state, playerId, normalizedGuess) {
  var i, g;
  if (!normalizedGuess) return false;
  for (i = 0; i < state.guessLog.length; i++) {
    g = state.guessLog[i];
    if (g.playerId === playerId && normalizeGuess(g.text) === normalizedGuess)
      return true;
  }
  return false;
}

function validateGuessAction(state, playerId, action) {
  var text = cleanString(action?.text, 40);
  var normalized = normalizeGuess(text);
  if (!isGamePlayerId(state, playerId))
    return {
      ok: false,
      error: "You are not a player in this game.",
      code: "NOT_PLAYER",
    };
  if (state.phase !== "draw")
    return {
      ok: false,
      error: "Guesses are only allowed while a drawing round is active.",
      code: "WRONG_PHASE",
    };
  if (playerId === currentDrawer(state))
    return {
      ok: false,
      error: "The drawer cannot guess their own word.",
      code: "DRAWER_CANNOT_GUESS",
    };
  if (state.solved[playerId])
    return {
      ok: false,
      error: "You already guessed the word this round.",
      code: "ALREADY_SOLVED",
    };
  if ((state.guessCounts[playerId] || 0) >= GUESS_LIMIT)
    return {
      ok: false,
      error: "You are out of guesses this round.",
      code: "NO_GUESSES_LEFT",
    };
  if (!text || !normalized)
    return {
      ok: false,
      error: "Enter a guess before submitting.",
      code: "EMPTY_GUESS",
    };
  if (hasGuessedNormalized(state, playerId, normalized)) {
    return {
      ok: false,
      error:
        'You already guessed "' +
        text +
        '" this drawing round. Try a different word.',
      code: "DUPLICATE_GUESS",
    };
  }
  return { ok: true, text: text, normalized: normalized };
}

function guessScore(state) {
  var marks = state.drawEvents.length;
  if (marks < 12) return 1200;
  if (marks < 28) return 1000;
  if (marks < 48) return 800;
  return 650;
}

function enterDiscussion(state, reason) {
  var s = clone(state);
  var drawer = currentDrawer(s);
  if (allGuessersSolved(s) && !s.bonusAwarded) {
    s.scores[drawer] += 300;
    s.roundScores[drawer] = (s.roundScores[drawer] || 0) + 300;
    s.bonusAwarded = true;
  }
  s.phase = "discussion";
  s.lastEvent = reason || "The answer is revealed.";
  s.actionCount += 1;
  return s;
}

function applyGuess(state, playerId, action) {
  var s, text, correct, score, drawer, validation;
  validation = validateGuessAction(state, playerId, action);
  if (!validation.ok) {
    if (validation.code === "DUPLICATE_GUESS") {
      s = clone(state);
      s.lastEvent = playerName(s, playerId) + " repeated a previous guess.";
      s.actionCount += 1;
      return s;
    }
    return state;
  }
  text = validation.text;
  s = clone(state);
  s.guessCounts[playerId] = (s.guessCounts[playerId] || 0) + 1;
  correct = isCorrectGuess(text, s.prompt);
  s.guessLog.push({ playerId: playerId, text: text, correct: correct });
  if (correct) {
    score = guessScore(s);
    drawer = currentDrawer(s);
    s.solved[playerId] = { score: score, mark: s.drawEvents.length };
    s.scores[playerId] += score;
    s.scores[drawer] += Math.floor(score / 2);
    s.roundScores[playerId] = (s.roundScores[playerId] || 0) + score;
    s.roundScores[drawer] =
      (s.roundScores[drawer] || 0) + Math.floor(score / 2);
    s.lastEvent = playerName(s, playerId) + " guessed it.";
    if (allGuessersSolved(s))
      return enterDiscussion(s, "Everyone guessed it early.");
    s.actionCount += 1;
    return s;
  }
  s.lastEvent = playerName(s, playerId) + " guessed.";
  s.actionCount += 1;
  return s;
}

function passGuess(state, playerId) {
  var s;
  if (playerId === currentDrawer(state) || state.solved[playerId]) return state;
  if ((state.guessCounts[playerId] || 0) >= GUESS_LIMIT) return state;
  s = clone(state);
  s.guessCounts[playerId] = (s.guessCounts[playerId] || 0) + 1;
  s.lastEvent = playerName(s, playerId) + " passed a guess.";
  s.actionCount += 1;
  return s;
}

function advanceFromDraw(state, solvedMessage, completeMessage, nextMessage) {
  var s;
  if (allGuessersSolved(state)) return enterDiscussion(state, solvedMessage);
  if (state.roundIndex + 1 >= state.maxRounds) {
    s = clone(state);
    s.phase = "gameOverDisplay";
    s.lastEvent = completeMessage;
    s.actionCount += 1;
    return s;
  }
  s = startRoundFrom(
    state,
    state.roundIndex + 1,
    (state.drawerIndex + 1) % state.players.length,
  );
  s.lastEvent = nextMessage;
  return s;
}

function finishDrawing(state, playerId) {
  if (state.phase !== "draw" || playerId !== currentDrawer(state)) return state;
  return advanceFromDraw(
    state,
    "Everyone guessed it before the drawing turn ended.",
    "The drawing turn ended. All sketches are complete.",
    "The drawing turn ended. The next drawer starts.",
  );
}

function handleTimer(state, timer) {
  var s, timerId, phase, roundIndex;
  if (timer && typeof timer === "object") {
    timerId = timer.timerId || (timer.type === "finalize" ? "finalize" : null);
    phase = timer.phase;
    roundIndex = timer.roundIndex;
  } else {
    timerId = timer;
    phase = null;
    roundIndex = null;
  }
  if (phase !== null && phase !== undefined && phase !== state.phase)
    return state;
  if (
    roundIndex !== null &&
    roundIndex !== undefined &&
    roundIndex !== state.roundIndex
  )
    return state;
  if (state.phase === "draw" && timerId === "draw") {
    return advanceFromDraw(
      state,
      "Everyone guessed it before time ran out.",
      "Time is up. All sketches are complete.",
      "Time is up. The next drawer starts.",
    );
  }
  if (state.phase === "discussion" && timerId === "discussion") {
    if (state.roundIndex + 1 >= state.maxRounds) {
      s = clone(state);
      s.phase = "gameOverDisplay";
      s.lastEvent = "All sketches are complete.";
      s.actionCount += 1;
      return s;
    }
    return startRoundFrom(
      state,
      state.roundIndex + 1,
      (state.drawerIndex + 1) % state.players.length,
    );
  }
  if (
    state.phase === "gameOverDisplay" &&
    (timerId === "gameOverDisplay" || timerId === "finalize")
  ) {
    s = clone(state);
    s.phase = "gameOver";
    s.lastEvent = "Game over.";
    s.actionCount += 1;
    return s;
  }
  return state;
}

function drawActionTemplates() {
  return [
    {
      decision: {
        type: "draw_svg_layer",
        svg: '<ellipse cx="50" cy="50" rx="24" ry="18" fill="red" stroke="darkred" stroke-width="2"/><path d="M30 62 Q50 78 70 62" fill="none" stroke="black" stroke-width="2"/>',
      },
      label: "draw_svg_layer(svg=<svg-fragment>)",
      schema: {
        fields: {
          svg: {
            kind: "string",
            freeText: true,
            minLength: 8,
            maxLength: DRAW_SVG_MAX,
          },
        },
      },
    },
  ];
}

function humanDrawActionTemplates() {
  return [
    {
      decision: {
        type: "draw_stroke",
        points: "20,20 80,80",
        stroke: "black",
        width: 4,
      },
      label: "draw_stroke(points=<x,y path>)",
      schema: {
        fields: {
          points: {
            kind: "string",
            freeText: true,
            minLength: 7,
            maxLength: 900,
          },
          stroke: { kind: "enum", values: DRAW_STROKES.slice() },
          width: { kind: "enum", values: DRAW_WIDTHS.slice() },
        },
      },
    },
  ];
}

function drawSurfaceFromContext(context) {
  return context && context.surface === "agent" ? "agent" : "human";
}

function legalDrawActions(state, playerId, surface) {
  var actions = [];
  var templates =
    surface === "agent" ? drawActionTemplates() : humanDrawActionTemplates();
  var action, events, i;
  if (playerId !== currentDrawer(state) || state.phase !== "draw")
    return actions;
  for (i = 0; i < templates.length; i++) {
    action = templates[i];
    events = normalizeDrawAction(decisionFromOption(action), state.prompt);
    if (events) actions.push(action);
  }
  if (state.drawEvents.length > 0) actions.push({ type: "undo_draw" });
  return actions;
}

function legalGuessActions(state, playerId) {
  if (!isGamePlayerId(state, playerId)) return [];
  if (playerId === currentDrawer(state)) return [];
  if (state.phase !== "draw") return [];
  if (state.solved[playerId]) return [];
  if ((state.guessCounts[playerId] || 0) >= GUESS_LIMIT) return [];
  return [
    {
      decision: { type: "guess", text: "shape" },
      label: "guess(text=<text>)",
      schema: {
        fields: {
          text: { kind: "string", freeText: true, minLength: 1, maxLength: 40 },
        },
      },
      required: false,
    },
  ];
}

function legalActions(state, playerId, surface) {
  if (!isGamePlayerId(state, playerId)) return [];
  if (state.phase === "draw") {
    if (playerId === currentDrawer(state))
      return legalDrawActions(state, playerId, surface || "human");
    return legalGuessActions(state, playerId);
  }
  return [];
}

function decisionFromOption(option) {
  if (
    option &&
    typeof option === "object" &&
    option.decision !== undefined &&
    (option.schema !== undefined ||
      option.label !== undefined ||
      option.required !== undefined)
  ) {
    return option.decision;
  }
  return option;
}

function promptBlanks(prompt) {
  var out = [];
  for (var i = 0; i < prompt.length; i++) out.push("_");
  return out.join(" ");
}

function phaseTimeoutMsFor(state) {
  if (state.phase === "draw") return DRAW_TIMEOUT_MS;
  if (state.phase === "discussion") return DISCUSSION_TIMEOUT_MS;
  if (state.phase === "gameOverDisplay") return 5000;
  return null;
}

function phaseDefaultActionFor(state) {
  if (state.phase === "draw")
    return {
      type: "advance_phase",
      timerId: "draw",
      phase: "draw",
      roundIndex: state.roundIndex,
    };
  if (state.phase === "discussion")
    return {
      type: "advance_phase",
      timerId: "discussion",
      phase: "discussion",
      roundIndex: state.roundIndex,
    };
  if (state.phase === "gameOverDisplay")
    return {
      type: "finalize",
      timerId: "finalize",
      phase: "gameOverDisplay",
      roundIndex: state.roundIndex,
    };
  return null;
}

function chatMemberships(channels) {
  return channels.indexOf("spectator") !== -1 ? ["spectator"] : [];
}

function chatConfig(channels, defaultChannel) {
  return {
    channels: channels.slice(),
    defaultChannel: defaultChannel,
    canSend: channels.length > 0,
    memberships: chatMemberships(channels),
  };
}

function chatOpportunity(channel) {
  return {
    id: "chat:" + channel,
    kind: "chat",
    prompt: "Chat in " + channel + ".",
    visibility: "private",
    priority: 0,
    decision: { type: "none" },
    chat: chatConfig([channel], channel),
    submitPolicy: "multiple",
  };
}

function publicSolved(state) {
  var out = {};
  var p;
  for (p in state.solved)
    out[playerName(state, p)] = {
      solved: true,
      score: state.solved[p].score,
      mark: state.solved[p].mark,
    };
  return out;
}

function visibleGuessLog(state, reveal, viewerId) {
  var out = [];
  var i, g;
  for (i = 0; i < state.guessLog.length; i++) {
    g = state.guessLog[i];
    out.push({
      player: playerName(state, g.playerId),
      isYou: g.playerId === viewerId,
      text: reveal || !g.correct || g.playerId === viewerId ? g.text : null,
      correct: reveal ? g.correct : g.correct && g.playerId === viewerId,
      guessedIt: g.correct,
    });
  }
  return out.slice(-20);
}

function winnerResult(state) {
  var best = -1;
  var winners = [];
  var winnerNames = [];
  var i, pid, score;
  for (i = 0; i < state.players.length; i++) {
    pid = state.players[i];
    score = state.scores[pid] || 0;
    if (score > best) {
      best = score;
      winners = [pid];
    } else if (score === best) {
      winners.push(pid);
    }
  }
  for (i = 0; i < winners.length; i++)
    winnerNames.push(playerName(state, winners[i]));
  return {
    winners: winners,
    winnerNames: winnerNames,
    summary:
      winners.length === 1
        ? winnerNames[0] + " wins Sketchcode with " + best + " points."
        : "Tie game at " + best + " points.",
  };
}

function canvasSummary(state) {
  var rows = [];
  var events = state.drawEvents;
  rows.push(
    "Layer order: later numbered SVG layers are on top of earlier layers.",
  );
  if (events.length === 0) rows.push("(blank canvas)");
  for (var i = 0; i < events.length; i++) rows.push(events[i].summary);
  return rows;
}

function unionBounds(a, b) {
  var x1 = Math.min(a.x, b.x);
  var y1 = Math.min(a.y, b.y);
  var x2 = Math.max(a.x + a.width, b.x + b.width);
  var y2 = Math.max(a.y + a.height, b.y + b.height);
  return {
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1,
    cx: (x1 + x2) / 2,
    cy: (y1 + y2) / 2,
  };
}

function componentClusterPhrase(bounds) {
  if (bounds.width > bounds.height * 1.7) return "broad left-to-right cluster";
  if (bounds.height > bounds.width * 1.7) return "tall top-to-bottom cluster";
  if (Math.max(bounds.width, bounds.height) < 12) return "tight small cluster";
  return "compact central cluster";
}

function findParent(parent, i) {
  while (parent[i] !== i) {
    parent[i] = parent[parent[i]];
    i = parent[i];
  }
  return i;
}

function unionParent(parent, a, b) {
  var pa = findParent(parent, a);
  var pb = findParent(parent, b);
  if (pa !== pb) parent[pb] = pa;
}

function eventColorKey(event) {
  if (event.type === "svg_layer")
    return event.colors?.length ? event.colors[0] : "unknown";
  if (
    event.type === "shape" ||
    event.type === "polygon" ||
    event.type === "dot"
  )
    return event.fill !== "none" ? event.fill : event.stroke;
  return event.color || "black";
}

function visibleRelationPhrase(event, index, events) {
  var i, other, d;
  for (i = index - 1; i >= 0; i--) {
    other = events[i];
    if (!other?.bounds) continue;
    if (boundsOverlap(event.bounds, other.bounds, 0))
      return "overlaps layer " + (i + 1);
    if (boundsOverlap(event.bounds, other.bounds, 4))
      return "touches or is near layer " + (i + 1);
    d = distance(
      event.bounds.cx,
      event.bounds.cy,
      other.bounds.cx,
      other.bounds.cy,
    );
    if (d < 13) return "near layer " + (i + 1);
  }
  return "detached from earlier layers";
}

function componentLabel(index) {
  if (index < 26) return String.fromCharCode(65 + index);
  return "Z" + (index - 25);
}

function compactNumberRanges(values) {
  var parts = [];
  var i = 0;
  var start, end;
  while (i < values.length) {
    start = values[i];
    end = start;
    while (i + 1 < values.length && values[i + 1] === end + 1) {
      i += 1;
      end = values[i];
    }
    parts.push(start === end ? String(start) : start + "-" + end);
    i += 1;
  }
  return parts.join(",");
}

function buildCanvasModel(events) {
  var parent = [];
  var rootOrder = [];
  var rootToComp = {};
  var comps = [];
  var layerDescriptions = [];
  var componentDescriptions = [];
  var i, j, root, comp, event, label, colors, colorList, layers, layerText;
  for (i = 0; i < events.length; i++) parent[i] = i;
  for (i = 0; i < events.length; i++) {
    for (j = i + 1; j < events.length; j++) {
      if (
        boundsOverlap(events[i].bounds, events[j].bounds, 5) ||
        distance(
          events[i].bounds.cx,
          events[i].bounds.cy,
          events[j].bounds.cx,
          events[j].bounds.cy,
        ) < 12
      ) {
        unionParent(parent, i, j);
      }
    }
  }
  for (i = 0; i < events.length; i++) {
    root = findParent(parent, i);
    if (rootToComp[root] === undefined) {
      rootToComp[root] = comps.length;
      rootOrder.push(root);
      comps.push({
        label: componentLabel(comps.length),
        layers: [],
        bounds: null,
        colors: {},
      });
    }
    comp = comps[rootToComp[root]];
    comp.layers.push(i + 1);
    comp.bounds = comp.bounds
      ? unionBounds(comp.bounds, events[i].bounds)
      : clone(events[i].bounds);
    comp.colors[eventColorKey(events[i])] = true;
  }
  for (i = 0; i < events.length; i++) {
    root = findParent(parent, i);
    comp = comps[rootToComp[root]];
    event = events[i];
    layerDescriptions.push(
      "layer " +
        (i + 1) +
        " (id " +
        event.id +
        ", component " +
        comp.label +
        "): " +
        eventGeometryPhrase(event) +
        "; " +
        visibleRelationPhrase(event, i, events),
    );
  }
  for (i = 0; i < comps.length; i++) {
    comp = comps[i];
    colors = Object.keys(comp.colors);
    colorList = colors.length ? colors.join("/") : "unknown color";
    layers = compactNumberRanges(comp.layers);
    layerText =
      comp.layers.length === 1 ? "layer " + layers : "layers " + layers;
    componentDescriptions.push(
      "component " +
        comp.label +
        ": " +
        layerText +
        "; " +
        comp.layers.length +
        " connected layer" +
        (comp.layers.length === 1 ? "" : "s") +
        "; colors " +
        colorList +
        "; bbox " +
        gridBounds(comp.bounds) +
        "; " +
        componentClusterPhrase(comp.bounds),
    );
  }
  return {
    summary:
      events.length === 0
        ? "blank 100x100 SVG canvas"
        : events.length +
          " SVG layer" +
          (events.length === 1 ? "" : "s") +
          " in " +
          comps.length +
          " connected component" +
          (comps.length === 1 ? "" : "s") +
          " on a 100x100 SVG canvas",
    layers: layerDescriptions,
    components: componentDescriptions,
  };
}

function canonicalPointList(points) {
  var out = [];
  for (var i = 0; i < points.length; i++)
    out.push(gridCell(points[i][0], points[i][1]));
  return out.join(",");
}

function styleAttributes(fill, stroke, width) {
  var text = "";
  if (fill !== undefined) text += " fill=" + fill;
  if (stroke !== undefined) text += " stroke=" + stroke;
  if (width !== undefined) text += " width=" + width;
  return text;
}

function eventCanonicalPart(event) {
  if (!event) return "none";
  if (event.type === "svg_layer") {
    return (
      "svg_layer " +
      (event.layerSummary || "simple SVG shape") +
      " colors=" +
      (event.colors?.length ? event.colors.join(",") : "none") +
      " bbox=" +
      gridBounds(event.bounds)
    );
  }
  if (event.type === "stroke") {
    return (
      "stroke path=" +
      (event.analysis?.gridPath || event.pointText || "freehand") +
      styleAttributes(undefined, event.stroke || event.color, event.width)
    );
  }
  if (event.type === "shape") {
    return (
      event.shape +
      " box=" +
      gridBounds(event.bounds) +
      styleAttributes(event.fill, event.stroke, event.width)
    );
  }
  if (event.type === "line") {
    return (
      "line from=" +
      gridCell(event.x1, event.y1) +
      " to=" +
      gridCell(event.x2, event.y2) +
      styleAttributes(undefined, event.stroke, event.width)
    );
  }
  if (event.type === "curve") {
    return (
      "curve from=" +
      gridCell(event.x1, event.y1) +
      " ctrl=" +
      gridCell(event.cx, event.cy) +
      " to=" +
      gridCell(event.x2, event.y2) +
      styleAttributes(undefined, event.stroke, event.width)
    );
  }
  if (event.type === "polygon") {
    return (
      "poly points=" +
      canonicalPointList(event.points) +
      styleAttributes(event.fill, event.stroke, event.width)
    );
  }
  if (event.type === "dot") {
    return (
      "dot at=" +
      gridCell(event.x, event.y) +
      styleAttributes(event.fill, event.stroke, event.width)
    );
  }
  return event.summary || event.type;
}

function acceptedDrawingLedger(events) {
  var out = [];
  var start = Math.max(0, events.length - 8);
  var i;
  if (events.length === 0) return ["none - no SVG layers accepted yet"];
  for (i = start; i < events.length; i++)
    out.push("#" + (i + 1) + " " + eventCanonicalPart(events[i]));
  return out;
}

function acceptedDrawingNote(events) {
  if (events.length === 0) return "no accepted drawing actions yet";
  if (events.length > 8)
    return "showing latest 8 of " + events.length + " accepted SVG layers";
  return (
    "showing all " +
    events.length +
    " accepted SVG layer" +
    (events.length === 1 ? "" : "s")
  );
}

function colorListFromEvents(events) {
  var seen = {};
  var out = [];
  var i, color;
  for (i = 0; i < events.length; i++) {
    color = eventColorKey(events[i]);
    if (color && !seen[color]) {
      seen[color] = true;
      out.push(color);
    }
  }
  return out;
}

function typeListFromEvents(events) {
  var seen = {};
  var out = [];
  var i, type;
  for (i = 0; i < events.length; i++) {
    type =
      events[i].type === "svg_layer"
        ? "svg_layer"
        : events[i].type === "shape"
          ? events[i].shape
          : events[i].type === "polygon"
            ? "poly"
            : events[i].type;
    if (type && !seen[type]) {
      seen[type] = true;
      out.push(type);
    }
  }
  return out;
}

function eventsUnionBounds(events) {
  var bounds = null;
  for (var i = 0; i < events.length; i++)
    bounds = bounds
      ? unionBounds(bounds, events[i].bounds)
      : clone(events[i].bounds);
  return bounds;
}

function drawerCanvasFacts(events) {
  var colors = colorListFromEvents(events);
  var types = typeListFromEvents(events);
  var bounds = eventsUnionBounds(events);
  return [
    "visible drawing layers: " + events.length,
    "colors used: " + (colors.length ? colors.join(", ") : "none"),
    "primitive types used: " + (types.length ? types.join(", ") : "none"),
    "occupied grid area: " + (bounds ? gridBounds(bounds) : "none"),
  ];
}

function repeatedPartFacts(events) {
  var counts = {};
  var duplicates = [];
  var key, i;
  if (events.length === 0) return ["accepted parts: 0"];
  for (i = 0; i < events.length; i++) {
    key = eventCanonicalPart(events[i]);
    counts[key] = (counts[key] || 0) + 1;
  }
  for (key in counts) {
    if (Object.hasOwn(counts, key) && counts[key] > 1)
      duplicates.push(key + " repeated " + counts[key] + " times");
  }
  if (duplicates.length > 0)
    return duplicates.slice(Math.max(0, duplicates.length - 3));
  return [
    "latest accepted part: " + eventCanonicalPart(events[events.length - 1]),
  ];
}

function drawerLastDrawStatus(state) {
  var last;
  if (state.lastEvent === "The drawer undid the latest drawing layer.") {
    return state.drawEvents.length === 0
      ? "UNDO accepted: the canvas is blank again."
      : "UNDO accepted: the latest drawing layer was removed.";
  }
  if (state.lastDrawError)
    return "REJECTED: " + state.lastDrawError + " No visible layer was added.";
  if (state.drawEvents.length === 0)
    return "No accepted drawing actions yet. You have drawn nothing visible.";
  last = state.drawEvents[state.drawEvents.length - 1];
  return (
    "ACCEPTED latest drawing layer #" +
    state.drawEvents.length +
    ": " +
    eventCanonicalPart(last)
  );
}

function myWrongGuesses(state, playerId) {
  var out = [];
  var seen = {};
  var i, g, text;
  if (!playerId) return out;
  for (i = 0; i < state.guessLog.length; i++) {
    g = state.guessLog[i];
    text = cleanString(g.text, 40).toLowerCase();
    if (g.playerId === playerId && !g.correct && text && !seen[text]) {
      out.push(text);
      seen[text] = true;
    }
  }
  return out;
}

function drawerCanvasProgress(state, canvas) {
  if (state.drawEvents.length === 0)
    return "Blank 100x100 drawing canvas. acceptedLayers=0.";
  return (
    state.drawEvents.length +
    " accepted drawing layer" +
    (state.drawEvents.length === 1 ? "" : "s") +
    ". Latest: " +
    eventCanonicalPart(state.drawEvents[state.drawEvents.length - 1]) +
    "."
  );
}

function drawerRecentGuesses(state) {
  var out = [];
  var i, g, text;
  for (i = 0; i < state.guessLog.length; i++) {
    g = state.guessLog[i];
    if (g.correct) continue;
    text = cleanString(g.text, 40);
    if (!text) continue;
    out.push({ player: playerName(state, g.playerId), text: text });
  }
  return out.slice(-8);
}

function buildAgentView(state, playerId, reveal, isDrawer, isSpectator) {
  var role = isDrawer ? "drawer" : isSpectator ? "spectator" : "guesser";
  var solvedIds = Object.keys(state.solved);
  var solvedNames = [];
  var word = promptBlanks(state.prompt);
  var actions = legalActions(state, playerId, "agent");
  var canvas = buildCanvasModel(state.drawEvents);
  var visibleLayers = canvas.layers.slice(
    Math.max(0, canvas.layers.length - 8),
  );
  var visibleComponents = canvas.components.slice(
    Math.max(0, canvas.components.length - 4),
  );
  /** @type {Object} */
  var out;
  var i;
  for (i = 0; i < solvedIds.length; i++)
    solvedNames.push(playerName(state, solvedIds[i]));
  if (reveal) word = state.prompt;
  if (isDrawer && state.phase === "draw") word = state.prompt;
  out = {
    phase: state.phase,
    round: state.roundIndex + 1 + "/" + state.maxRounds,
    role: role,
    drawer: playerName(state, currentDrawer(state)),
    canvasOwner:
      isDrawer && state.phase === "draw"
        ? "you"
        : playerName(state, currentDrawer(state)),
    word: word,
    wordLength: state.prompt.length,
    marks: state.drawEvents.length,
    scores: scoreView(state),
    solved: solvedNames.length ? solvedNames : "none",
    currentCanvas:
      isDrawer && state.phase === "draw"
        ? "your canvas: " + canvas.summary
        : canvas.summary,
    allVisibleLayerCount: canvas.layers.length,
    visibleLayers: visibleLayers,
    visibleLayerNote:
      canvas.layers.length > visibleLayers.length
        ? "visibleLayers shows the latest " +
          visibleLayers.length +
          " of " +
          canvas.layers.length +
          " layers."
        : null,
    recentVisibleLayers: canvas.layers.slice(
      Math.max(0, canvas.layers.length - 4),
    ),
    connectedComponents: visibleComponents,
    connectedComponentNote:
      canvas.components.length > visibleComponents.length
        ? "connectedComponents shows the latest " +
          visibleComponents.length +
          " of " +
          canvas.components.length +
          " components."
        : null,
    latestChange: state.lastEvent,
    lastDrawError: state.lastDrawError || null,
    myWrongGuesses: myWrongGuesses(state, playerId),
    actionTypes: actions.map(function (a) {
      var decision = decisionFromOption(a);
      return decision?.type ? decision.type : "";
    }),
  };
  if (isDrawer && state.phase === "draw") {
    out.visibleLayers = canvas.layers.slice(
      Math.max(0, canvas.layers.length - 4),
    );
    out.visibleLayerNote =
      "visibleLayers is a short mechanical layer sample. acceptedDrawingLedger lists accepted drawing layers.";
    out.recentVisibleLayers = [];
    out.secretPrompt = state.prompt;
    out.lastDrawStatus = drawerLastDrawStatus(state);
    out.canvasFacts = drawerCanvasFacts(state.drawEvents);
    out.acceptedDrawingLedger = acceptedDrawingLedger(state.drawEvents);
    out.acceptedDrawingNote = acceptedDrawingNote(state.drawEvents);
    out.repeatedPartFacts = repeatedPartFacts(state.drawEvents);
    out.canvasProgress = drawerCanvasProgress(state, canvas);
    out.recentGuesses = drawerRecentGuesses(state);
  }
  if (!isDrawer && !isSpectator && state.phase === "draw") {
    out.guessesRemaining = Math.max(
      0,
      state.solved[playerId]
        ? 0
        : GUESS_LIMIT - (state.guessCounts[playerId] || 0),
    );
    if (actions.length > 0)
      out.guessActions =
        "Alternate between public chat and guess(text): chat about what the drawing looks like, then submit a concrete guess on the next turn.";
  }
  return out;
}

function nextUnusedDrawEvents(state, count, used) {
  var out = [];
  var i, event;
  for (i = 0; i < state.drawEvents.length; i++) {
    event = state.drawEvents[i];
    if (!used[event.id]) {
      used[event.id] = true;
      out.push(event);
      if (out.length >= count) return out;
    }
  }
  return out;
}

function buildAgentIntent(state, isDrawer) {
  return undefined;
}

function gridCellSchemaField() {
  return {
    kind: "string",
    minLength: 2,
    maxLength: 3,
    pattern: GRID_CELL_ACTION_PATTERN,
  };
}

function gridBoxSchemaField() {
  return {
    kind: "string",
    minLength: 2,
    maxLength: 7,
    pattern: GRID_BOX_ACTION_PATTERN,
  };
}

function gridPointListSchemaField() {
  return {
    kind: "string",
    minLength: 8,
    maxLength: 31,
    pattern: GRID_POINT_LIST_ACTION_PATTERN,
  };
}

function enumSchemaField(values) {
  return { kind: "enum", values: values.slice() };
}

function drawActionDescriptor(entry, state, names) {
  var action = entry?.action;
  var result = normalizeDrawActionResult(action, state.prompt);
  var events = result.events;
  var count = events?.length ? events.length : 0;
  var type = action?.type ? action.type : "draw";
  if (!events)
    return (
      (names[entry.playerId] || playerName(state, entry.playerId)) +
      " tried an invalid " +
      type +
      " action: " +
      result.error
    );
  return (
    (names[entry.playerId] || playerName(state, entry.playerId)) +
    " drew " +
    count +
    " drawing layer" +
    (count === 1 ? "" : "s")
  );
}

var GameLogic = {
  rules: {
    visibility: "viewer-specific",
    spectator: "god-view",
    seats: { eliminated: "player-view", disconnected: "player-view" },
  },

  setup: function (ctx) {
    var ids = playerIds(ctx);
    var state = {
      players: ids,
      playerNames: playerNameMap(ctx),
      maxRounds: ids.length * 2,
      scores: initialScores(ids),
      promptOrder: makePromptOrder(ctx.random),
      actionCount: 0,
    };
    return startRoundFrom(state, 0, 0);
  },

  apply: function (state, playerId, action) {
    if (!action?.type) return state;
    if (playerId === "__system__") {
      if (action.type === "advance_phase") return handleTimer(state, action);
      if (action.type === "finalize") return handleTimer(state, action);
      return state;
    }
    if (!isGamePlayerId(state, playerId)) return state;
    if (isStructuredDrawType(action.type)) {
      if (playerId !== currentDrawer(state)) return state;
      return addDrawAction(state, playerId, action);
    }
    if (action.type === "undo_draw") return undoDraw(state, playerId);
    if (action.type === "finish_drawing") return finishDrawing(state, playerId);
    if (action.type === "guess") {
      if (state.phase !== "draw") return state;
      return applyGuess(state, playerId, action);
    }
    if (action.type === "pass_guess") {
      if (state.phase !== "draw") return state;
      return passGuess(state, playerId);
    }
    return state;
  },

  project: function (state, playerId) {
    var isSpectator = playerId === null || !isGamePlayerId(state, playerId);
    var drawer = currentDrawer(state);
    var isDrawer = playerId === drawer;
    var reveal =
      isSpectator ||
      state.phase === "discussion" ||
      state.phase === "gameOverDisplay" ||
      state.phase === "gameOver";
    /** @type {Object} */
    var view;

    view = {
      phase: state.phase,
      round: state.roundIndex + 1,
      maxRounds: state.maxRounds,
      drawerName: playerName(state, drawer),
      canvasOwner:
        isDrawer && state.phase === "draw" ? "you" : playerName(state, drawer),
      canvasOwnership:
        isDrawer && state.phase === "draw"
          ? "You are the drawer. Everything on this canvas is owned by you and was created from your drawing actions."
          : null,
      myName: isSpectator ? "Spectator" : playerName(state, playerId),
      myRole: isDrawer ? "drawer" : isSpectator ? "spectator" : "guesser",
      promptBlanks: reveal ? null : promptBlanks(state.prompt),
      promptLength: state.prompt.length,
      promptVisible: reveal,
      prompt: reveal ? state.prompt : null,
      scores: scoreView(state),
      roundScores: roundScoreView(state),
      solved: publicSolved(state),
      drawEvents: clone(state.drawEvents),
      svgLayers: clone(state.drawEvents),
      geometryLog: state.geometryLog.slice(),
      canvasSummary: canvasSummary(state),
      guessLog: visibleGuessLog(state, reveal, playerId),
      lastEvent: state.lastEvent,
      players: playerNamesList(state),
      layerCount: state.drawEvents.length,
      guessesRemaining:
        !isDrawer && !isSpectator && state.phase === "draw"
          ? Math.max(0, GUESS_LIMIT - (state.guessCounts[playerId] || 0))
          : null,
      markCount: state.drawEvents.length,
      actionCount: state.actionCount,
    };
    if (isDrawer && state.phase === "draw") view.secretPrompt = state.prompt;

    return {
      view: view,
      agentView: buildAgentView(state, playerId, reveal, isDrawer, isSpectator),
      agent: buildAgentIntent(state, isDrawer),
    };
  },

  opportunities: function (state, actorId, context) {
    var actions,
      prompt,
      deadlineAction,
      opportunity,
      surface,
      isDrawer,
      isPlayer,
      chatChannels,
      drawerChatChannels;
    if (actorId === "__system__") {
      deadlineAction = phaseDefaultActionFor(state);
      if (!deadlineAction) return [];
      return [
        {
          id: state.phase + "-deadline-r" + state.roundIndex,
          kind: "phase",
          prompt:
            "Advance the " + state.phase + " phase when its timer expires.",
          visibility: "private",
          priority: 0,
          decision: { type: "none" },
          deadline: {
            id: state.phase + "-r" + state.roundIndex,
            timeoutMs: phaseTimeoutMsFor(state),
            onExpire: deadlineAction,
          },
          submitPolicy: "once",
        },
      ];
    }

    isDrawer = actorId === currentDrawer(state);
    isPlayer = state.players.indexOf(actorId) !== -1;
    chatChannels = ["room", "whisper", "spectator"];
    drawerChatChannels = ["spectator"];
    surface = isDrawer ? drawSurfaceFromContext(context) : "human";
    actions = legalActions(state, actorId, surface);
    if (actions.length === 0) {
      if (isDrawer && isPlayer && state.phase !== "gameOver")
        return drawerChatChannels.map(chatOpportunity);
      if (!isDrawer && isPlayer && state.phase !== "gameOver")
        return chatChannels.map(chatOpportunity);
      return [];
    }
    prompt = isDrawer
      ? surface === "agent"
        ? "Add an SVG drawing layer or undo the latest layer."
        : "Use the drawing controls or undo the latest layer."
      : "Submit a concrete guess for the current drawing.";
    /** @type {Object} */
    opportunity = {
      id: isDrawer ? "draw" : "guess",
      kind: "turn",
      prompt: prompt,
      visibility: "private",
      priority: 0,
      decision: { type: "choose", options: actions },
      chat: isDrawer
        ? chatConfig(drawerChatChannels, "spectator")
        : chatConfig(chatChannels, "room"),
      submitPolicy: "multiple",
    };
    if (isDrawer) return [opportunity];
    return /** @type {Object[]} */ ([opportunity]).concat(
      chatChannels.slice(1).map(chatOpportunity),
    );
  },

  validate: function (state, actorId, decision) {
    if (decision?.type === "guess")
      return validateGuessAction(state, actorId, decision);
    return { ok: true };
  },

  outcome: function (state) {
    var result;
    if (state.phase !== "gameOver") return null;
    result = winnerResult(state);
    if (result.winners.length === 0) {
      return { type: "draw", playerIds: [], summary: result.summary };
    }
    return {
      type: result.winners.length === 1 ? "winners" : "draw",
      playerIds: result.winners,
      summary: result.summary,
    };
  },

  viewLog: function (state, playerId, entries, names) {
    var out = [];
    var used = {};
    var i, j, entry, action, type, actor, batchEvents, parts, drawActionEvents;
    for (i = 0; i < entries.length; i++) {
      entry = entries[i];
      if (!entry || entry.playerId === "__system__") continue;
      action = entry.action || {};
      type = String(action.type || "");
      actor = names[entry.playerId] || playerName(state, entry.playerId);
      if (isStructuredDrawType(type)) {
        drawActionEvents = normalizeDrawActionResult(action, state.prompt);
        if (!drawActionEvents.events) {
          out.push(
            actor +
              " tried to draw, but Sketchcode rejected it: " +
              drawActionEvents.error,
          );
          continue;
        }
        batchEvents = nextUnusedDrawEvents(
          state,
          drawActionEvents.events.length || 1,
          used,
        );
        parts = [];
        for (j = 0; j < batchEvents.length; j++)
          parts.push(batchEvents[j].summary);
        out.push(
          actor +
            " added drawing layer: " +
            (parts.length ? parts.join(" | ") : "drawing layer"),
        );
      } else if (type === "undo_draw") {
        out.push(actor + " removed the latest drawing layer");
      } else if (type === "finish_drawing") {
        out.push(actor + " ended the drawing turn");
      } else if (type === "guess") {
        if (state.solved?.[entry.playerId]) out.push(actor + " guessed it");
        else out.push(actor + " guessed");
      }
    }
    return out;
  },
};

export default GameLogic;
