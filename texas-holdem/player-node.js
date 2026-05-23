/* ===== PLAYER NODE (Seat Widget) ===== */
/* All player elements grouped in one cohesive container.
   Architecture:
     PlayerNode (Container) — at seatPos(i, total)
     ├── bgPanel — semi-transparent dark rounded rect
     ├── avatarContainer — circle + badge + glow + winGlow
     ├── nameText — right of avatar
     ├── chipText — below name
     ├── actionTag — FOLD/ALL-IN/RAISE
     ├── chipStack — visual stack, right side
     ├── holeCards — below panel, centered
     │   ├── card0, card1
     ├── handName — below cards
     ├── winPct — below hand name, color-coded
     └── betChip — in world space (chipLayer, not grouped)
   Cards always below the panel. No quadrant-based offset logic. */

var PlayerNode = {
  internalNodes: {},

  getOrCreate: function (playerId, parent) {
    if (PlayerNode.internalNodes[playerId])
      return PlayerNode.internalNodes[playerId];

    var node = new PIXI.Container();
    node.internalPid = playerId;

    /* ── Background panel ── */
    var bgPanel = new PIXI.Graphics();
    node.addChild(bgPanel);
    node.internalBgPanel = bgPanel;

    /* ── Avatar container (left side of panel) ── */
    var avatarContainer = new PIXI.Container();

    /* Glow ring (active turn) — behind avatar */
    var glow = new PIXI.Graphics();
    glow.visible = false;
    avatarContainer.addChild(glow);
    node.internalGlow = glow;

    /* Win glow — behind avatar */
    var winGlow = new PIXI.Graphics();
    winGlow.visible = false;
    avatarContainer.addChild(winGlow);
    node.internalWinGlow = winGlow;

    /* Avatar body */
    var avatar = new PIXI.Graphics();
    avatarContainer.addChild(avatar);
    node.internalAvatar = avatar;
    node.internalAvatarR = 0;

    /* Initial letter */
    var initial = new PIXI.Text({
      text: "?",
      style: {
        fontFamily: '-apple-system, "Segoe UI", sans-serif',
        fontSize: 12,
        fontWeight: "bold",
        fill: C.TEXT,
      },
    });
    initial.anchor.set(0.5, 0.5);
    avatarContainer.addChild(initial);
    node.internalInitial = initial;

    /* Badge (D/S/B) */
    var badge = new PIXI.Container();
    badge.visible = false;
    var badgeBg = new PIXI.Graphics();
    badge.addChild(badgeBg);
    var badgeText = new PIXI.Text({
      text: "",
      style: {
        fontFamily: "sans-serif",
        fontSize: 9,
        fontWeight: "bold",
        fill: 0x000000,
      },
    });
    badgeText.anchor.set(0.5, 0.5);
    badge.addChild(badgeText);
    avatarContainer.addChild(badge);
    node.internalBadge = badge;
    node.internalBadgeBg = badgeBg;
    node.internalBadgeText = badgeText;

    node.addChild(avatarContainer);
    node.internalAvatarContainer = avatarContainer;

    /* ── Name text ── */
    var nameText = new PIXI.Text({
      text: "",
      style: {
        fontFamily: '-apple-system, "Segoe UI", sans-serif',
        fontSize: 11,
        fontWeight: "600",
        fill: 0xdde4ee,
      },
    });
    nameText.anchor.set(0, 0.5);
    node.addChild(nameText);
    node.internalNameText = nameText;

    /* ── Chip text ── */
    var chipText = new PIXI.Text({
      text: "",
      style: {
        fontFamily: '-apple-system, "Segoe UI", sans-serif',
        fontSize: 11,
        fontWeight: "bold",
        fill: C.GOLD,
      },
    });
    chipText.anchor.set(0, 0.5);
    node.addChild(chipText);
    node.internalChipText = chipText;

    /* ── Action tag (FOLD, ALL IN, RAISE etc) ── */
    var actionTag = new PIXI.Text({
      text: "",
      style: {
        fontFamily: "sans-serif",
        fontSize: 10,
        fontWeight: "bold",
        fill: C.TEXT,
      },
    });
    actionTag.anchor.set(0.5, 0);
    actionTag.visible = false;
    node.addChild(actionTag);
    node.internalActionTag = actionTag;

    /* ── Chip stack visual (right side of panel) ── */
    var chipStack = new PIXI.Graphics();
    node.addChild(chipStack);
    node.internalChipStack = chipStack;
    node.internalLastChips = 0;

    /* ── Bet chip (in world space, added to chipLayer by caller) ── */
    var betChip = new PIXI.Container();
    betChip.visible = false;
    var betChipGfx = new PIXI.Graphics();
    betChip.addChild(betChipGfx);
    var betChipText = new PIXI.Text({
      text: "",
      style: {
        fontFamily: "sans-serif",
        fontSize: 10,
        fontWeight: "bold",
        fill: C.TEXT,
      },
    });
    betChipText.anchor.set(0.5, 0.5);
    betChip.addChild(betChipText);
    node.internalBetChip = betChip;
    node.internalBetChipGfx = betChipGfx;
    node.internalBetChipText = betChipText;

    /* ── Hole cards — below panel, centered ── */
    var holeCards = new PIXI.Container();
    var hc0 = CardSprite.create("mini");
    var hc1 = CardSprite.create("mini");
    hc0.showBack();
    hc1.showBack();
    holeCards.addChild(hc0);
    holeCards.addChild(hc1);
    holeCards.visible = false;
    node.addChild(holeCards);
    node.internalHoleCards = holeCards;
    node.internalHc0 = hc0;
    node.internalHc1 = hc1;

    /* ── Hand name label (below cards) — prominent for spectators ── */
    var handName = new PIXI.Text({
      text: "",
      style: {
        fontFamily: '-apple-system, "Segoe UI", sans-serif',
        fontSize: 14,
        fontWeight: "bold",
        fill: C.PURPLE,
        dropShadow: { color: "#000000", blur: 2, distance: 1, alpha: 0.7 },
      },
    });
    handName.anchor.set(0.5, 0);
    handName.visible = false;
    node.addChild(handName);
    node.internalHandName = handName;

    /* ── Win probability text (below hand name) — large and bold ── */
    var winPct = new PIXI.Text({
      text: "",
      style: {
        fontFamily: '-apple-system, "Segoe UI", sans-serif',
        fontSize: 16,
        fontWeight: "bold",
        fill: C.GREEN,
        dropShadow: { color: "#000000", blur: 2, distance: 1, alpha: 0.7 },
      },
    });
    winPct.anchor.set(0.5, 0);
    winPct.visible = false;
    node.addChild(winPct);
    node.internalWinPct = winPct;

    node.internalWasActive = false;
    node.visible = false; /* hidden until first updateFromView */

    /* Cached draw dimensions — _drawSeat skips redraw when unchanged */
    node.internalDrawnW = 0;
    node.internalDrawnH = 0;
    node.internalDrawnScale = 0;
    /* Layout dimension cached by _drawSeat for chip stack positioning */
    node.internalDrawnSW = 0;

    parent.addChild(node);
    PlayerNode.internalNodes[playerId] = node;
    return node;
  },

  /**
   * Rebuild seat graphics. Skips redraw if viewport and scale unchanged.
   * @param {PIXI.Container} node - Player seat container to redraw.
   * @param {number} totalSeats - Number of seats at the table.
   */
  internalDrawSeat: function (node, totalSeats) {
    var scale = Layout.seatScale(totalSeats || 6);
    var w = Layout.internalW;
    var h = Layout.internalH;

    /* Early-return if nothing changed since last draw */
    if (
      node.internalDrawnW === w &&
      node.internalDrawnH === h &&
      node.internalDrawnScale === scale
    )
      return;
    node.internalDrawnW = w;
    node.internalDrawnH = h;
    node.internalDrawnScale = scale;

    var sw = Layout.seatWidth() * scale;
    var sh = Layout.seatHeight() * scale;
    var avatarR = Layout.avatarR() * scale;
    var pad = Layout.vmin(C.SEAT_PAD) * scale;

    node.internalAvatarR = avatarR;
    node.internalDrawnSW = sw;

    /* ── Background panel ── */
    var bg = node.internalBgPanel;
    bg.clear();
    bg.roundRect(-sw / 2, -sh / 2, sw, sh, C.SEAT_BG_RADIUS);
    bg.fill({ color: 0x000000, alpha: C.SEAT_BG_ALPHA });

    /* ── Avatar ── */
    var avatar = node.internalAvatar;
    avatar.clear();
    avatar.circle(0, 0, avatarR);
    avatar.fill({ color: 0x1a2332 });
    avatar.circle(0, 0, avatarR);
    avatar.stroke({ color: 0x3d4f63, width: 2 });

    var glow = node.internalGlow;
    glow.clear();
    glow.circle(0, 0, avatarR + 3);
    glow.stroke({ color: C.GREEN, width: 2.5, alpha: 0.7 });

    var winGlow = node.internalWinGlow;
    winGlow.clear();
    winGlow.circle(0, 0, avatarR + 3);
    winGlow.stroke({ color: C.GOLD, width: 2.5, alpha: 0.8 });

    /* Force avatar redraw on next updateFromView since we just cleared it */
    node.internalWasActive = undefined;

    node.internalInitial.style.fontSize = Math.max(9, avatarR * 0.85);
    node.internalBadge.x = avatarR * 0.65;
    /* Top-right of avatar so the badge can't collide with the action tag
       (CHECK/CALL/RAISE/FOLD) that sits just below the panel. */
    node.internalBadge.y = -avatarR * 0.65;
    /* Scale badge with seat — fixed 8px looks wrong when everything else scales */
    var badgeR = Math.max(6, avatarR * 0.3);
    node.internalBadgeR = badgeR;
    node.internalBadgeText.style.fontSize = Math.max(7, badgeR * 1.1);

    /* Position avatar at left side of panel */
    node.internalAvatarContainer.x = -sw / 2 + pad + avatarR;
    node.internalAvatarContainer.y = 0;

    /* Position text elements relative to avatar */
    var textX = node.internalAvatarContainer.x + avatarR + pad;
    node.internalNameText.x = textX;
    node.internalNameText.y = -sh * 0.18;
    node.internalNameText.style.fontSize = Math.max(
      9,
      Layout.vmin(1.2) * scale,
    );
    node.internalChipText.x = textX;
    node.internalChipText.y = sh * 0.18;
    node.internalChipText.style.fontSize = Math.max(
      9,
      Layout.vmin(1.1) * scale,
    );

    /* Action tag below panel */
    var actionTagFontSize = Math.max(9, Layout.vmin(1) * scale);
    node.internalActionTag.y = sh / 2 + 2;
    node.internalActionTag.style.fontSize = actionTagFontSize;

    /* Hole cards below panel, with a gap big enough for the action-tag text
       (CHECK/CALL/RAISE/FOLD) plus the avatar's overshoot since
       avatarR (3.2 vmin) exceeds sh/2 (2.5 vmin). */
    var mch = Layout.playerCardH(totalSeats || 6);
    var mcw = mch * 0.68;
    node.internalHc0.resize(mch);
    node.internalHc1.resize(mch);
    node.internalHc0.x = -mcw * 0.55;
    node.internalHc1.x = mcw * 0.55;
    node.internalHoleCards.x = 0;
    var avatarBottom = avatarR;
    var actionTagBottom = sh / 2 + 2 + actionTagFontSize;
    var cardsTopY = Math.max(avatarBottom, actionTagBottom) + 2;
    node.internalHoleCards.y = cardsTopY + mch / 2;

    /* Hand name and win pct below cards — large and bold for spectators */
    var handFontSize = Math.max(13, Layout.vmin(2.2) * scale);
    var pctFontSize = Math.max(15, Layout.vmin(2.6) * scale);
    node.internalHandName.x = 0;
    node.internalHandName.y = node.internalHoleCards.y + mch / 2 + 2;
    node.internalHandName.style.fontSize = handFontSize;
    node.internalWinPct.x = 0;
    node.internalWinPct.y = node.internalHandName.y + handFontSize + 2;
    node.internalWinPct.style.fontSize = pctFontSize;

    /* Store max name length for scale-aware truncation.
       No chipStackArea deduction — chip stack moved outside the panel. */
    node.internalMaxNamePx =
      sw / 2 - (node.internalAvatarContainer.x + avatarR + pad) - 4;
  },

  updateFromView: function (node, playerData, view, context, isCurrentActor) {
    var avatarR = node.internalAvatarR;
    var name = internalGetPlayerName(playerData.id, context);

    node.visible = true;
    node.internalInitial.text = name.charAt(0).toUpperCase();

    /* Show a useful name, then fit it into the seat lane. */
    var dispName = name;
    var maxPx = node.internalMaxNamePx || 50;
    var maxNameChars = 15;
    node.internalNameText.scale.x = 1;
    if (dispName.length > maxNameChars) {
      dispName = dispName.slice(0, maxNameChars - 1) + "\u2026";
    }
    node.internalNameText.text = dispName;
    if (node.internalNameText.width > maxPx) {
      node.internalNameText.scale.x = maxPx / node.internalNameText.width;
    }

    /* Freeze chip display during showdown card reveals */
    var cardsStillRevealing =
      Renderer && Renderer._animatingCards
        ? Object.keys(Renderer._animatingCards).length > 0
        : false;
    if (!cardsStillRevealing) {
      node.internalChipText.text =
        "\uD83E\uDE99 " + internalChips(playerData.chips);
    }

    /* Opacity */
    var isShowdown = view.phase === "showdown";
    if (playerData.eliminated && !isShowdown) {
      node.alpha = 0.15;
    } else if (playerData.eliminated && isShowdown) {
      node.alpha = 0.75;
    } else if (playerData.folded) {
      node.alpha = 0.35;
    } else {
      node.alpha = 1;
    }

    /* Active glow + green avatar fill */
    var isActive =
      isCurrentActor && !playerData.folded && !playerData.eliminated;
    node.internalGlow.visible = isActive;
    if (isActive) {
      var sec = performance.now() * 0.001;
      node.internalGlow.alpha = 0.5 + 0.3 * Math.sin(sec * 4);
    }
    if (isActive !== node.internalWasActive) {
      var av = node.internalAvatar;
      var ar = node.internalAvatarR;
      av.clear();
      av.circle(0, 0, ar);
      av.fill({ color: isActive ? C.GREEN : 0x1a2332 });
      av.circle(0, 0, ar);
      av.stroke({ color: isActive ? 0x4ade80 : 0x3d4f63, width: 2 });
      node.internalInitial.style.fill = isActive ? 0x000000 : C.TEXT;
      node.internalWasActive = isActive;
    }

    /* Winner glow */
    var isWinner =
      view.result?.winners && view.result.winners.indexOf(playerData.id) !== -1;
    node.internalWinGlow.visible = isWinner;

    /* Badge */
    if (
      playerData.role === "dealer" ||
      playerData.role === "smallBlind" ||
      playerData.role === "bigBlind"
    ) {
      var bColor =
        playerData.role === "dealer"
          ? C.BADGE_D
          : playerData.role === "smallBlind"
            ? C.BADGE_S
            : C.BADGE_B;
      var bLetter =
        playerData.role === "dealer"
          ? "D"
          : playerData.role === "smallBlind"
            ? "S"
            : "B";
      var bR = node.internalBadgeR || 8;
      node.internalBadgeBg.clear();
      node.internalBadgeBg.circle(0, 0, bR);
      node.internalBadgeBg.fill({ color: bColor });
      node.internalBadgeText.text = bLetter;
      node.internalBadge.visible = true;
    } else {
      node.internalBadge.visible = false;
    }

    /* Action tag */
    var la = view.lastAction?.[playerData.id];
    if (playerData.allIn) {
      node.internalActionTag.text = "ALL IN";
      node.internalActionTag.style.fill = C.ORANGE;
      node.internalActionTag.visible = true;
    } else if (playerData.folded) {
      node.internalActionTag.text = "FOLD";
      node.internalActionTag.style.fill = C.DIM;
      node.internalActionTag.visible = true;
    } else if (la) {
      node.internalActionTag.text = la;
      node.internalActionTag.style.fill =
        la.indexOf("RAISE") === 0
          ? C.GOLD
          : la === "CALL"
            ? C.GREEN
            : la === "CHECK"
              ? C.BLUE
              : C.TEXT;
      node.internalActionTag.visible = true;
    } else {
      node.internalActionTag.visible = false;
    }

    /* ── Chip stack visual — positioned below panel, right of hole cards ── */
    var cs = node.internalChipStack;
    var chipsChanged = playerData.chips !== node.internalLastChips;
    if (chipsChanged) cs.clear();
    if (chipsChanged && !playerData.eliminated && playerData.chips > 0) {
      var stackCount = Math.min(6, Math.ceil(playerData.chips / 80));
      var chipR = Math.max(4, Layout.vmin(0.8));
      var chipColor = Layout.chipColor(playerData.chips);
      /* Below the panel, offset right of center to avoid hole card overlap */
      var mcw = node.internalHc0?.internalCardW
        ? node.internalHc0.internalCardW
        : Layout.cardW("mini");
      var stackDx = mcw * 0.55 + mcw / 2 + chipR + 4;
      var stackDy = node.internalHoleCards ? node.internalHoleCards.y : 0;
      for (var si = 0; si < stackCount; si++) {
        cs.ellipse(stackDx, stackDy - si * 2.5 + 1, chipR, chipR * 0.4);
        cs.fill({ color: 0x000000, alpha: 0.2 });
        cs.ellipse(stackDx, stackDy - si * 2.5, chipR, chipR * 0.4);
        cs.fill({ color: chipColor });
        cs.ellipse(stackDx, stackDy - si * 2.5, chipR * 0.5, chipR * 0.2);
        cs.stroke({ color: C.CHIP_STRIPE, width: 0.6, alpha: 0.3 });
      }

      /* Animate chips to pot when bet increases */
      if (
        node.internalLastChips > 0 &&
        playerData.chips < node.internalLastChips &&
        playerData.bet > 0
      ) {
        var worldX = node.x + stackDx;
        var worldY = node.y + stackDy;
        ChipAnim.betToPot(
          worldX,
          worldY,
          Math.min(3, Math.ceil(playerData.bet / 40)),
        );
      }
    }
    node.internalLastChips = playerData.chips;

    /* Bet chip */
    var bc = node.internalBetChip;
    if (playerData.bet > 0 && !playerData.folded) {
      var betPos = Layout.betChipPos(node.x, node.y, node);
      bc.x = betPos.x;
      bc.y = betPos.y;
      bc.visible = true;
      var bcg = node.internalBetChipGfx;
      bcg.clear();
      var bcR = Math.max(7, Layout.vmin(1.2));
      bcg.circle(0, 1, bcR);
      bcg.fill({ color: 0x000000, alpha: 0.3 });
      bcg.circle(0, 0, bcR);
      bcg.fill({ color: Layout.chipColor(playerData.bet) });
      bcg.circle(0, 0, bcR * 0.55);
      bcg.stroke({ color: C.CHIP_STRIPE, width: 0.8, alpha: 0.4 });
      node.internalBetChipText.text = internalChips(playerData.bet);
      node.internalBetChipText.y = bcR + 7;
    } else {
      bc.visible = false;
    }

    /* ── Hole cards ── */
    var hc = node.internalHoleCards;
    var revealedHand = view.revealedHands?.[playerData.id];
    var godHand = view.allHands?.[playerData.id];

    /* Label ownership: active player showdown labels handled here (revealedHand).
       Spectator labels (_handName, _winPct) owned by SpectatorOdds module. */
    if (playerData.folded || playerData.eliminated) {
      hc.visible = false;
    } else if (revealedHand) {
      hc.visible = true;
      if (revealedHand.cards[0]) {
        node.internalHc0.setCard(revealedHand.cards[0]);
        node.internalHc0.showFace();
      }
      if (revealedHand.cards[1]) {
        node.internalHc1.setCard(revealedHand.cards[1]);
        node.internalHc1.showFace();
      }
      node.internalHandName.text = revealedHand.handName || "";
      node.internalHandName.visible = true;
    } else if (godHand) {
      hc.visible = true;
      if (godHand[0]) {
        node.internalHc0.setCard(godHand[0]);
        node.internalHc0.showFace();
      }
      if (godHand[1]) {
        node.internalHc1.setCard(godHand[1]);
        node.internalHc1.showFace();
      }
    } else if (view.phase !== "showdown") {
      hc.visible = true;
      node.internalHc0.showBack();
      node.internalHc1.showBack();
    } else {
      hc.visible = false;
    }
  },

  repositionAll: function (view, myId) {
    if (!view?.players) return;
    var seated = view.players;
    var myIdx = 0;
    for (var i = 0; i < seated.length; i++) {
      if (seated[i].id === myId) {
        myIdx = i;
        break;
      }
    }

    for (var oi = 0; oi < seated.length; oi++) {
      var pi = (myIdx + oi) % seated.length;
      var p = seated[pi];
      if (p.id === myId && oi === 0) continue;
      var node = PlayerNode.internalNodes[p.id];
      if (node) {
        var pos = Layout.seatPos(oi, seated.length);
        node.x = pos.x;
        node.y = pos.y;
        PlayerNode.internalDrawSeat(node, seated.length);
      }
    }
  },

  clearAll: function () {
    var keys = Object.keys(PlayerNode.internalNodes);
    for (var i = 0; i < keys.length; i++) {
      var node = PlayerNode.internalNodes[keys[i]];
      if (node.parent) node.parent.removeChild(node);
      node.destroy({ children: true });
    }
    PlayerNode.internalNodes = {};
    internalNameCache = {};
  },
};

var internalNameCache = {};
function internalGetPlayerName(id, context) {
  if (internalNameCache[id]) return internalNameCache[id];
  if (context?.players) {
    for (var i = 0; i < context.players.length; i++) {
      if (context.players[i].id === id) {
        internalNameCache[id] = context.players[i].name || id.slice(-4);
        return internalNameCache[id];
      }
    }
  }
  return id.slice(-4);
}
