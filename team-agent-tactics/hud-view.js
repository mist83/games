/* ===== HUD VIEW (1v1/2v2 — team HP bars, VS overlay, round counter, traits) ===== */

var TRAIT_BONUSES = {
  warrior: "+2 ATK",
  guardian: "Armor 2",
  assassin: "Leap 1.5x",
  mage: "Splash 2",
  healer: "Heal 3",
  ranger: "+3 ATK",
};

var HudView = {
  internalContainer: null,
  internalEntries: [] /* pre-allocated for MAX_PLAYERS (12) */,
  internalRoundText: null,
  internalPhaseText: null,
  internalPhaseBannerBg: null,
  internalVsText: null /* "VS PlayerName" during battle */,
  internalTraitIcons: [],
  internalLastPhase: null,
  internalPrevTraitCounts: null,
  internalPrevFollowedId: null,
  internalPrevHp: {},
  internalHpInitialized: false,
  internalDeltaTexts: [],
  internalIncomeText: null,
  internalPrevGold: null,
  internalPrevRound: null,
  internalElimBannerText: null,
  internalElimBannerBg: null,
  internalBattleOutcomeText: null,
  internalLastBattleOutcome: null,

  create: function (parent, w, h) {
    var cont = new PIXI.Container();
    cont.label = "hud";
    cont.interactiveChildren = false;
    HudView.internalContainer = cont;

    /* Round counter + phase badge — single line, top center */
    var roundText = new PIXI.Text({
      text: "Round 1/10",
      style: {
        fontSize: 16,
        fill: 0xffd700,
        fontFamily: "monospace",
        fontWeight: "bold",
      },
    });
    roundText.anchor.set(1, 0);
    roundText.x = w / 2 - 6;
    roundText.y = 4;
    HudView.internalRoundText = roundText;
    cont.addChild(roundText);

    /* Phase banner — right of round text on same line */
    var bannerBg = new PIXI.Graphics();
    bannerBg.roundRect(0, -1, 64, 20, 4).fill({ color: 0xffffff });
    bannerBg.tint = 0x1e40af;
    bannerBg.x = w / 2 + 2;
    bannerBg.y = 5;
    bannerBg.alpha = 0.8;
    HudView.internalPhaseBannerBg = bannerBg;
    cont.addChild(bannerBg);

    /* Phase label */
    var phaseText = new PIXI.Text({
      text: "SHOP",
      style: {
        fontSize: 12,
        fill: 0xffffff,
        fontFamily: "monospace",
        fontWeight: "bold",
      },
    });
    phaseText.anchor.set(0.5, 0.5);
    phaseText.x = w / 2 + 34;
    phaseText.y = 14;
    HudView.internalPhaseText = phaseText;
    cont.addChild(phaseText);

    /* VS overlay (top, below round/phase) */
    var vsText = new PIXI.Text({
      text: "",
      style: {
        fontSize: 13,
        fill: 0xffffff,
        fontFamily: "monospace",
        fontWeight: "bold",
        dropShadow: { color: "#000000", blur: 4, distance: 2 },
      },
    });
    vsText.anchor.set(0.5, 0.5);
    vsText.x = w / 2;
    vsText.y = 30;
    vsText.visible = false;
    HudView.internalVsText = vsText;
    cont.addChild(vsText);

    /* Trait pills — colored pill with short bonus label, below own board.
       Inactive: dim colored dot. Active: bright pill with readable bonus text.
       Labels: +2ATK, ARM 2, LEAP, SPL 2, HEAL, +3ATK */
    var TRAIT_LABELS = {
      warrior: "+2ATK",
      guardian: "ARM 2",
      assassin: "LEAP",
      mage: "SPL 2",
      healer: "HEAL",
      ranger: "+3ATK",
    };
    var traitCs = Layout.cellSize(w, h);
    var ownBoardBottom = Layout.cellPos(7, "own", w, h).y + traitCs / 2;
    var traitBarY = ownBoardBottom + 10;
    var pillW = 48;
    var pillGap = 6;
    var totalPillsW =
      TRAIT_NAMES.length * pillW + (TRAIT_NAMES.length - 1) * pillGap;
    var pillStartX = (w - totalPillsW) / 2;
    for (var t = 0; t < TRAIT_NAMES.length; t++) {
      var traitName = TRAIT_NAMES[t];
      var palette = TRAIT_PALETTES[traitName];
      var icon = new PIXI.Container();

      /* Pill background — visible when active */
      var pillBg = new PIXI.Graphics();
      pillBg.roundRect(0, -8, pillW, 16, 4).fill({ color: palette.primary });
      pillBg.alpha = 0;
      icon.internalPillBg = pillBg;
      icon.addChild(pillBg);

      /* Small colored dot — always visible */
      var dot = new PIXI.Graphics();
      dot.circle(pillW / 2, 0, 4).fill({ color: palette.primary });
      icon.internalDot = dot;
      icon.addChild(dot);

      /* Bonus label — shown when active */
      var labelT = new PIXI.Text({
        text: TRAIT_LABELS[traitName] || "",
        style: {
          fontSize: 9,
          fill: 0xffffff,
          fontFamily: "monospace",
          fontWeight: "bold",
        },
      });
      labelT.anchor.set(0.5, 0.5);
      labelT.x = pillW / 2;
      labelT.y = 0;
      labelT.visible = false;
      icon.internalLabelText = labelT;
      icon.addChild(labelT);

      /* Stubs for update logic compatibility */
      icon.internalCircle = dot;
      icon.internalCountText = { text: "" };
      icon.internalNameText = { text: "" };
      icon.internalBonusText = { alpha: 0 };

      icon.x = pillStartX + t * (pillW + pillGap);
      icon.y = traitBarY;
      icon.internalTraitName = traitName;
      icon.alpha = 0.3;
      HudView.internalTraitIcons.push(icon);
      cont.addChild(icon);
    }

    /* Leaderboard entries (right side) — pre-create MAX_PLAYERS rows */
    var lbX = w - 20;
    for (var e = 0; e < MAX_PLAYERS; e++) {
      var entry = new PIXI.Container();
      entry.visible = false;

      /* Rank text */
      var rankT = new PIXI.Text({
        text: "#" + (e + 1),
        style: { fontSize: 9, fill: 0x888888, fontFamily: "monospace" },
      });
      rankT.anchor.set(1, 0.5);
      rankT.x = -110;
      entry.internalRankText = rankT;
      entry.addChild(rankT);

      /* Player name */
      var playerNameT = new PIXI.Text({
        text: "",
        style: { fontSize: 9, fill: 0xffffff, fontFamily: "monospace" },
      });
      playerNameT.anchor.set(1, 0.5);
      playerNameT.x = -58;
      entry.internalNameText = playerNameT;
      entry.addChild(playerNameT);

      /* HP bar background */
      var hpBg = new PIXI.Graphics();
      hpBg.roundRect(-54, -5, 44, 10, 2).fill({ color: 0x1a1a2e });
      entry.internalHpBg = hpBg;
      entry.addChild(hpBg);

      /* HP bar fill */
      var hpFill = new PIXI.Graphics();
      hpFill.roundRect(-54, -5, 42, 10, 2).fill({ color: 0xffffff });
      entry.internalHpFill = hpFill;
      entry.addChild(hpFill);

      /* HP number */
      var hpNum = new PIXI.Text({
        text: "50",
        style: { fontSize: 8, fill: 0xffffff, fontFamily: "monospace" },
      });
      hpNum.anchor.set(1, 0.5);
      hpNum.x = 0;
      entry.internalHpNum = hpNum;
      entry.addChild(hpNum);

      entry.x = lbX;
      entry.y = 42 + e * 22;
      entry.internalLastHp = -1;
      HudView.internalEntries.push(entry);
      cont.addChild(entry);
    }

    /* Pre-create 12 delta Text objects for damage indicators */
    for (var d = 0; d < MAX_PLAYERS; d++) {
      var deltaT = new PIXI.Text({
        text: "",
        style: {
          fontSize: 8,
          fill: 0xef4444,
          fontFamily: "monospace",
          fontWeight: "bold",
        },
      });
      deltaT.anchor.set(0, 0.5);
      deltaT.x = 6;
      deltaT.y = 0;
      deltaT.alpha = 0;
      HudView.internalDeltaTexts.push(deltaT);
      HudView.internalEntries[d].addChild(deltaT);
    }

    /* Income popup text */
    var incomeT = new PIXI.Text({
      text: "",
      style: {
        fontSize: 14,
        fill: 0xffd700,
        fontFamily: "monospace",
        fontWeight: "bold",
      },
    });
    incomeT.anchor.set(0, 0.5);
    incomeT.x = 6;
    incomeT.y = h - 160;
    incomeT.alpha = 0;
    HudView.internalIncomeText = incomeT;
    cont.addChild(incomeT);

    /* Elimination banner */
    var elimBg = new PIXI.Graphics();
    elimBg.roundRect(-160, -18, 320, 36, 6).fill({ color: 0x7f1d1d });
    elimBg.x = w / 2;
    elimBg.y = h * 0.25;
    elimBg.alpha = 0;
    elimBg.visible = false;
    HudView.internalElimBannerBg = elimBg;
    cont.addChild(elimBg);

    var elimT = new PIXI.Text({
      text: "",
      style: {
        fontSize: 16,
        fill: 0xef4444,
        fontFamily: "monospace",
        fontWeight: "bold",
        dropShadow: { color: "#000000", blur: 4, distance: 2 },
      },
    });
    elimT.anchor.set(0.5, 0.5);
    elimT.x = w / 2;
    elimT.y = h * 0.25;
    elimT.alpha = 0;
    elimT.visible = false;
    HudView.internalElimBannerText = elimT;
    cont.addChild(elimT);

    /* Battle outcome text (top center, below VS) */
    var battleOutcome = new PIXI.Text({
      text: "",
      style: {
        fontSize: 16,
        fill: 0x22c55e,
        fontFamily: "monospace",
        fontWeight: "bold",
        dropShadow: { color: "#000000", blur: 4, distance: 2 },
      },
    });
    battleOutcome.anchor.set(0.5, 0.5);
    battleOutcome.x = w / 2;
    battleOutcome.y = 46;
    battleOutcome.visible = false;
    HudView.internalBattleOutcomeText = battleOutcome;
    cont.addChild(battleOutcome);

    parent.addChild(cont);
  },

  reposition: function (w, h) {
    if (!HudView.internalContainer) return;
    HudView.internalRoundText.x = w / 2 - 6;
    HudView.internalPhaseBannerBg.x = w / 2 + 2;
    HudView.internalPhaseText.x = w / 2 + 34;
    HudView.internalVsText.x = w / 2;
    var lbX = w - 20;
    for (var e = 0; e < HudView.internalEntries.length; e++) {
      HudView.internalEntries[e].x = lbX;
    }
    if (HudView.internalBattleOutcomeText)
      HudView.internalBattleOutcomeText.x = w / 2;
    if (HudView.internalIncomeText) HudView.internalIncomeText.y = h - 160;
    if (HudView.internalElimBannerBg) {
      HudView.internalElimBannerBg.x = w / 2;
      HudView.internalElimBannerBg.y = h * 0.25;
    }
    if (HudView.internalElimBannerText) {
      HudView.internalElimBannerText.x = w / 2;
      HudView.internalElimBannerText.y = h * 0.25;
    }
    /* Reposition trait pills — directly below own board */
    var traitCs = Layout.cellSize(w, h);
    var ownBoardBottom = Layout.cellPos(7, "own", w, h).y + traitCs / 2;
    var traitBarY = ownBoardBottom + 10;
    var pillW = 48;
    var pillGap = 6;
    var totalPillsW =
      TRAIT_NAMES.length * pillW + (TRAIT_NAMES.length - 1) * pillGap;
    var pillStartX = (w - totalPillsW) / 2;
    for (var ti = 0; ti < HudView.internalTraitIcons.length; ti++) {
      HudView.internalTraitIcons[ti].x = pillStartX + ti * (pillW + pillGap);
      HudView.internalTraitIcons[ti].y = traitBarY;
    }
  },

  update: function (view, myId, context) {
    /* Round counter */
    var roundStr = "Round " + (view.round || 1) + "/" + MAX_ROUNDS;
    if (HudView.internalRoundText.text !== roundStr)
      HudView.internalRoundText.text = roundStr;

    /* Phase banner with slide animation */
    var phaseLabels = {
      shop: "SHOP",
      battle: "BATTLE",
      battleResult: "RESULTS",
      gameOver: "GAME OVER",
    };
    var phaseColors = {
      shop: 0x1e40af,
      battle: 0x991b1b,
      battleResult: 0x92400e,
      gameOver: 0x854d0e,
    };
    var phaseStr = phaseLabels[view.phase] || view.phase;
    if (HudView.internalLastPhase !== view.phase) {
      HudView.internalLastPhase = view.phase;
      Tween.killTweensOf(HudView.internalPhaseText);
      Tween.killTweensOf(HudView.internalPhaseBannerBg);
      Tween.to(
        HudView.internalPhaseText,
        { y: -16, alpha: 0 },
        200,
        "easeIn",
        function () {
          HudView.internalPhaseText.text = phaseStr;
          HudView.internalPhaseText.y = 44;
          HudView.internalPhaseText.alpha = 0;
          Tween.to(
            HudView.internalPhaseText,
            { y: 14, alpha: 1 },
            300,
            "backOut",
          );
        },
      );
      var bgColor = phaseColors[view.phase] || 0x1e40af;
      Tween.to(
        HudView.internalPhaseBannerBg,
        { y: -25, alpha: 0 },
        200,
        "easeIn",
        function () {
          HudView.internalPhaseBannerBg.tint = bgColor;
          HudView.internalPhaseBannerBg.y = 35;
          HudView.internalPhaseBannerBg.alpha = 0;
          Tween.to(
            HudView.internalPhaseBannerBg,
            { y: 5, alpha: 0.8 },
            300,
            "backOut",
          );
        },
      );
    }

    /* VS text removed — was hard to read over the board */
    HudView.internalVsText.visible = false;

    /* Battle outcome banner + damage animation — shown during battleResult phase */
    if (HudView.internalBattleOutcomeText) {
      if (
        view.phase === "battleResult" &&
        view.battleResult &&
        HudView.internalLastBattleOutcome !== view.round
      ) {
        HudView.internalLastBattleOutcome = view.round;
        var br = view.battleResult;
        if (br.won) {
          HudView.internalBattleOutcomeText.text = "VICTORY!";
          HudView.internalBattleOutcomeText.style.fill = 0x22c55e;
        } else if (br.lost) {
          var dmgStr = br.damage > 0 ? "  -" + br.damage + " HP" : "";
          HudView.internalBattleOutcomeText.text = "DEFEAT!" + dmgStr;
          HudView.internalBattleOutcomeText.style.fill = 0xef4444;
        } else {
          HudView.internalBattleOutcomeText.text = "DRAW!";
          HudView.internalBattleOutcomeText.style.fill = 0x888888;
        }
        HudView.internalBattleOutcomeText.visible = true;
        HudView.internalBattleOutcomeText.alpha = 0;
        HudView.internalBattleOutcomeText.scale.set(2);
        Tween.killTweensOf(HudView.internalBattleOutcomeText);
        Tween.to(
          HudView.internalBattleOutcomeText,
          { alpha: 1, scaleX: 1, scaleY: 1 },
          400,
          "backOut",
        );

        /* Damage sparks on defeat */
        if (br.lost && br.damage > 0) {
          var w = GameRenderer.app ? GameRenderer.app.screen.width : 375;
          EffectPool.emitSparks(w / 2, 46, 8 + br.damage * 2, 0xef4444);
          /* Screen shake */
          if (GameRenderer.gameWorld) {
            var gw = GameRenderer.gameWorld;
            Tween.killTweensOf(gw);
            gw.x = 6;
            Tween.to(gw, { x: -6 }, 50, "linear", function () {
              Tween.to(gw, { x: 4 }, 50, "linear", function () {
                Tween.to(gw, { x: -2 }, 50, "linear", function () {
                  Tween.to(gw, { x: 0 }, 50, "linear");
                });
              });
            });
          }
        }
      } else if (view.phase !== "battleResult" && view.phase !== "battle") {
        if (HudView.internalBattleOutcomeText.visible) {
          HudView.internalBattleOutcomeText.visible = false;
          HudView.internalLastBattleOutcome = null;
        }
      }
    }

    /* Trait entries — expanded with name, count, bonus */
    var myTraits =
      view.activeTraits && myId && view.activeTraits[myId]
        ? view.activeTraits[myId]
        : {};
    var followedChanged =
      HudView.internalPrevFollowedId !== null &&
      HudView.internalPrevFollowedId !== myId;
    for (var t = 0; t < HudView.internalTraitIcons.length; t++) {
      var icon = HudView.internalTraitIcons[t];
      var traitName = icon.internalTraitName;
      var count = myTraits[traitName] || 0;
      var countStr = count + "/2";
      if (icon.internalCountText.text !== countStr)
        icon.internalCountText.text = countStr;

      var isActive = count >= 2;
      var palette = TRAIT_PALETTES[traitName];
      icon.internalCircle.tint = isActive ? palette.primary : palette.dark;

      /* Activation flash detection */
      var prevCount = HudView.internalPrevTraitCounts
        ? HudView.internalPrevTraitCounts[traitName] || 0
        : 0;
      var justActivated =
        !followedChanged &&
        HudView.internalPrevTraitCounts &&
        prevCount < 2 &&
        count >= 2;
      var justDeactivated =
        !followedChanged &&
        HudView.internalPrevTraitCounts &&
        prevCount >= 2 &&
        count < 2;

      if (isActive) {
        icon.alpha = 1;
        if (icon.internalPillBg) icon.internalPillBg.alpha = 0.35;
        if (icon.internalDot) icon.internalDot.visible = false;
        if (icon.internalLabelText) icon.internalLabelText.visible = true;
        if (justActivated) {
          Tween.killTweensOf(icon);
          icon.scaleX = 1.3;
          icon.scaleY = 1.3;
          Tween.to(icon, { scaleX: 1, scaleY: 1 }, 400, "backOut");
        }
      } else {
        icon.alpha = 0.3;
        if (icon.internalPillBg) icon.internalPillBg.alpha = 0;
        if (icon.internalDot) icon.internalDot.visible = true;
        if (icon.internalLabelText) icon.internalLabelText.visible = false;
        if (justDeactivated) {
          Tween.killTweensOf(icon);
          Tween.to(icon, { scaleX: 1, scaleY: 1, alpha: 0.3 }, 300, "easeOut");
        } else {
          icon.scaleX = 1;
          icon.scaleY = 1;
        }
      }
    }
    HudView.internalPrevTraitCounts = {};
    for (var pt = 0; pt < TRAIT_NAMES.length; pt++) {
      HudView.internalPrevTraitCounts[TRAIT_NAMES[pt]] =
        myTraits[TRAIT_NAMES[pt]] || 0;
    }
    HudView.internalPrevFollowedId = myId;

    /* Team HP bars — repurpose first 2 leaderboard entries as alpha/beta HP */
    var teams = view.teams || { alpha: { hp: 50 }, beta: { hp: 50 } };
    var teamData = [
      { id: "alpha", hp: teams.alpha.hp, color: 0x60a5fa, label: "Alpha" },
      { id: "beta", hp: teams.beta.hp, color: 0xef4444, label: "Beta" },
    ];
    /* Determine which team the viewer is on */
    var myTeamId =
      myId && view.players?.[myId] ? view.players[myId].teamId : null;
    for (var e = 0; e < MAX_PLAYERS; e++) {
      var entry = HudView.internalEntries[e];
      if (e >= teamData.length) {
        entry.visible = false;
        continue;
      }
      entry.visible = true;
      var td = teamData[e];
      var isMyTeam = td.id === myTeamId;

      /* Team label instead of rank */
      if (entry.internalRankText.text !== "#" + (e + 1))
        entry.internalRankText.text = "#" + (e + 1);

      /* Team name */
      var teamLabel = td.label;
      if (entry.internalNameText.text !== teamLabel)
        entry.internalNameText.text = teamLabel;
      entry.internalNameText.style.fill = isMyTeam ? 0x60a5fa : td.color;

      /* HP bar */
      var hp = td.hp;
      if (entry.internalLastHp !== hp) {
        entry.internalLastHp = hp;
        var ratio = hp / MAX_HP;
        if (ratio < 0) ratio = 0;
        if (ratio > 1) ratio = 1;
        entry.internalHpFill.scale.x = ratio;
        entry.internalHpFill.tint = td.color;
        entry.internalHpFill.visible = ratio > 0;
        entry.internalHpNum.text = "" + hp;
      }

      /* Damage delta indicators */
      var deltaText = HudView.internalDeltaTexts[e];
      if (deltaText) {
        if (!HudView.internalHpInitialized) {
          HudView.internalPrevHp[td.id] = hp;
        } else if (
          HudView.internalPrevHp[td.id] !== undefined &&
          HudView.internalPrevHp[td.id] !== hp
        ) {
          var delta = hp - HudView.internalPrevHp[td.id];
          if (delta < 0) {
            deltaText.text = "(" + delta + ")";
            deltaText.style.fill = 0xef4444;
          }
          Tween.killTweensOf(deltaText);
          deltaText.alpha = 1;
          Tween.to(deltaText, { alpha: 0 }, 3000, "easeIn");
          HudView.internalPrevHp[td.id] = hp;
        }
      }

      entry.alpha = 1;
      entry.internalRankText.style.fill = 0x888888;
    }
    if (!HudView.internalHpInitialized && teamData.length > 0)
      HudView.internalHpInitialized = true;

    /* Income popup — on round change, round > 1 */
    var myPlayer = myId && view.players ? view.players[myId] : null;
    var currentRound = view.round || 1;
    var currentGold = myPlayer ? myPlayer.gold : 0;
    if (
      HudView.internalPrevRound !== null &&
      currentRound !== HudView.internalPrevRound &&
      currentRound > 1 &&
      HudView.internalPrevGold !== null
    ) {
      var goldDelta = currentGold - HudView.internalPrevGold;
      if (goldDelta > 0 && HudView.internalIncomeText) {
        HudView.internalIncomeText.text = "+" + goldDelta + " Gold";
        Tween.killTweensOf(HudView.internalIncomeText);
        HudView.internalIncomeText.alpha = 0;
        Tween.to(
          HudView.internalIncomeText,
          { alpha: 1 },
          200,
          "easeOut",
          function () {
            /* Hold 2s at full alpha, then fade out 0.3s — use a slow 2300ms tween */
            Tween.to(HudView.internalIncomeText, { alpha: 0 }, 2300, "easeIn");
          },
        );
      }
    }
    HudView.internalPrevRound = currentRound;
    HudView.internalPrevGold = currentGold;
  },

  _showElimBanner: function (playerName, placement) {
    if (!HudView.internalElimBannerText) return;
    var suffix = internalOrdinal(placement || 0);
    HudView.internalElimBannerText.text =
      internalTruncName(playerName) + " ELIMINATED! " + suffix;
    HudView.internalElimBannerText.visible = true;
    HudView.internalElimBannerBg.visible = true;

    Tween.killTweensOf(HudView.internalElimBannerText);
    Tween.killTweensOf(HudView.internalElimBannerBg);
    HudView.internalElimBannerText.alpha = 1;
    HudView.internalElimBannerBg.alpha = 0.9;

    Tween.to(
      HudView.internalElimBannerText,
      { alpha: 0 },
      2500,
      "easeIn",
      function () {
        HudView.internalElimBannerText.visible = false;
      },
    );
    Tween.to(
      HudView.internalElimBannerBg,
      { alpha: 0 },
      2500,
      "easeIn",
      function () {
        HudView.internalElimBannerBg.visible = false;
      },
    );

    /* Stage pulse */
    if (GameRenderer?.app?.stage) {
      var stage = GameRenderer.app.stage;
      Tween.killTweensOf(stage);
      stage.alpha = 0.9;
      Tween.to(stage, { alpha: 1 }, 200, "easeOut");
    }
  },
};

