/* ===== SCENE DIRECTOR ===== */
/* Orchestrates all visual modules. Diffs state, queues animations with dramatic timing.
   Single entry point: handleStateChange(view, legalActions, context).
   Queue cap at C.QUEUE_MAX prevents unbounded growth during reconnect. */

var SceneDirector = {
  internalPrevView: null,
  internalPendingView: null,
  internalPendingLegalActions: null,
  internalPendingContext: null,
  internalQueue: [],
  internalPlaying: false,
  internalW: 0,
  internalH: 0,
  internalRenderDom: null,
  internalMyId: null,
  internalIsSpectator: false,
  internalIsDead: false,

  handleStateChange: function (view, legalActions, context) {
    SceneDirector.internalMyId = context.myId || null;
    SceneDirector.internalIsSpectator =
      !context.myId || (view.players || []).indexOf(context.myId) === -1;
    SceneDirector.internalIsDead =
      context.myId && view.alive && !view.alive[context.myId];

    var prev = SceneDirector.internalPrevView;

    /* Buffer state while queue is playing */
    if (SceneDirector.internalPlaying) {
      SceneDirector.internalPendingView = view;
      SceneDirector.internalPendingLegalActions = legalActions;
      SceneDirector.internalPendingContext = context;
      return;
    }

    /* First render / reconnect: no animations */
    if (!prev) {
      SceneDirector.internalRender(view, legalActions, context);
      SceneDirector.internalPrevView = view;
      return;
    }

    /* Ensure player positions are current before queuing vote lines */
    PlayerCircle.update(view, context.players || [], context.myId);

    /* Build animation queue from state diff */
    var queue = SceneDirector.internalBuildQueue(prev, view);
    SceneDirector.internalPrevView = view;

    if (queue.length > 0) {
      SceneDirector.internalQueue = queue;
      SceneDirector.internalPlaying = true;
      SceneDirector.internalStep(view, legalActions, context, 0);
    } else {
      SceneDirector.internalRender(view, legalActions, context);
    }
  },

  /* ── Queue builder: diff prev vs current ── */

  internalBuildQueue: function (prev, view) {
    var q = [];
    var phaseChanged = prev.phase !== view.phase;

    if (phaseChanged) {
      q.push({
        fn: function () {
          Atmosphere.transition(view.phase);
        },
        dur: C.PHASE_TRANSITION_DUR * 0.5,
      });
      if (view.phase !== "day_result") {
        q.push({
          fn: function () {
            VoteLines.fadeOut();
          },
          dur: C.VOTE_LINE_TEARDOWN,
        });
      }
    }

    /* Day result: vote bolts + elimination */
    if (view.phase === "day_result" && phaseChanged) {
      q.push({
        fn: function (done) {
          VoteLines.drawVotes(view.votes, done);
        },
        delay: 300,
        async: true,
      });
      if (view.eliminated) {
        q.push({
          fn: function () {
            SceneDirector.internalRevealAt(
              view.eliminated,
              C.FLASH_RED,
              C.roleHex("werewolf"),
            );
          },
          dur: C.ELIMINATION_REVEAL,
          delay: C.ELIMINATION_BUILDUP,
        });
      }
    }

    /* Night result: kill or save */
    if (view.phase === "night_result" && phaseChanged) {
      if (view.nightKill) {
        q.push({
          fn: function () {
            SceneDirector.internalRevealAt(
              view.nightKill,
              C.FLASH_RED,
              C.BLOOD_MIST,
            );
          },
          dur: C.NIGHT_KILL_REVEAL,
          delay: C.NIGHT_KILL_BUILDUP,
        });
      } else {
        q.push({
          fn: function () {
            Effects.flash(
              C.FLASH_GREEN,
              SceneDirector.internalW,
              SceneDirector.internalH,
              400,
            );
          },
          dur: C.DOCTOR_SAVE_REVEAL,
          delay: C.DOCTOR_SAVE_BUILDUP,
        });
      }
    }

    /* Game over cinematic */
    if (view.phase === "gameOver" && phaseChanged) {
      var wolfWin = view.internalPendingWinnerTeam === "wolves";
      q.push({
        fn: function () {
          if (wolfWin) {
            Atmosphere.wolfWin();
          } else {
            Atmosphere.villageWin();
          }
          Effects.flash(
            wolfWin ? C.FLASH_RED : C.FLASH_GOLD,
            SceneDirector.internalW,
            SceneDirector.internalH,
            800,
          );
        },
        dur: C.GAME_END_REVEAL,
        delay: C.GAME_END_BUILDUP,
      });
    }

    /* Spectator night actions */
    if (
      (SceneDirector.internalIsSpectator || SceneDirector.internalIsDead) &&
      view.phase === "night" &&
      (view.werewolfVotes || view.seerTarget || view.doctorTarget)
    ) {
      q.push({
        fn: function () {
          VoteLines.drawNightActions(view);
        },
        dur: 300,
      });
    }

    /* Queue cap: skip to immediate render if overwhelmed */
    if (q.length > C.QUEUE_MAX) {
      Tween.killAll();
      VoteLines.clear();
      Effects.clearBursts();
      return [];
    }

    return q;
  },

  /* ── Shared reveal effect (flash + shake + burst at player position) ── */

  internalRevealAt: function (playerId, flashColor, burstColor) {
    var pos = PlayerCircle.getPosition(playerId);
    if (!pos) return;
    Effects.flash(
      flashColor,
      SceneDirector.internalW,
      SceneDirector.internalH,
      400,
    );
    Effects.shake();
    Effects.burst(pos.x, pos.y, 10, burstColor);
  },

  /* ── Queue processor ── */

  internalStep: function (view, legalActions, context, index) {
    if (index >= SceneDirector.internalQueue.length) {
      SceneDirector.internalPlaying = false;
      SceneDirector.internalQueue = [];
      SceneDirector.internalRender(view, legalActions, context);
      SceneDirector.internalDrainPending();
      return;
    }

    var s = SceneDirector.internalQueue[index];
    setTimeout(function () {
      if (s.async) {
        s.fn(function () {
          SceneDirector.internalStep(view, legalActions, context, index + 1);
        });
      } else {
        s.fn();
        setTimeout(function () {
          SceneDirector.internalStep(view, legalActions, context, index + 1);
        }, s.dur || 0);
      }
    }, s.delay || 0);
  },

  internalDrainPending: function () {
    if (!SceneDirector.internalPendingView) return;
    var v = SceneDirector.internalPendingView;
    var la = SceneDirector.internalPendingLegalActions;
    var c = SceneDirector.internalPendingContext;
    SceneDirector.internalPendingView = null;
    SceneDirector.internalPendingLegalActions = null;
    SceneDirector.internalPendingContext = null;
    SceneDirector.handleStateChange(v, la, c);
  },

  /* ── Immediate render (no animation) ── */

  internalRender: function (view, legalActions, context) {
    PlayerCircle.update(view, context.players || [], context.myId);
    Atmosphere.transition(view.phase);
    if (
      (SceneDirector.internalIsSpectator || SceneDirector.internalIsDead) &&
      view.phase === "night"
    ) {
      VoteLines.drawNightActions(view);
    }
    if (SceneDirector.internalRenderDom)
      SceneDirector.internalRenderDom(view, legalActions, context);
  },

  resize: function (w, h) {
    SceneDirector.internalW = w;
    SceneDirector.internalH = h;
  },
};
