/* ===== VOTE LINES ===== */
/* Spectral accusation bolts: glowing projectile from voter to target,
   tapered smoke trail (big puffs at voter, tight dots at target),
   pulsing accusation rings on targets.
   All visual params from C.TRAIL_* and C.BOLT_* constants. */

var VoteLines = {
  internalGfx: null,
  internalBolts: [],
  internalMarks: [],
  internalVisible: false,
  internalCompletedCount: 0,
  internalTotalCount: 0,
  internalOnAllComplete: null,

  create: function (layer) {
    var gfx = new PIXI.Graphics();
    layer.addChild(gfx);
    VoteLines.internalGfx = gfx;
  },

  /* ── Public API ── */

  drawVotes: function (votes, onComplete) {
    VoteLines.clear();
    if (!votes) {
      if (onComplete) onComplete();
      return;
    }

    var keys = Object.keys(votes);
    var targetCounts = VoteLines.internalCountTargets(votes, keys);
    var boltIndex = 0;

    for (var i = 0; i < keys.length; i++) {
      var target = votes[keys[i]];
      if (target === "skip") continue;
      var from = PlayerCircle.getPosition(keys[i]);
      var to = PlayerCircle.getPosition(target);
      if (!from || !to) continue;

      VoteLines.internalBolts.push(
        VoteLines.internalMakeBolt(
          from,
          to,
          0xe2e8f0,
          boltIndex,
          targetCounts[target] || 1,
        ),
      );
      boltIndex++;
    }

    VoteLines.internalVisible = true;
    VoteLines.internalTotalCount = VoteLines.internalBolts.length;
    VoteLines.internalCompletedCount = 0;
    VoteLines.internalOnAllComplete = onComplete;
    VoteLines.internalLaunchAll();
  },

  drawNightActions: function (view) {
    VoteLines.clear();

    /* Helper: find alive player with a given role */
    var findRole = function (role) {
      if (!view.roles) return null;
      var pids = Object.keys(view.roles);
      for (var i = 0; i < pids.length; i++) {
        if (view.roles[pids[i]] === role && view.alive && view.alive[pids[i]])
          return pids[i];
      }
      return null;
    };

    /* Wolf votes */
    if (view.werewolfVotes) {
      var wKeys = Object.keys(view.werewolfVotes);
      for (var i = 0; i < wKeys.length; i++) {
        VoteLines.internalAddCompletedBolt(
          wKeys[i],
          view.werewolfVotes[wKeys[i]],
          C.roleHex("werewolf"),
        );
      }
    }

    /* Seer */
    if (view.seerTarget) {
      var seer = findRole("seer");
      if (seer)
        VoteLines.internalAddCompletedBolt(
          seer,
          view.seerTarget,
          C.roleHex("seer"),
        );
    }

    /* Doctor */
    if (view.doctorTarget) {
      var doc = findRole("doctor");
      if (doc)
        VoteLines.internalAddCompletedBolt(
          doc,
          view.doctorTarget,
          C.roleHex("doctor"),
        );
    }

    VoteLines.internalVisible = true;
  },

  fadeOut: function (onComplete) {
    if (
      VoteLines.internalBolts.length === 0 &&
      VoteLines.internalMarks.length === 0
    ) {
      if (onComplete) onComplete();
      return;
    }
    Tween.to(
      VoteLines.internalGfx,
      { alpha: 0 },
      C.VOTE_LINE_TEARDOWN,
      "easeOut",
      function () {
        VoteLines.clear();
        VoteLines.internalGfx.alpha = 1;
        if (onComplete) onComplete();
      },
    );
  },

  clear: function () {
    VoteLines.internalBolts = [];
    VoteLines.internalMarks = [];
    VoteLines.internalVisible = false;
    VoteLines.internalCompletedCount = 0;
    VoteLines.internalTotalCount = 0;
    VoteLines.internalOnAllComplete = null;
    if (VoteLines.internalGfx) VoteLines.internalGfx.clear();
  },

  redraw: function () {
    /* update() handles continuous rendering */
  },

  /* ── Frame update (called by ticker) ── */

  update: function () {
    if (!VoteLines.internalVisible) return;
    var gfx = VoteLines.internalGfx;
    gfx.clear();

    for (var i = 0; i < VoteLines.internalBolts.length; i++) {
      var b = VoteLines.internalBolts[i];
      if (!b.started) continue;
      var progress = b.internalProxy ? b.internalProxy.progress : b.progress;

      if (b.done) {
        VoteLines.internalDrawPersistentTrail(gfx, b);
      } else {
        VoteLines.internalDrawLiveTrail(gfx, b, progress);
        VoteLines.internalDrawBoltHead(gfx, b, progress);
      }
    }

    /* Clean up expired trail points */
    for (var ci = 0; ci < VoteLines.internalBolts.length; ci++) {
      var bolt = VoteLines.internalBolts[ci];
      var live = [];
      for (var ti = 0; ti < bolt.trail.length; ti++) {
        if (bolt.trail[ti].age < C.TRAIL_AGE_LIMIT) live.push(bolt.trail[ti]);
      }
      bolt.trail = live;
    }

    VoteLines.internalDrawMarks(gfx);
  },

  /* ── Private: bolt lifecycle ── */

  internalMakeBolt: function (from, to, color, index, voteCount) {
    return {
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      progress: 0,
      color: color,
      delay: index * C.VOTE_LINE_STAGGER,
      voteCount: voteCount,
      started: false,
      done: false,
      trail: [],
      internalProxy: null,
    };
  },

  internalAddCompletedBolt: function (fromPid, toPid, color) {
    var from = PlayerCircle.getPosition(fromPid);
    var to = PlayerCircle.getPosition(toPid);
    if (!from || !to) return;
    VoteLines.internalBolts.push({
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      progress: 1,
      color: color,
      started: true,
      done: true,
      trail: [],
      internalProxy: { progress: 1 },
      voteCount: 1,
      delay: 0,
    });
    VoteLines.internalAddMark(to.x, to.y, color, 1);
  },

  internalLaunchAll: function () {
    for (var j = 0; j < VoteLines.internalBolts.length; j++) {
      (function (b) {
        var proxy = { progress: 0 };
        b.internalProxy = proxy;
        setTimeout(function () {
          b.started = true;
          Tween.to(
            proxy,
            { progress: 1 },
            C.VOTE_BOLT_DURATION,
            "easeIn",
            function () {
              b.done = true;
              b.progress = 1;
              VoteLines.internalAddMark(b.toX, b.toY, b.color, b.voteCount);
              VoteLines.internalCompletedCount++;
              if (
                VoteLines.internalCompletedCount >=
                  VoteLines.internalTotalCount &&
                VoteLines.internalOnAllComplete
              ) {
                VoteLines.internalOnAllComplete();
                VoteLines.internalOnAllComplete = null;
              }
            },
          );
        }, b.delay);
      })(VoteLines.internalBolts[j]);
    }
    if (VoteLines.internalBolts.length === 0 && VoteLines.internalOnAllComplete)
      VoteLines.internalOnAllComplete();
  },

  internalAddMark: function (x, y, color, voteCount) {
    for (var i = 0; i < VoteLines.internalMarks.length; i++) {
      var m = VoteLines.internalMarks[i];
      if (Math.abs(m.x - x) < 5 && Math.abs(m.y - y) < 5) {
        m.voteCount = voteCount;
        m.pulsePhase = 0;
        return;
      }
    }
    VoteLines.internalMarks.push({
      x: x,
      y: y,
      color: color,
      voteCount: voteCount,
      pulsePhase: 0,
    });
  },

  internalCountTargets: function (votes, keys) {
    var counts = {};
    for (var i = 0; i < keys.length; i++) {
      var t = votes[keys[i]];
      if (t !== "skip") counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  },

  /* ── Private: rendering ── */

  internalDrawPersistentTrail: function (gfx, b) {
    for (var p = 0; p < C.TRAIL_PUFF_COUNT; p++) {
      var t = p / (C.TRAIL_PUFF_COUNT - 1);
      var px = b.fromX + (b.toX - b.fromX) * t;
      var py = b.fromY + (b.toY - b.fromY) * t;
      var size = C.TRAIL_MAX_SIZE * (1 - t * C.TRAIL_TAPER) + C.TRAIL_MIN_SIZE;
      var alpha =
        C.TRAIL_ALPHA_MIN + t * (C.TRAIL_ALPHA_MAX - C.TRAIL_ALPHA_MIN);
      var wobble =
        Math.sin(p * C.TRAIL_WOBBLE_FREQ + performance.now() * 0.001) *
        (1 - t) *
        C.TRAIL_WOBBLE_AMP;
      gfx.circle(px, py + wobble, size);
      gfx.fill({ color: b.color, alpha: alpha });
    }
    gfx.circle(b.toX, b.toY, 3);
    gfx.fill({ color: b.color, alpha: 0.5 });
  },

  internalDrawLiveTrail: function (gfx, b, progress) {
    var headX = b.fromX + (b.toX - b.fromX) * progress;
    var headY = b.fromY + (b.toY - b.fromY) * progress;

    if (progress > 0) {
      b.trail.push({ x: headX, y: headY, age: 0 });
      if (b.trail.length > C.TRAIL_HISTORY_MAX) b.trail.shift();
    }

    var pathLen = Math.sqrt(
      Math.pow(b.toX - b.fromX, 2) + Math.pow(b.toY - b.fromY, 2),
    );

    for (var i = 0; i < b.trail.length; i++) {
      var tp = b.trail[i];
      tp.age += 1;
      var dist = Math.sqrt(
        Math.pow(tp.x - b.fromX, 2) + Math.pow(tp.y - b.fromY, 2),
      );
      var ratio = pathLen > 0 ? dist / pathLen : 0;
      var size = 8 * (1 - ratio * 0.8) + 1;
      var alpha = (1 - tp.age / C.TRAIL_AGE_LIMIT) * (0.08 + ratio * 0.15);
      if (alpha <= 0) continue;
      var wobble = Math.sin(i * 1.7) * (1 - ratio) * 3;
      gfx.circle(tp.x, tp.y + wobble, size);
      gfx.fill({ color: b.color, alpha: alpha });
    }
  },

  internalDrawBoltHead: function (gfx, b, progress) {
    var x = b.fromX + (b.toX - b.fromX) * progress;
    var y = b.fromY + (b.toY - b.fromY) * progress;
    gfx.circle(x, y, C.BOLT_HEAD_OUTER);
    gfx.fill({ color: b.color, alpha: 0.2 });
    gfx.circle(x, y, C.BOLT_HEAD_INNER);
    gfx.fill({ color: 0xffffff, alpha: 0.8 });
    gfx.circle(x, y, C.BOLT_HEAD_CORE);
    gfx.fill({ color: b.color, alpha: 0.9 });
  },

  internalDrawMarks: function (gfx) {
    for (var i = 0; i < VoteLines.internalMarks.length; i++) {
      var m = VoteLines.internalMarks[i];
      m.pulsePhase += C.MARK_PULSE_SPEED;
      var baseR = C.MARK_BASE_RADIUS + m.voteCount * C.MARK_VOTE_SCALE;
      var r = baseR + Math.sin(m.pulsePhase) * 3;
      var a = 0.15 + m.voteCount * 0.08;

      gfx.circle(m.x, m.y, r + 4);
      gfx.fill({ color: m.color, alpha: a * 0.3 });
      gfx.circle(m.x, m.y, r);
      gfx.stroke({ width: 2 + m.voteCount, color: m.color, alpha: a });
      gfx.circle(m.x, m.y, r * 0.4);
      gfx.fill({ color: m.color, alpha: a * 0.2 });
    }
  },
};
