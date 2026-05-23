/* ===== BENCH PANEL — 4 fixed slots, centered with board ===== */

var BENCH_SLOTS = 4;

var BenchPanel = {
  internalContainer: null,
  internalChips: [],
  internalPlacingLabel: null,
  internalLegalActions: [],
  internalSelectedIdx: -1,

  create: function (parent, w, h) {
    var cont = new PIXI.Container();
    cont.label = "benchPanel";
    BenchPanel.internalContainer = cont;

    /* 4 slots — same width as board cells, centered like the board */
    var cs = Layout.cellSize(w, h);
    var gap = 6;
    var slotW = cs;
    var slotH = Math.min(cs, 52);
    var totalW = BENCH_SLOTS * slotW + (BENCH_SLOTS - 1) * gap;
    var startX = (w - totalW) / 2;

    for (var i = 0; i < BENCH_SLOTS; i++) {
      var chip = new PIXI.Container();
      chip.internalIdx = i;

      /* Slot background — rounded with dashed border look (different from board tiles) */
      var bgNormal = new PIXI.Graphics();
      bgNormal
        .roundRect(0, 0, slotW, slotH, 8)
        .fill({ color: 0x0f1923 })
        .stroke({ color: 0x2a3a4a, width: 1 });
      chip.internalBgNormal = bgNormal;
      chip.internalBg = bgNormal;
      chip.internalSlotW = slotW;
      chip.internalSlotH = slotH;
      chip.addChild(bgNormal);

      /* Selected state */
      var bgSelected = new PIXI.Graphics();
      bgSelected
        .roundRect(0, 0, slotW, slotH, 8)
        .fill({ color: 0x1a2a4a })
        .stroke({ color: 0x60a5fa, width: 2 });
      bgSelected.visible = false;
      chip.internalBgSelected = bgSelected;
      chip.addChild(bgSelected);

      /* Unit preview graphic — centered in slot */
      var benchPreview = new PIXI.Graphics(TRAIT_CONTEXTS.warrior);
      benchPreview.scale.set(0.55);
      benchPreview.x = slotW / 2;
      benchPreview.y = slotH / 2 - 4;
      chip.internalBenchPreview = benchPreview;
      chip.addChild(benchPreview);

      /* Unit name — compact, below preview */
      var nameT = new PIXI.Text({
        text: "",
        style: {
          fontSize: 8,
          fill: 0xffffff,
          fontFamily: "monospace",
          fontWeight: "bold",
        },
      });
      nameT.anchor.set(0.5, 0);
      nameT.x = slotW / 2;
      nameT.y = slotH - 14;
      chip.internalNameText = nameT;
      chip.addChild(nameT);

      /* Stats removed from bench — unit preview communicates visually */
      chip.internalStatsText = { text: "" }; /* stub for compatibility */

      /* Sell moved to ShopPanel — no sell button on bench chips */
      chip.internalSellBtn = { visible: false };

      chip.x = startX + i * (slotW + gap);
      chip.y = 0;
      chip.visible = true; /* Always visible — empty slots show as dim outlines */
      chip.internalHasUnit = false;
      chip.eventMode = "static";
      chip.cursor = "pointer";
      chip.on(
        "pointertap",
        (function (idx) {
          return function () {
            if (!BenchPanel.internalChips[idx].internalHasUnit) return;
            if (BenchPanel.internalSelectedIdx === idx) {
              BenchPanel.internalSelectedIdx = -1;
            } else {
              BenchPanel.internalSelectedIdx = idx;
            }
            if (playgent.sound) playgent.sound("ui.select");
            BenchPanel.internalHighlightSelected();
            GameRenderer.internalUpdateTileHandlers();
          };
        })(i),
      );

      BenchPanel.internalChips.push(chip);
      cont.addChild(chip);
    }

    BenchPanel.internalPlacingLabel = { visible: false };
    cont.y = Layout.benchY(h);
    parent.addChild(cont);
  },

  reposition: function (w, h) {
    if (!BenchPanel.internalContainer) return;
    BenchPanel.internalContainer.y = Layout.benchY(h);
    /* Recenter slots */
    var cs = Layout.cellSize(w, h);
    var gap = 6;
    var slotW = cs;
    var totalW = BENCH_SLOTS * slotW + (BENCH_SLOTS - 1) * gap;
    var startX = (w - totalW) / 2;
    for (var i = 0; i < BenchPanel.internalChips.length; i++) {
      BenchPanel.internalChips[i].x = startX + i * (slotW + gap);
    }
  },

  update: function (benchUnits, legalActions, isSpectator) {
    BenchPanel.internalLegalActions = legalActions || [];

    var hasSell = {};
    for (var a = 0; a < BenchPanel.internalLegalActions.length; a++) {
      var act = BenchPanel.internalLegalActions[a];
      if (act.type === "sell") hasSell[act.benchIndex] = true;
    }

    var units = benchUnits || [];
    for (var i = 0; i < BENCH_SLOTS; i++) {
      var chip = BenchPanel.internalChips[i];
      var slotW = chip.internalSlotW;
      var slotH = chip.internalSlotH;
      if (i < units.length && units[i]) {
        var u = units[i];
        chip.internalHasUnit = true;
        chip.alpha = 1;
        var nm = u.name || u.unitId || "?";
        if (chip.internalNameText.text !== nm) chip.internalNameText.text = nm;

        /* Update bench preview with per-unit context */
        if (chip.internalBenchPreview) {
          var bCtx = _getUnitContext(u.unitId, u.trait);
          if (bCtx) chip.internalBenchPreview.context = bCtx;
        }

        var palette = TRAIT_PALETTES[u.trait];
        var borderColor = palette ? palette.primary : 0x2a3a4a;
        if (chip.internalLastBorderColor !== borderColor) {
          chip.internalLastBorderColor = borderColor;
          chip.internalBgNormal.clear();
          chip.internalBgNormal
            .roundRect(0, 0, slotW, slotH, 8)
            .fill({ color: 0x0f1923 })
            .stroke({ color: borderColor, width: 1 });
        }

        chip.internalSellBtn.visible = !isSpectator && !!hasSell[i];
        chip.eventMode = isSpectator ? "none" : "static";
      } else {
        chip.internalHasUnit = false;
        chip.alpha = 0.3;
        chip.internalNameText.text = "";
        chip.internalStatsText.text = "";
        chip.internalSellBtn.visible = false;
        /* Reset border to default */
        if (chip.internalLastBorderColor !== 0x2a3a4a) {
          chip.internalLastBorderColor = 0x2a3a4a;
          chip.internalBgNormal.clear();
          chip.internalBgNormal
            .roundRect(0, 0, slotW, slotH, 8)
            .fill({ color: 0x0f1923 })
            .stroke({ color: 0x2a3a4a, width: 1 });
        }
      }
    }

    if (
      BenchPanel.internalSelectedIdx >= 0 &&
      (BenchPanel.internalSelectedIdx >= units.length ||
        !units[BenchPanel.internalSelectedIdx])
    ) {
      BenchPanel.internalSelectedIdx = -1;
    }
    BenchPanel.internalHighlightSelected();
    if (
      !isSpectator &&
      window["__playgentE2ERegisterRegion"] &&
      window["__playgentE2EPixiBounds"]
    ) {
      for (var r = 0; r < BenchPanel.internalChips.length; r++) {
        var regionChip = BenchPanel.internalChips[r];
        if (
          !regionChip ||
          !regionChip.internalHasUnit ||
          regionChip.visible === false ||
          regionChip.eventMode === "none"
        )
          continue;
        window["__playgentE2ERegisterRegion"]({
          id: "bench-" + r,
          kind: "button",
          label:
            regionChip.internalNameText && regionChip.internalNameText.text
              ? regionChip.internalNameText.text
              : "bench " + r,
          actionType: "select-bench",
          rect: window["__playgentE2EPixiBounds"](regionChip, GameRenderer.app),
        });
      }
    }
  },

  internalHighlightSelected: function () {
    for (var i = 0; i < BenchPanel.internalChips.length; i++) {
      var chip = BenchPanel.internalChips[i];
      if (!chip.internalHasUnit) continue;
      Tween.killTweensOf(chip);
      if (i === BenchPanel.internalSelectedIdx) {
        chip.internalBgNormal.visible = false;
        chip.internalBgSelected.visible = true;
        Tween.to(chip, { scaleX: 1.1, scaleY: 1.1 }, 200, "backOut");
      } else {
        chip.internalBgNormal.visible = true;
        chip.internalBgSelected.visible = false;
        Tween.to(chip, { scaleX: 1, scaleY: 1 }, 150, "easeOut");
      }
    }
    /* Update sell button in shop panel */
    if (typeof ShopPanel !== "undefined" && ShopPanel.updateSellButton) {
      ShopPanel.updateSellButton();
    }
  },
};
