/* ===== LAYOUT ENGINE ===== */

var Layout = {
  internalW: 0,
  internalH: 0,

  update: function (w, h) {
    Layout.internalW = w;
    Layout.internalH = h;
  },

  /**
   * Convert percentage of min(w,h) to pixels.
   * @param {number} pct - Percentage of the smaller viewport dimension.
   * @returns {number} Pixel value.
   */
  vmin: function (pct) {
    return (Math.min(Layout.internalW, Layout.internalH) * pct) / 100;
  },

  /**
   * Convert percentage of height to pixels (better for vertical layouts).
   * @param {number} pct - Percentage of viewport height.
   * @returns {number} Pixel value.
   */
  vh: function (pct) {
    return (Layout.internalH * pct) / 100;
  },

  /**
   * Convert percentage of width to pixels.
   * @param {number} pct - Percentage of viewport width.
   * @returns {number} Pixel value.
   */
  vw: function (pct) {
    return (Layout.internalW * pct) / 100;
  },

  /**
   * Whether we're in portrait mode.
   * @returns {boolean} True when height exceeds width.
   */
  isPortrait: function () {
    return Layout.internalH > Layout.internalW;
  },

  /**
   * Felt center x coordinate.
   * @returns {number} Felt center x coordinate.
   */
  feltCX: function () {
    return Layout.internalW / 2;
  },
  /**
   * Felt center y coordinate, shifted up to make room for cards + buttons.
   * @returns {number} Felt center y coordinate.
   */
  feltCY: function () {
    return Layout.internalH * 0.36;
  },
  /**
   * Felt horizontal radius.
   * @returns {number} Felt horizontal radius.
   */
  feltRX: function () {
    /* Width: fill most of the screen width but cap on portrait */
    if (Layout.isPortrait()) return Layout.internalW * 0.44;
    return Layout.internalW * 0.42;
  },
  /**
   * Felt vertical radius.
   * @returns {number} Felt vertical radius.
   */
  feltRY: function () {
    /* Height: shorter to create the stadium shape.
       On portrait, nearly circular. On landscape, flatter. */
    if (Layout.isPortrait()) {
      return Math.min(Layout.internalH * 0.22, Layout.internalW * 0.38);
    }
    return Layout.internalH * 0.28;
  },

  /**
   * Compute player seat position around the ellipse.
   * seatIndex 0 = local player (bottom center), counting clockwise.
   * @param {number} seatIndex - Seat index around the table.
   * @param {number} totalSeats - Total seats at the table.
   * @returns {{ x: number, y: number }} Seat center position.
   */
  seatPos: function (seatIndex, totalSeats) {
    var angle = (seatIndex / totalSeats) * 2 * Math.PI + Math.PI / 2;
    /* Use actual felt dimensions + slight offset so seats orbit just outside the rail */
    var cx = Layout.feltCX();
    var cy = Layout.feltCY();
    var rx = Layout.feltRX() * 1.08;
    var ry = Layout.feltRY() * 1.15;
    /* Clamp orbits so seat widgets don't clip off-screen. */
    var scale = Layout.seatScale(totalSeats);
    var halfSeatW = (Layout.seatWidth() * scale) / 2 + 4;
    var halfSeatH = (Layout.seatHeight() * scale) / 2 + 4;
    var maxRx = cx - halfSeatW;
    if (rx > maxRx) rx = maxRx;
    var maxRy = cy - halfSeatH;
    if (ry > maxRy) ry = maxRy;
    return {
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    };
  },

  /**
   * Community card x coordinate in the upper felt area.
   * @param {number} cardIndex - Index of the community card.
   * @param {number} totalCards - Total number of community cards.
   * @returns {number} Card center x coordinate.
   */
  communityX: function (cardIndex, totalCards) {
    var cw =
      Layout.vh(C.CARD_H) *
      0.65; /* width derived from height-based card size */
    var gap = cw * 0.15;
    var totalW = totalCards * cw + (totalCards - 1) * gap;
    var startX = Layout.internalW / 2 - totalW / 2;
    return startX + cardIndex * (cw + gap) + cw / 2;
  },
  /**
   * Community cards y coordinate.
   * @returns {number} Card center y coordinate.
   */
  communityY: function () {
    return Layout.feltCY() - Layout.feltRY() * 0.2;
  },

  /**
   * Pot display x coordinate.
   * @returns {number} Pot center x coordinate.
   */
  potX: function () {
    return Layout.internalW / 2;
  },
  /**
   * Pot display y coordinate.
   * @returns {number} Pot center y coordinate.
   */
  potY: function () {
    return Layout.feltCY() + Layout.feltRY() * 0.35;
  },

  /**
   * Deck x coordinate in the upper-right of the felt.
   * @returns {number} Deck center x coordinate.
   */
  deckX: function () {
    return Layout.internalW / 2 + Layout.feltRX() * 0.65;
  },
  /**
   * Deck y coordinate in the upper-right of the felt.
   * @returns {number} Deck center y coordinate.
   */
  deckY: function () {
    return Layout.feltCY() - Layout.feltRY() * 0.5;
  },

  /**
   * Local player's card y coordinate.
   * @returns {number} Card center y coordinate.
   */
  myCardsY: function () {
    var feltBottom = Layout.feltCY() + Layout.feltRY() + 10;
    var actionTop = Layout.actionAreaTop() - 8;
    var cardH = Layout.cardH("large");
    /* Center the cards vertically in the available space */
    var available = actionTop - feltBottom;
    if (available <= cardH) return actionTop - cardH / 2;
    return feltBottom + (available - cardH) / 2 + cardH / 2;
  },

  /**
   * Reserved top edge for the bottom action controls.
   * @returns {number} Y coordinate of the action area top.
   */
  actionAreaTop: function () {
    return Layout.internalH - Layout.betComposerHeight() - 8;
  },

  /**
   * Action bar y coordinate.
   * @returns {number} Button row center y coordinate.
   */
  actionBarY: function () {
    return Layout.internalH - C.BTN_MIN_H / 2 - 6;
  },

  /**
   * Bet composer height.
   * @returns {number} Height in pixels.
   */
  betComposerHeight: function () {
    if (Layout.isPortrait()) return 196;
    return 176;
  },

  /**
   * Bet composer rectangle.
   * @returns {{ x: number, y: number, w: number, h: number }} Composer bounds.
   */
  betComposerRect: function () {
    var margin = 8;
    var w = Math.min(Layout.internalW - margin * 2, Layout.isPortrait() ? 520 : 760);
    var h = Layout.betComposerHeight();
    return {
      x: (Layout.internalW - w) / 2,
      y: Layout.internalH - h - margin,
      w: w,
      h: h,
    };
  },

  /**
   * HUD x coordinate.
   * @returns {number} HUD x coordinate.
   */
  hudX: function () {
    return 8;
  },
  /**
   * HUD y coordinate.
   * @returns {number} HUD y coordinate.
   */
  hudY: function () {
    return 4;
  },

  /**
   * Card height for a named size.
   * @param {string} size - Card size key.
   * @returns {number} Card height in pixels.
   */
  cardH: function (size) {
    if (size === "large") return Layout.vh(13);
    if (size === "mini") return Layout.vh(4.5);
    /* Community cards — slightly larger on portrait for readability */
    var base = Layout.vh(9);
    if (Layout.isPortrait()) base = Math.max(base, Layout.vw(14));
    return base;
  },
  /**
   * Card width for a named size.
   * @param {string} size - Card size key.
   * @returns {number} Card width in pixels.
   */
  cardW: function (size) {
    return Layout.cardH(size) * 0.68;
  },

  /**
   * Opponent hole-card height on player seats.
   * @param {number} totalSeats - Total seats at the table.
   * @returns {number} Card height in pixels.
   */
  playerCardH: function (totalSeats) {
    var scale = Layout.seatScale(totalSeats || 6);
    var densityScale = Math.max(0.82, scale);
    var h = Layout.vh(6.3) * densityScale;
    if (Layout.isPortrait()) {
      h = Math.min(h, Layout.vw(12.4) * Math.max(0.9, scale));
    }
    return Math.max(Layout.vh(4.5), h);
  },

  /**
   * Avatar radius.
   * @returns {number} Radius in pixels.
   */
  avatarR: function () {
    return Layout.vmin(C.AVATAR_R);
  },

  /**
   * Seat container width.
   * @returns {number} Width in pixels.
   */
  seatWidth: function () {
    return Layout.vmin(C.SEAT_W);
  },

  /**
   * Seat container height, panel only.
   * @returns {number} Height in pixels.
   */
  seatHeight: function () {
    return Layout.vmin(C.SEAT_H);
  },

  /**
   * Scale factor for seats based on player count.
   * @param {number} totalSeats - Total seats at the table.
   * @returns {number} Seat scale factor.
   */
  seatScale: function (totalSeats) {
    return Math.max(C.SEAT_SCALE_MIN, Math.min(1, 9 / totalSeats));
  },

  /**
   * Bottom of the inward-flowing UI on a player node, relative to node.y.
   * Top seats place cards/odds below the panel, so bet chips need to clear it.
   * @param {object | null} playerNode - Player node to measure.
   * @returns {number} Bottom y offset relative to the node.
   */
  playerUiBottom: function (playerNode) {
    if (!playerNode) return 0;

    var bottom = 0;
    if (playerNode.internalHoleCards) {
      var cardH = playerNode.internalHc0?.internalCardH
        ? playerNode.internalHc0.internalCardH
        : Layout.cardH("mini");
      bottom = Math.max(bottom, playerNode.internalHoleCards.y + cardH / 2);
    }
    if (playerNode.internalHandName) {
      bottom = Math.max(
        bottom,
        playerNode.internalHandName.y +
          parseFloat(playerNode.internalHandName.style.fontSize || 14),
      );
    }
    if (playerNode.internalWinPct) {
      bottom = Math.max(
        bottom,
        playerNode.internalWinPct.y +
          parseFloat(playerNode.internalWinPct.style.fontSize || 16),
      );
    }
    return bottom;
  },

  /**
   * Bet chip position between a player and pot center.
   * Top seats keep the chip below the visible card/odds stack.
   * @param {number} playerX - Player node x coordinate.
   * @param {number} playerY - Player node y coordinate.
   * @param {object | null} playerNode - Player node used for top-seat clearance.
   * @returns {{ x: number, y: number }} Bet chip position.
   */
  betChipPos: function (playerX, playerY, playerNode) {
    var px = Layout.potX();
    var py = Layout.potY();
    var dx = px - playerX;
    var dy = py - playerY;
    var chipR = Math.max(7, Layout.vmin(1.2));
    var t = 0.25;
    var x = playerX + dx * t;
    var y = playerY + dy * t;

    var isTopSeat = playerY < Layout.feltCY() - Math.max(4, Layout.vmin(2));
    if (isTopSeat) {
      var clearBottom = Layout.playerUiBottom(playerNode);
      if (clearBottom > 0) {
        var minY = playerY + clearBottom + chipR + Math.max(8, Layout.vmin(1));
        if (y < minY && dy > 0) {
          y = minY;
          x = playerX + dx * ((y - playerY) / dy);
        }
      } else {
        x = playerX + dx * 0.42;
        y = playerY + dy * 0.42;
      }
    }

    return {
      x: x,
      y: y,
    };
  },

  /**
   * Get chip color for a given amount.
   * @param {number} amount - Chip amount.
   * @returns {number} PixiJS hex color.
   */
  chipColor: function (amount) {
    if (amount >= 1000) return C.CHIP_BLACK;
    if (amount >= 500) return C.CHIP_BLUE;
    if (amount >= 200) return C.CHIP_GREEN;
    if (amount >= 50) return C.CHIP_RED;
    return C.CHIP_WHITE;
  },
};
