/* ===== BOARD VIEW (1v1 / 2v2 — team-colored boards) ===== */

var BoardView = {
  internalOwnTiles: [],
  internalOppTiles: [],
  internalTmOwnTiles: [] /* 2v2: teammate's board tiles */,
  internalTmOppTiles: [] /* 2v2: teammate's opponent tiles */,
  internalOwnContainer: null,
  internalOppContainer: null,
  internalTmOwnContainer: null,
  internalTmOppContainer: null,
  internalBattleLine: null,
  internalBattleLineGlow: null,
  internalTeamDivider: null,
  internalUnitLayer: null,
  _unitCountText: null,
  internalOppHiddenLabel: null,
  internalBgGradient: null,
  internalStarText: null,

  create: function (parent, w, h) {
    var ownCont = new PIXI.Container();
    ownCont.label = "ownTiles";
    var oppCont = new PIXI.Container();
    oppCont.label = "oppTiles";
    oppCont.interactiveChildren = false;

    for (var i = 0; i < BOARD_CELLS; i++) {
      var ownTile = new PIXI.Graphics();
      var pos = Layout.cellPos(i, "own", w, h);
      ownTile
        .roundRect(-pos.size / 2, -pos.size / 2, pos.size, pos.size, 6)
        .fill({ color: 0x1a2a38 })
        .stroke({ color: 0x2a4a5a, width: 1 });
      ownTile.x = pos.x;
      ownTile.y = pos.y;
      ownTile.internalCellIdx = i;
      ownTile.internalDrawnSize = pos.size;
      ownTile.eventMode = "none";
      ownTile.cursor = "pointer";
      ownCont.addChild(ownTile);
      BoardView.internalOwnTiles.push(ownTile);

      var oppTile = new PIXI.Graphics();
      var opos = Layout.cellPos(i, "opp", w, h);
      oppTile
        .roundRect(-opos.size / 2, -opos.size / 2, opos.size, opos.size, 6)
        .fill({ color: 0x221a1a })
        .stroke({ color: 0x3a2222, width: 1 });
      oppTile.x = opos.x;
      oppTile.y = opos.y;
      oppTile.internalDrawnSize = opos.size;
      oppCont.addChild(oppTile);
      BoardView.internalOppTiles.push(oppTile);
    }

    /* 2v2 extra boards: teammate (top-left) + teammate's opponent (top-right) */
    var tmOwnCont = new PIXI.Container();
    tmOwnCont.label = "tmOwnTiles";
    tmOwnCont.interactiveChildren = false;
    tmOwnCont.visible = false;
    var tmOppCont = new PIXI.Container();
    tmOppCont.label = "tmOppTiles";
    tmOppCont.interactiveChildren = false;
    tmOppCont.visible = false;

    for (var t2 = 0; t2 < BOARD_CELLS; t2++) {
      var tmOwnTile = new PIXI.Graphics();
      var tp1 = Layout.cellPos2v2(t2, "tmOwn", w, h);
      tmOwnTile
        .roundRect(-tp1.size / 2, -tp1.size / 2, tp1.size, tp1.size, 4)
        .fill({ color: 0x1a2838 })
        .stroke({ color: 0x2a4a6a, width: 1 });
      tmOwnTile.x = tp1.x;
      tmOwnTile.y = tp1.y;
      tmOwnTile.internalDrawnSize = tp1.size;
      tmOwnCont.addChild(tmOwnTile);
      BoardView.internalTmOwnTiles.push(tmOwnTile);

      var tmOppTile = new PIXI.Graphics();
      var tp2 = Layout.cellPos2v2(t2, "tmOpp", w, h);
      tmOppTile
        .roundRect(-tp2.size / 2, -tp2.size / 2, tp2.size, tp2.size, 4)
        .fill({ color: 0x221a1a })
        .stroke({ color: 0x3a2222, width: 1 });
      tmOppTile.x = tp2.x;
      tmOppTile.y = tp2.y;
      tmOppTile.internalDrawnSize = tp2.size;
      tmOppCont.addChild(tmOppTile);
      BoardView.internalTmOppTiles.push(tmOppTile);
    }
    BoardView.internalTmOwnContainer = tmOwnCont;
    BoardView.internalTmOppContainer = tmOppCont;

    /* Background radial gradient */
    var bgGrad = new PIXI.Graphics();
    var bgRadius = Math.max(w, h) * 0.5;
    bgGrad.circle(w / 2, h * 0.42, bgRadius).fill({ color: 0x0e1a16 });
    bgGrad.alpha = 0.5;
    bgGrad.internalDrawnCx = w / 2;
    bgGrad.internalDrawnCy = h * 0.42;
    bgGrad.internalDrawnRadius = bgRadius;
    BoardView.internalBgGradient = bgGrad;

    /* Battle line glow */
    var lineGlow = new PIXI.Graphics();
    lineGlow.rect(0, -4, w, 8).fill({ color: 0xffffff });
    lineGlow.tint = 0x3a4a5a;
    lineGlow.y = Layout.battleLineY(h);
    lineGlow.alpha = 0.15;
    lineGlow.internalDrawnWidth = w;
    BoardView.internalBattleLineGlow = lineGlow;

    /* Battle line */
    var line = new PIXI.Graphics();
    line.rect(0, -2, w, 4).fill({ color: 0xffffff });
    line.tint = 0x3a4a5a;
    line.y = Layout.battleLineY(h);
    line.alpha = 0.5;
    line.internalDrawnWidth = w;
    BoardView.internalBattleLine = line;

    /* 2v2 vertical team divider — between left (blue) and right (red) columns */
    var teamDiv = new PIXI.Graphics();
    teamDiv.rect(-1, 0, 2, h).fill({ color: 0xffffff });
    teamDiv.tint = 0x3a4a5a;
    teamDiv.x = w / 2;
    teamDiv.alpha = 0.3;
    teamDiv.visible = false;
    teamDiv.internalDrawnHeight = h;
    BoardView.internalTeamDivider = teamDiv;

    /* Unit count — removed, glow is the placement indicator */

    /* Opponent board hidden — no text, empty tiles are self-evident */
    var oppHiddenLabel = new PIXI.Container();
    oppHiddenLabel.visible = false;
    BoardView.internalOppHiddenLabel = oppHiddenLabel;

    var unitLayer = new PIXI.Container();
    unitLayer.label = "unitLayer";
    BoardView.internalUnitLayer = unitLayer;

    /* Star stats text — pre-created, toggled on upgrade */
    var starText = new PIXI.Text({
      text: "",
      style: {
        fontSize: 12,
        fill: 0xffd700,
        fontFamily: "monospace",
        fontWeight: "bold",
        align: "center",
        dropShadow: { color: "#000000", blur: 4, distance: 2 },
      },
    });
    starText.anchor.set(0.5, 1);
    starText.alpha = 0;
    starText.visible = false;
    BoardView.internalStarText = starText;

    parent.addChild(
      bgGrad,
      tmOppCont,
      tmOwnCont,
      oppCont,
      ownCont,
      teamDiv,
      lineGlow,
      line,
      oppHiddenLabel,
      unitLayer,
      starText,
    );
    BoardView.internalOwnContainer = ownCont;
    BoardView.internalOppContainer = oppCont;
  },

  reposition: function (w, h) {
    var is2v2 = Layout.internalIs2v2;
    for (var i = 0; i < BOARD_CELLS; i++) {
      // In 2v2, own = bottom-left, opp = bottom-right
      var op = is2v2
        ? Layout.cellPos2v2(i, "own", w, h)
        : Layout.cellPos(i, "own", w, h);
      var ownTile = BoardView.internalOwnTiles[i];
      ownTile.x = op.x;
      ownTile.y = op.y;
      if (ownTile.internalDrawnSize !== op.size) {
        ownTile.internalDrawnSize = op.size;
        ownTile.clear();
        ownTile
          .roundRect(
            -op.size / 2,
            -op.size / 2,
            op.size,
            op.size,
            is2v2 ? 4 : 6,
          )
          .fill({ color: 0x1a2a38 })
          .stroke({ color: 0x2a4a5a, width: 1 });
      }
      var pp = is2v2
        ? Layout.cellPos2v2(i, "opp", w, h)
        : Layout.cellPos(i, "opp", w, h);
      var oppTile = BoardView.internalOppTiles[i];
      oppTile.x = pp.x;
      oppTile.y = pp.y;
      if (oppTile.internalDrawnSize !== pp.size) {
        oppTile.internalDrawnSize = pp.size;
        oppTile.clear();
        oppTile
          .roundRect(
            -pp.size / 2,
            -pp.size / 2,
            pp.size,
            pp.size,
            is2v2 ? 4 : 6,
          )
          .fill({ color: 0x221a1a })
          .stroke({ color: 0x3a2222, width: 1 });
      }

      // 2v2 extra tiles
      if (is2v2 && BoardView.internalTmOwnTiles[i]) {
        var t1p = Layout.cellPos2v2(i, "tmOwn", w, h);
        BoardView.internalTmOwnTiles[i].x = t1p.x;
        BoardView.internalTmOwnTiles[i].y = t1p.y;
        if (BoardView.internalTmOwnTiles[i].internalDrawnSize !== t1p.size) {
          BoardView.internalTmOwnTiles[i].internalDrawnSize = t1p.size;
          BoardView.internalTmOwnTiles[i].clear();
          BoardView.internalTmOwnTiles[i]
            .roundRect(-t1p.size / 2, -t1p.size / 2, t1p.size, t1p.size, 4)
            .fill({ color: 0x1a2838 })
            .stroke({ color: 0x2a4a6a, width: 1 });
        }
        var t2p = Layout.cellPos2v2(i, "tmOpp", w, h);
        BoardView.internalTmOppTiles[i].x = t2p.x;
        BoardView.internalTmOppTiles[i].y = t2p.y;
        if (BoardView.internalTmOppTiles[i].internalDrawnSize !== t2p.size) {
          BoardView.internalTmOppTiles[i].internalDrawnSize = t2p.size;
          BoardView.internalTmOppTiles[i].clear();
          BoardView.internalTmOppTiles[i]
            .roundRect(-t2p.size / 2, -t2p.size / 2, t2p.size, t2p.size, 4)
            .fill({ color: 0x221a1a })
            .stroke({ color: 0x3a2222, width: 1 });
        }
      }
    }
    BoardView.internalBattleLine.scale.x =
      w / BoardView.internalBattleLine.internalDrawnWidth;
    BoardView.internalBattleLine.y = Layout.battleLineY(h);
    if (BoardView.internalBattleLineGlow) {
      BoardView.internalBattleLineGlow.scale.x =
        w / BoardView.internalBattleLineGlow.internalDrawnWidth;
      BoardView.internalBattleLineGlow.y = Layout.battleLineY(h);
    }
    if (BoardView.internalTeamDivider) {
      BoardView.internalTeamDivider.x = w / 2;
      BoardView.internalTeamDivider.scale.y =
        h / BoardView.internalTeamDivider.internalDrawnHeight;
    }
    if (BoardView.internalBgGradient) {
      BoardView.internalBgGradient.x =
        w / 2 - BoardView.internalBgGradient.internalDrawnCx;
      BoardView.internalBgGradient.y =
        h * 0.42 - BoardView.internalBgGradient.internalDrawnCy;
      var newRadius = Math.max(w, h) * 0.5;
      var bgScale =
        newRadius / BoardView.internalBgGradient.internalDrawnRadius;
      BoardView.internalBgGradient.scale.set(bgScale);
    }
    if (BoardView.internalOppHiddenLabel) {
      BoardView.internalOppHiddenLabel.x = w / 2;
      BoardView.internalOppHiddenLabel.y = Layout.battleLineY(h) - 50;
    }
  },

  /**
   * Diff units by ID — reuse existing sprites, pool released ones.
   * In 2v2, also renders teammate + teammate's opponent boards.
   * @param {object} view - Current board projection.
   * @param {string | null} myId - Viewer player id.
   * @param {string | null} oppId - Opponent player id.
   * @param {Record<string, PIXI.Container>} unitSprites - Active sprites by unit id.
   * @param {number} w - Viewport width.
   * @param {number} h - Viewport height.
   * @param {boolean} isSpectator - Whether the viewer sees spectator boards.
   */
  renderUnits: function (view, myId, oppId, unitSprites, w, h, isSpectator) {
    var is2v2 = view.mode === "2v2";

    /* Show/hide 2v2 extra containers + team divider */
    if (BoardView.internalTmOwnContainer)
      BoardView.internalTmOwnContainer.visible = is2v2;
    if (BoardView.internalTmOppContainer)
      BoardView.internalTmOppContainer.visible = is2v2;
    if (BoardView.internalTeamDivider)
      BoardView.internalTeamDivider.visible = is2v2;

    /* In 2v2, find teammate and teammate's opponent */
    var teammateId = null;
    var tmOppId = null;
    if (is2v2 && view.teams && myId && view.players[myId]) {
      var myTeamId = view.players[myId].teamId;
      var myTeam = view.teams[myTeamId];
      if (myTeam?.players) {
        for (var ti = 0; ti < myTeam.players.length; ti++) {
          if (myTeam.players[ti] !== myId) {
            teammateId = myTeam.players[ti];
            break;
          }
        }
      }
      // Find teammate's opponent from matchups
      if (teammateId && view.matchups) {
        for (var mi = 0; mi < view.matchups.length; mi++) {
          if (view.matchups[mi][0] === teammateId) {
            tmOppId = view.matchups[mi][1];
            break;
          }
          if (view.matchups[mi][1] === teammateId) {
            tmOppId = view.matchups[mi][0];
            break;
          }
        }
      }
    }
    var currentIds = {};
    var myPlayer = view.players[myId];
    var oppPlayer = oppId && oppId !== "ghost" ? view.players[oppId] : null;

    /* Own board — always visible */
    if (myPlayer?.board) {
      for (var i = 0; i < BOARD_CELLS; i++) {
        var unit = myPlayer.board[i];
        if (!unit) continue;
        currentIds[unit.id] = true;
        var pos = is2v2
          ? Layout.cellPos2v2(i, "own", w, h)
          : Layout.cellPos(i, "own", w, h);
        var sprite = unitSprites[unit.id];
        if (!sprite) {
          sprite = SpritePool.get("unit");
          UnitSprite.setup(sprite, unit);
          sprite.internalLastAtk = unit.atk;
          BoardView.internalUnitLayer.addChild(sprite);
          unitSprites[unit.id] = sprite;
          sprite.x = pos.x;
          sprite.y = pos.y;
          sprite.scaleX = 0;
          sprite.scaleY = 0;
          Tween.to(sprite, { scaleX: 1, scaleY: 1 }, 300, "backOut");
        } else {
          UnitSprite.updateHP(sprite, unit.hp, unit.maxHp);
          if (unit.star && !sprite.internalWasStar) {
            sprite.internalWasStar = true;
            sprite.internalStarBadge.visible = true;
            (function (sp, u) {
              EffectPool.emitSparks(sp.x, sp.y, 12, 0xffd700);
              Tween.killTweensOf(sp);
              Tween.to(
                sp,
                { scaleX: 1.4, scaleY: 1.4 },
                150,
                "backOut",
                function () {
                  Tween.to(sp, { scaleX: 1, scaleY: 1 }, 200, "easeOut");
                },
              );
              sp.internalStarBadge.alpha = 0;
              Tween.to(sp.internalStarBadge, { alpha: 1 }, 300, "backOut");
              BoardView.internalShowStarStats(sp, u);
            })(sprite, unit);
          }
          if (
            Math.abs(sprite.x - pos.x) > 2 ||
            Math.abs(sprite.y - pos.y) > 2
          ) {
            Tween.killTweensOf(sprite);
            Tween.to(sprite, { x: pos.x, y: pos.y }, 200, "easeOut");
          } else {
            sprite.x = pos.x;
            sprite.y = pos.y;
          }
        }
      }
    }

    /* Opponent board — visible for spectators always, for players during battle/battleResult */
    var showOpp = isSpectator || view.phase !== "shop";
    if (oppPlayer?.board && showOpp) {
      for (var j = 0; j < BOARD_CELLS; j++) {
        var oUnit = oppPlayer.board[j];
        if (!oUnit) continue;
        currentIds[oUnit.id] = true;
        var opos = is2v2
          ? Layout.cellPos2v2(j, "opp", w, h)
          : Layout.cellPos(j, "opp", w, h);
        var oSprite = unitSprites[oUnit.id];
        if (!oSprite) {
          oSprite = SpritePool.get("unit");
          UnitSprite.setup(oSprite, oUnit);
          oSprite.internalLastAtk = oUnit.atk;
          BoardView.internalUnitLayer.addChild(oSprite);
          unitSprites[oUnit.id] = oSprite;
          oSprite.x = opos.x;
          oSprite.y = opos.y;
          oSprite.scaleX = 0;
          oSprite.scaleY = 0;
          Tween.to(oSprite, { scaleX: 1, scaleY: 1 }, 300, "backOut");
        } else {
          UnitSprite.updateHP(oSprite, oUnit.hp, oUnit.maxHp);
          if (oUnit.star && !oSprite.internalWasStar) {
            oSprite.internalWasStar = true;
            oSprite.internalStarBadge.visible = true;
            (function (sp, u) {
              EffectPool.emitSparks(sp.x, sp.y, 12, 0xffd700);
              Tween.killTweensOf(sp);
              Tween.to(
                sp,
                { scaleX: 1.4, scaleY: 1.4 },
                150,
                "backOut",
                function () {
                  Tween.to(sp, { scaleX: 1, scaleY: 1 }, 200, "easeOut");
                },
              );
              sp.internalStarBadge.alpha = 0;
              Tween.to(sp.internalStarBadge, { alpha: 1 }, 300, "backOut");
              BoardView.internalShowStarStats(sp, u);
            })(oSprite, oUnit);
          }
          if (
            Math.abs(oSprite.x - opos.x) > 2 ||
            Math.abs(oSprite.y - opos.y) > 2
          ) {
            Tween.killTweensOf(oSprite);
            Tween.to(oSprite, { x: opos.x, y: opos.y }, 200, "easeOut");
          } else {
            oSprite.x = opos.x;
            oSprite.y = opos.y;
          }
        }
      }
    }

    /* 2v2: Teammate board (top-left) */
    if (is2v2 && teammateId && view.players[teammateId]?.board) {
      var tmBoard = view.players[teammateId].board;
      for (var t = 0; t < BOARD_CELLS; t++) {
        var tUnit = tmBoard[t];
        if (!tUnit) continue;
        currentIds[tUnit.id] = true;
        var tpos = Layout.cellPos2v2(t, "tmOwn", w, h);
        var tSprite = unitSprites[tUnit.id];
        if (!tSprite) {
          tSprite = SpritePool.get("unit");
          UnitSprite.setup(tSprite, tUnit);
          tSprite.internalLastAtk = tUnit.atk;
          BoardView.internalUnitLayer.addChild(tSprite);
          unitSprites[tUnit.id] = tSprite;
          tSprite.x = tpos.x;
          tSprite.y = tpos.y;
          tSprite.scaleX = 0;
          tSprite.scaleY = 0;
          Tween.to(tSprite, { scaleX: 0.7, scaleY: 0.7 }, 300, "backOut");
        } else {
          UnitSprite.updateHP(tSprite, tUnit.hp, tUnit.maxHp);
          tSprite.scaleX = 0.7;
          tSprite.scaleY = 0.7;
          tSprite.x = tpos.x;
          tSprite.y = tpos.y;
        }
      }
    }

    /* 2v2: Teammate's opponent board (top-right) */
    var showTmOpp = is2v2 && (isSpectator || view.phase !== "shop");
    if (showTmOpp && tmOppId && view.players[tmOppId]?.board) {
      var toBoard = view.players[tmOppId].board;
      for (var to = 0; to < BOARD_CELLS; to++) {
        var toUnit = toBoard[to];
        if (!toUnit) continue;
        currentIds[toUnit.id] = true;
        var topos = Layout.cellPos2v2(to, "tmOpp", w, h);
        var toSprite = unitSprites[toUnit.id];
        if (!toSprite) {
          toSprite = SpritePool.get("unit");
          UnitSprite.setup(toSprite, toUnit);
          toSprite.internalLastAtk = toUnit.atk;
          BoardView.internalUnitLayer.addChild(toSprite);
          unitSprites[toUnit.id] = toSprite;
          toSprite.x = topos.x;
          toSprite.y = topos.y;
          toSprite.scaleX = 0;
          toSprite.scaleY = 0;
          Tween.to(toSprite, { scaleX: 0.7, scaleY: 0.7 }, 300, "backOut");
        } else {
          UnitSprite.updateHP(toSprite, toUnit.hp, toUnit.maxHp);
          toSprite.scaleX = 0.7;
          toSprite.scaleY = 0.7;
          toSprite.x = topos.x;
          toSprite.y = topos.y;
        }
      }
    }

    /* Release sprites no longer on any board */
    var toRemove = [];
    for (var uid in unitSprites) {
      if (!currentIds[uid]) toRemove.push(uid);
    }
    for (var r = 0; r < toRemove.length; r++) {
      SpritePool.release("unit", unitSprites[toRemove[r]]);
      delete unitSprites[toRemove[r]];
    }
  },

  setOwnTilesInteractive: function (enabled) {
    for (var i = 0; i < BoardView.internalOwnTiles.length; i++) {
      BoardView.internalOwnTiles[i].eventMode = enabled ? "static" : "none";
    }
  },

  /**
   * Highlight empty tiles with a subtle pulsing glow. Skip if board is full (5 units).
   * @param {Array<object | null>} board - Board cells to inspect.
   */
  highlightPlaceable: function (board) {
    var unitCount = 0;
    if (board) {
      for (var c = 0; c < 8; c++) {
        if (board[c]) unitCount++;
      }
    }
    if (unitCount >= 5) {
      BoardView.clearHighlights();
      return;
    }
    for (var i = 0; i < BoardView.internalOwnTiles.length; i++) {
      var tile = BoardView.internalOwnTiles[i];
      var occupied = board?.[tile.internalCellIdx];
      if (!occupied && !tile.internalGlowOverlay) {
        var pos = { size: tile.width };
        var glow = new PIXI.Graphics();
        glow
          .roundRect(-pos.size / 2, -pos.size / 2, pos.size, pos.size, 6)
          .stroke({ color: 0x60a5fa, width: 2, alpha: 0.6 });
        glow.alpha = 0.4;
        tile.addChild(glow);
        tile.internalGlowOverlay = glow;
        /* Pulse animation */
        (function (g) {
          function pulse() {
            Tween.to(g, { alpha: 0.8 }, 600, "easeInOut", function () {
              Tween.to(g, { alpha: 0.3 }, 600, "easeInOut", pulse);
            });
          }
          pulse();
        })(glow);
      } else if (occupied && tile.internalGlowOverlay) {
        Tween.killTweensOf(tile.internalGlowOverlay);
        tile.removeChild(tile.internalGlowOverlay);
        tile.internalGlowOverlay = null;
      }
    }
  },

  /** Clear tile glow highlights */
  clearHighlights: function () {
    for (var i = 0; i < BoardView.internalOwnTiles.length; i++) {
      var tile = BoardView.internalOwnTiles[i];
      if (tile.internalGlowOverlay) {
        Tween.killTweensOf(tile.internalGlowOverlay);
        tile.removeChild(tile.internalGlowOverlay);
        tile.internalGlowOverlay = null;
      }
    }
  },

  internalShowStarStats: function (sprite, unit) {
    var st = BoardView.internalStarText;
    if (!st) return;
    var base = UNIT_BASE_STATS ? UNIT_BASE_STATS[unit.unitId] : null;
    if (!base) return;
    var oldAtk = base.atk;
    var newAtk = unit.atk;
    var oldHp = base.hp;
    var newHp = unit.maxHp || unit.hp;
    st.text =
      "\u2605 " +
      unit.name +
      " \u2605\n" +
      oldAtk +
      "\u2192" +
      newAtk +
      " ATK  " +
      oldHp +
      "\u2192" +
      newHp +
      " HP";
    st.x = sprite.x;
    st.y = sprite.y - 30;
    st.visible = true;
    Tween.killTweensOf(st);
    st.alpha = 0;
    Tween.to(st, { alpha: 1 }, 200, "easeOut", function () {
      /* Hold 1.5s then fade — use slow tween */
      Tween.to(st, { alpha: 0 }, 1800, "easeIn", function () {
        st.visible = false;
      });
    });
  },

  updatePhase: function (phase, w, h) {
    if (!BoardView.internalBattleLine) return;
    var lineColors = {
      shop: 0xb4a05a,
      battle: 0xef4444,
      battleResult: 0xfbbf24,
    };
    var lineAlphas = { shop: 0.4, battle: 0.8, battleResult: 0.5 };
    var glowAlphas = { shop: 0.1, battle: 0.25, battleResult: 0.15 };
    var color = lineColors[phase] || 0x3a4a5a;
    var alpha = lineAlphas[phase] || 0.5;
    BoardView.internalBattleLine.tint = color;
    BoardView.internalBattleLine.alpha = alpha;
    if (BoardView.internalBattleLineGlow) {
      BoardView.internalBattleLineGlow.tint = color;
      BoardView.internalBattleLineGlow.alpha = glowAlphas[phase] || 0.15;
    }
    if (phase === "battle") {
      Tween.killTweensOf(BoardView.internalBattleLine);
      BoardView.internalBattleLine.internalPulsePhase = true;
    } else {
      BoardView.internalBattleLine.internalPulsePhase = false;
    }
  },
};