/* Helper: truncate player name with ellipsis */
function internalTruncName(name) {
  if (!name) return "?";
  if (name.length > 10) return name.substring(0, 9) + "…";
  return name;
}

/* Helper: ordinal suffix (1st, 2nd, 3rd, etc.) */
function internalOrdinal(n) {
  var s = ["th", "st", "nd", "rd"];
  var v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* ===== GAME OVER OVERLAY (team win/loss) ===== */

var GameOverOverlay = {
  internalContainer: null,
  internalBg: null,
  internalTitleText: null,
  internalSubtitleText: null,
  internalElimBanner: null,
  internalElimBannerBg: null,

  create: function (parent, w, h) {
    var cont = new PIXI.Container();
    cont.label = "gameOverOverlay";
    cont.visible = false;
    cont.interactiveChildren = false;
    GameOverOverlay.internalContainer = cont;

    var bg = new PIXI.Graphics();
    bg.rect(0, 0, w, h).fill({ color: 0x000000 });
    bg.alpha = 0.7;
    GameOverOverlay.internalBg = bg;
    cont.addChild(bg);

    var title = new PIXI.Text({
      text: "",
      style: {
        fontSize: 36,
        fill: 0xffd700,
        fontFamily: "monospace",
        fontWeight: "bold",
        align: "center",
      },
    });
    title.anchor.set(0.5, 0.5);
    title.x = w / 2;
    title.y = h / 2 - 30;
    GameOverOverlay.internalTitleText = title;
    cont.addChild(title);

    var subtitle = new PIXI.Text({
      text: "",
      style: {
        fontSize: 16,
        fill: 0xcccccc,
        fontFamily: "monospace",
        align: "center",
      },
    });
    subtitle.anchor.set(0.5, 0.5);
    subtitle.x = w / 2;
    subtitle.y = h / 2 + 20;
    GameOverOverlay.internalSubtitleText = subtitle;
    cont.addChild(subtitle);

    parent.addChild(cont);

    /* Elimination banner — separate from game-over overlay, always on top */
    var elimBannerBg = new PIXI.Graphics();
    elimBannerBg.roundRect(-160, -20, 320, 40, 6).fill({ color: 0x7f1d1d });
    elimBannerBg.alpha = 0.9;
    elimBannerBg.x = w / 2;
    elimBannerBg.y = h * 0.3;
    elimBannerBg.visible = false;
    GameOverOverlay.internalElimBannerBg = elimBannerBg;
    parent.addChild(elimBannerBg);

    var elimBanner = new PIXI.Text({
      text: "",
      style: {
        fontSize: 18,
        fill: 0xef4444,
        fontFamily: "monospace",
        fontWeight: "bold",
        dropShadow: { color: "#000000", blur: 4, distance: 2 },
      },
    });
    elimBanner.anchor.set(0.5, 0.5);
    elimBanner.x = w / 2;
    elimBanner.y = h * 0.3;
    elimBanner.visible = false;
    GameOverOverlay.internalElimBanner = elimBanner;
    parent.addChild(elimBanner);
  },

  reposition: function (w, h) {
    if (!GameOverOverlay.internalContainer) return;
    GameOverOverlay.internalBg.clear();
    GameOverOverlay.internalBg.rect(0, 0, w, h).fill({ color: 0x000000 });
    GameOverOverlay.internalTitleText.x = w / 2;
    GameOverOverlay.internalTitleText.y = h / 2 - 30;
    GameOverOverlay.internalSubtitleText.x = w / 2;
    GameOverOverlay.internalSubtitleText.y = h / 2 + 20;
    if (GameOverOverlay.internalElimBanner) {
      GameOverOverlay.internalElimBanner.x = w / 2;
      GameOverOverlay.internalElimBanner.y = h * 0.3;
    }
    if (GameOverOverlay.internalElimBannerBg) {
      GameOverOverlay.internalElimBannerBg.x = w / 2;
      GameOverOverlay.internalElimBannerBg.y = h * 0.3;
    }
  },

  /**
   * Show game-over with team result.
   * @param {boolean} won - Whether the viewer's team won.
   * @param {{ alpha: { hp: number }, beta: { hp: number } } | null} teams - Final team health totals.
   * @param {string | null} winningTeam - Winning team id.
   */
  show: function (won, teams, winningTeam) {
    if (!GameOverOverlay.internalContainer) return;

    if (won) {
      GameOverOverlay.internalTitleText.text = "VICTORY!";
      GameOverOverlay.internalTitleText.style.fill = 0xffd700;
      GameOverOverlay.internalSubtitleText.text = "Your team wins!";
    } else {
      GameOverOverlay.internalTitleText.text = "DEFEAT";
      GameOverOverlay.internalTitleText.style.fill = 0xef4444;
      var wt = winningTeam || "unknown";
      GameOverOverlay.internalSubtitleText.text = "Team " + wt + " wins";
    }
    if (teams) {
      GameOverOverlay.internalSubtitleText.text +=
        "  (" + teams.alpha.hp + " vs " + teams.beta.hp + " HP)";
    }

    GameOverOverlay.internalContainer.visible = true;
    GameOverOverlay.internalContainer.alpha = 0;
    Tween.to(GameOverOverlay.internalContainer, { alpha: 1 }, 500, "easeOut");
  },

  hide: function () {
    if (GameOverOverlay.internalContainer)
      GameOverOverlay.internalContainer.visible = false;
  },

  /**
   * Show elimination banner briefly.
   * @param {string} playerName - Name of the eliminated player.
   * @param {number} placement - Final placement for that player.
   */
  showElimination: function (playerName, placement) {
    if (!GameOverOverlay.internalElimBanner) return;
    var suffix = internalOrdinal(placement);
    GameOverOverlay.internalElimBanner.text =
      internalTruncName(playerName) + " ELIMINATED! " + suffix + " place";
    GameOverOverlay.internalElimBanner.visible = true;
    GameOverOverlay.internalElimBanner.alpha = 1;
    if (GameOverOverlay.internalElimBannerBg) {
      GameOverOverlay.internalElimBannerBg.visible = true;
      GameOverOverlay.internalElimBannerBg.alpha = 0.9;
    }

    Tween.killTweensOf(GameOverOverlay.internalElimBanner);
    Tween.killTweensOf(GameOverOverlay.internalElimBannerBg);

    /* Linger ~2s then fade — easeIn keeps alpha near 1.0 for first ~80% of duration */
    Tween.to(
      GameOverOverlay.internalElimBanner,
      { alpha: 0 },
      2600,
      "easeIn",
      function () {
        GameOverOverlay.internalElimBanner.visible = false;
      },
    );
    if (GameOverOverlay.internalElimBannerBg) {
      Tween.to(
        GameOverOverlay.internalElimBannerBg,
        { alpha: 0 },
        2600,
        "easeIn",
        function () {
          GameOverOverlay.internalElimBannerBg.visible = false;
        },
      );
    }
  },
};
