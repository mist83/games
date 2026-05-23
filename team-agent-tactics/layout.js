/* ===== LAYOUT (1v1 / 2v2 — spectator-aware cell sizing) ===== */
//
// 1v1: Same as before. Own board below, opponent above. Horizontal battle line.
// 2v2: 2x2 grid. Left column = your team, right column = opponents.
//   Bottom-left = YOU, top-left = TEAMMATE, bottom-right = YOUR OPP, top-right = TM's OPP
//   Vertical team divider between columns.

var Layout = {
  internalIsSpectator: false,
  internalIs2v2: false,

  cellSize: function (w, h) {
    if (Layout.internalIs2v2) {
      // 2v2: each board gets half width, 4 rows visible (2 per board pair)
      var halfW = w / 2 - 10;
      var cs2v2 = Math.min(60, (halfW - 30) / 4);
      if (h) cs2v2 = Math.min(cs2v2, Math.floor((h * 0.55) / 4 - 4));
      return Math.max(28, cs2v2);
    }
    if (Layout.internalIsSpectator && h) {
      return Math.max(40, Math.min(Math.floor((h * 0.7) / 4 - 6), 100));
    }
    return Math.min(80, (w - 50) / 4);
  },

  gridOriginX: function (w, h) {
    var cs = Layout.cellSize(w, h);
    if (Layout.internalIs2v2) {
      // Left column origin (your team)
      return (w / 2 - cs * 4 - 18) / 2;
    }
    return (w - cs * 4 - 18) / 2;
  },

  // For 2v2, which column? 'left' = your team, 'right' = opponents
  gridOriginX2v2: function (w, h, column) {
    var cs = Layout.cellSize(w, h);
    var halfW = w / 2;
    var gridW = cs * 4 + 18;
    if (column === "left") {
      return (halfW - gridW) / 2;
    }
    return halfW + (halfW - gridW) / 2;
  },

  cellPos: function (cellIdx, side, w, h) {
    var cs = Layout.cellSize(w, h);
    var gap = 6;
    var col = cellIdx < 4 ? cellIdx : cellIdx - 4;
    var row = cellIdx < 4 ? 0 : 1;
    var ox = Layout.gridOriginX(w, h);
    var x = ox + col * (cs + gap) + cs / 2;
    var midY = Layout.internalIsSpectator ? h * 0.45 : h * 0.42;
    var rowH = cs + gap;
    var y;
    if (side === "own") {
      if (cellIdx < 4) y = midY + 12 + cs / 2;
      else y = midY + 12 + rowH + cs / 2;
    } else {
      if (cellIdx < 4) y = midY - 12 - cs / 2;
      else y = midY - 12 - rowH - cs / 2;
    }
    return { x: x, y: y, size: cs };
  },

  // 2v2 cell position: 4 quadrants
  // quadrant: 'own' (bottom-left), 'opp' (bottom-right), 'tmOwn' (top-left), 'tmOpp' (top-right)
  cellPos2v2: function (cellIdx, quadrant, w, h) {
    var cs = Layout.cellSize(w, h);
    var gap = 4;
    var col = cellIdx < 4 ? cellIdx : cellIdx - 4;
    var row = cellIdx < 4 ? 0 : 1;

    var isLeft = quadrant === "own" || quadrant === "tmOwn";
    var isTop = quadrant === "tmOwn" || quadrant === "tmOpp";
    var ox = Layout.gridOriginX2v2(w, h, isLeft ? "left" : "right");
    var x = ox + col * (cs + gap) + cs / 2;

    // Vertical layout: top pair ~22%-38%, bottom pair ~42%-58% (clear of bench at h-235)
    var topMidY = h * 0.22;
    var botMidY = h * 0.5;
    var midY = isTop ? topMidY : botMidY;
    var rowH = cs + gap;

    var y;
    // "front row" (cells 0-3) closer to the divider line, "back row" (cells 4-7) further
    if (isTop) {
      // Top boards: front row is BELOW (closer to mid), back row is ABOVE
      if (cellIdx < 4) y = midY + cs / 2;
      else y = midY - rowH + cs / 2;
    } else {
      // Bottom boards: front row is ABOVE (closer to mid), back row is BELOW
      if (cellIdx < 4) y = midY - cs / 2;
      else y = midY + rowH - cs / 2;
    }
    return { x: x, y: y, size: cs };
  },

  shopY: function (h) {
    return h - 160;
  },
  benchY: function (h) {
    return h - 235;
  },
  hudY: function () {
    return 6;
  },
  battleLineY: function (h) {
    return Layout.internalIsSpectator ? h * 0.45 : h * 0.42;
  },
  // 2v2: vertical divider X position (center of screen)
  teamDividerX: function (w) {
    return w / 2;
  },
  // 2v2: horizontal lane divider Y positions
  laneDividerY: function (h) {
    return h * 0.45;
  },
};
