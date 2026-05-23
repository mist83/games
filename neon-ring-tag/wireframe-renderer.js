var WireframeFighterRenderer = (function () {
  var LAYERS = [
    "shadow",
    "farLeg",
    "farArm",
    "torso",
    "core",
    "nearLeg",
    "nearArm",
    "joints",
    "fx",
  ];

  function ensure(root) {
    var i, name, g;
    if (root.internalWireframeRig) return root.internalWireframeRig;
    root.internalWireframeRig = {};
    for (i = 0; i < LAYERS.length; i++) {
      name = LAYERS[i];
      g = new PIXI.Graphics();
      g.zIndex = i;
      root.addChild(g);
      root.internalWireframeRig[name] = g;
    }
    root.sortableChildren = true;
    return root.internalWireframeRig;
  }

  function ensureFlat(host, key) {
    var i, name, g, rigs;
    if (!host.internalWireframeFlatRigs) host.internalWireframeFlatRigs = {};
    rigs = host.internalWireframeFlatRigs;
    if (rigs[key]) return rigs[key];
    rigs[key] = {};
    for (i = 0; i < LAYERS.length; i++) {
      name = LAYERS[i];
      g = new PIXI.Graphics();
      g.label = "fighter-" + key + "-" + name;
      g.zIndex = i;
      host.addChild(g);
      rigs[key][name] = g;
    }
    host.sortableChildren = true;
    return rigs[key];
  }

  function clear(rig) {
    var i;
    for (i = 0; i < LAYERS.length; i++) rig[LAYERS[i]].clear();
  }

  function transformRig(rig, params, scale) {
    var i, g;
    for (i = 0; i < LAYERS.length; i++) {
      g = rig[LAYERS[i]];
      g.position.set(params.x || 0, params.y || 0);
      g.scale.x = (params.facing === "left" ? -1 : 1) * scale;
      g.scale.y = scale;
      g.rotation = params.rotation || 0;
    }
  }

  function applyLayerZ(rig, layerZ) {
    var i, name;
    for (i = 0; i < LAYERS.length; i++) {
      name = LAYERS[i];
      rig[name].zIndex = layerZ && layerZ[name] != null ? layerZ[name] : i;
    }
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function ease(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function clamp01(t) {
    return Math.max(0, Math.min(1, t));
  }

  function phase(t, start, end) {
    return ease(clamp01((t - start) / Math.max(0.001, end - start)));
  }

  function acceleratePhase(t, start, end, power) {
    return Math.pow(
      clamp01((t - start) / Math.max(0.001, end - start)),
      power || 3,
    );
  }

  function phasePulse(t, start, end) {
    return Math.sin(
      clamp01((t - start) / Math.max(0.001, end - start)) * Math.PI,
    );
  }

  function phaseRange(t, range) {
    return phase(t, range[0], range[1]);
  }

  function pulseRange(t, range) {
    return phasePulse(t, range[0], range[1]);
  }

  function strikeCycle(t, timing) {
    var recover = phaseRange(t, timing.recover);
    return {
      load: phaseRange(t, timing.load),
      chamber: phaseRange(t, timing.chamber) * (1 - recover),
      drive:
        pulseRange(t, timing.drive) *
        (1 -
          recover *
            (timing.driveRecovery == null ? 0.2 : timing.driveRecovery)),
      recover: recover,
    };
  }

  function wave(t) {
    return Math.sin(t * Math.PI * 2);
  }

  function point(x, y) {
    return { x: x, y: y };
  }

  var BODY_MODEL = {
    frontFoot: point(51, 0),
    rearFoot: point(-47, 0),
    head: point(31, -123),
    frontFist: point(51, -88),
    rearFist: point(35, -91),
    limbLengths: {
      farArm: [27, 29],
      nearArm: [29, 31],
      farLeg: [34, 38],
      nearLeg: [35, 39],
      strikeThigh: 66,
      strikeShin: 36,
    },
    bodyLimits: {
      pelvisChest: 39,
      chestNeck: 20.5,
      neckHead: 19,
      shoulderBar: 20,
      hipBar: 19,
    },
    targetOffsets: {
      crossChin: point(-7, 11),
    },
  };

  var RENDERED_POINT_KEYS = [
    "pelvis",
    "chest",
    "neck",
    "head",
    "farShoulder",
    "nearShoulder",
    "farElbow",
    "nearElbow",
    "farFist",
    "nearFist",
    "farHip",
    "nearHip",
    "farKnee",
    "nearKnee",
    "farFoot",
    "nearFoot",
    "strikeKnee",
    "strikeFoot",
  ];

  function shifted(p, dx, dy) {
    return { x: p.x + dx, y: p.y + dy };
  }

  function blendPoint(a, b, t) {
    return point(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
  }

  function pointDistance(a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function limitPointFromRoot(root, desiredEnd, maxReach) {
    var dist = pointDistance(root, desiredEnd);
    var t;
    if (dist <= maxReach || dist < 0.001) return desiredEnd;
    t = maxReach / dist;
    return point(
      root.x + (desiredEnd.x - root.x) * t,
      root.y + (desiredEnd.y - root.y) * t,
    );
  }

  function pointAtModelLength(root, desiredEnd, length, fallbackEnd) {
    var dx = desiredEnd.x - root.x;
    var dy = desiredEnd.y - root.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.001 && fallbackEnd) {
      dx = fallbackEnd.x - root.x;
      dy = fallbackEnd.y - root.y;
      dist = Math.sqrt(dx * dx + dy * dy);
    }
    if (dist < 0.001) {
      dx = 1;
      dy = 0;
      dist = 1;
    }
    return point(root.x + (dx / dist) * length, root.y + (dy / dist) * length);
  }

  function clampPointFromRoot(root, target, maxReach) {
    if (pointDistance(root, target) <= maxReach) return target;
    return limitPointFromRoot(root, target, maxReach);
  }

  function clampBarLength(p, farKey, nearKey, maxLength) {
    var far = p[farKey];
    var near = p[nearKey];
    var dist = pointDistance(far, near);
    var mid;
    var ux;
    var uy;
    var half;
    if (dist <= maxLength || dist < 0.001) return p;
    mid = between(far, near, 0.5);
    ux = (near.x - far.x) / dist;
    uy = (near.y - far.y) / dist;
    half = maxLength / 2;
    p[farKey] = point(mid.x - ux * half, mid.y - uy * half);
    p[nearKey] = point(mid.x + ux * half, mid.y + uy * half);
    return p;
  }

  function pointBeforeTarget(root, target, gap) {
    var dist = pointDistance(root, target);
    var ux;
    var uy;
    if (dist <= gap || dist < 0.001) return target;
    ux = (target.x - root.x) / dist;
    uy = (target.y - root.y) / dist;
    return point(target.x - ux * gap, target.y - uy * gap);
  }

  function blendPose(pose, neutral, t) {
    var key;
    if (!t) return pose;
    for (key in pose) {
      if (neutral[key]) pose[key] = blendPoint(pose[key], neutral[key], t);
    }
    return pose;
  }

  function neutralAnchorPoint(jointName) {
    if (jointName === "strikeKnee") return point(62, -118);
    if (jointName === "strikeFoot") return point(126, -123);
    if (jointName === "nearKnee") return point(25, -31);
    if (jointName === "head")
      return point(BODY_MODEL.head.x, BODY_MODEL.head.y);
    return point(BODY_MODEL.frontFoot.x, BODY_MODEL.frontFoot.y);
  }

  function copyParams(params) {
    var out = {};
    var key;
    for (key in params) out[key] = params[key];
    return out;
  }

  function poseMaxWorldY(pose, params, scale) {
    var facingSign = params.facing === "left" ? -1 : 1;
    var rotation = params.rotation || 0;
    var sin = Math.sin(rotation);
    var cos = Math.cos(rotation);
    var maxY = -Infinity;
    var i, key, p, x, y, worldY;
    for (i = 0; i < RENDERED_POINT_KEYS.length; i++) {
      key = RENDERED_POINT_KEYS[i];
      if (
        pose.strikeLegActive &&
        (key === "farKnee" ||
          key === "farFoot" ||
          key === "strikeKnee" ||
          key === "strikeFoot")
      )
        continue;
      p = pose[key];
      if (!p || typeof p.x !== "number" || typeof p.y !== "number") continue;
      x = p.x * facingSign * scale;
      y = p.y * scale;
      worldY = (params.y || 0) + x * sin + y * cos;
      if (worldY > maxY) maxY = worldY;
    }
    return maxY;
  }

  function clampToGround(params, pose, scale) {
    var groundY = params.groundY;
    var overshoot;
    if (typeof groundY !== "number") return params;
    overshoot = poseMaxWorldY(pose, params, scale) - groundY;
    if (overshoot <= 0) return params;
    params.y = (params.y || 0) - overshoot;
    return params;
  }

  function between(a, b, t) {
    return point(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
  }

  function setupPose(yBob, lean) {
    return {
      pelvis: point(0 + lean * 0.25, -54 + yBob),
      chest: point(8 + lean * 0.5, -92 + yBob),
      neck: point(20 + lean * 0.5, -108 + yBob),
      head: point(BODY_MODEL.head.x + lean * 0.55, BODY_MODEL.head.y + yBob),
      farShoulder: point(7 + lean * 0.45, -94 + yBob),
      nearShoulder: point(17 + lean * 0.45, -92 + yBob),
      farElbow: point(25 + lean * 0.4, -77 + yBob),
      farFist: point(
        BODY_MODEL.rearFist.x + lean * 0.4,
        BODY_MODEL.rearFist.y + yBob,
      ),
      nearElbow: point(39 + lean * 0.45, -80 + yBob),
      nearFist: point(
        BODY_MODEL.frontFist.x + lean * 0.45,
        BODY_MODEL.frontFist.y + yBob,
      ),
      farHip: point(-7, -52 + yBob),
      nearHip: point(4, -53 + yBob),
      farKnee: point(-19, -29),
      farFoot: point(BODY_MODEL.rearFoot.x, BODY_MODEL.rearFoot.y),
      nearKnee: point(25, -31),
      nearFoot: point(BODY_MODEL.frontFoot.x, BODY_MODEL.frontFoot.y),
      strikeKnee: point(-19, -29),
      strikeFoot: point(BODY_MODEL.rearFoot.x, BODY_MODEL.rearFoot.y),
    };
  }

  function clonePose(p) {
    var out = {};
    var key;
    for (key in p) {
      if (p[key] && typeof p[key].x === "number")
        out[key] = point(p[key].x, p[key].y);
    }
    return out;
  }

  function returnToNeutralBlend(action, t, externalBlend) {
    var forced = 0;
    if (action === "idle") return 1;
    if (action === "flying_knee") forced = phase(t, 0.56, 0.84) * 0.92;
    else forced = phase(t, 0.48, 0.86);
    return Math.max(ease(clamp01(externalBlend || 0)), forced);
  }

  function attachPose(p) {
    var shoulderAttach =
      p.shoulderAttachBlend == null ? 0.48 : p.shoulderAttachBlend;
    var hipAttach = p.hipAttachBlend == null ? 0.58 : p.hipAttachBlend;
    p.neck = blendPoint(p.neck, between(p.chest, p.head, 0.52), 0.82);
    p.farShoulder = blendPoint(
      p.farShoulder,
      point(p.chest.x - 9, p.chest.y - 1),
      shoulderAttach,
    );
    p.nearShoulder = blendPoint(
      p.nearShoulder,
      point(p.chest.x + 10, p.chest.y + 1),
      shoulderAttach,
    );
    p.farHip = blendPoint(
      p.farHip,
      point(p.pelvis.x - 10, p.pelvis.y + 3),
      hipAttach,
    );
    p.nearHip = blendPoint(
      p.nearHip,
      point(p.pelvis.x + 9, p.pelvis.y + 2),
      hipAttach,
    );
    return p;
  }

  function constrainBodyFrame(p) {
    p.chest = clampPointFromRoot(
      p.pelvis,
      p.chest,
      BODY_MODEL.bodyLimits.pelvisChest,
    );
    p.neck = clampPointFromRoot(
      p.chest,
      p.neck,
      BODY_MODEL.bodyLimits.chestNeck,
    );
    p.head = clampPointFromRoot(
      p.neck,
      p.head,
      BODY_MODEL.bodyLimits.neckHead,
    );
    clampBarLength(
      p,
      "farShoulder",
      "nearShoulder",
      BODY_MODEL.bodyLimits.shoulderBar,
    );
    clampBarLength(p, "farHip", "nearHip", BODY_MODEL.bodyLimits.hipBar);
    return p;
  }

  function constrainLimb(
    p,
    rootKey,
    midKey,
    endKey,
    lenA,
    lenB,
    bendSign,
    poleKey
  ) {
    var root = p[rootKey];
    var end = p[endKey];
    var pole = poleKey ? p[poleKey] : null;
    var solved = solveTwoBone(root, end, lenA, lenB, pole, bendSign);
    p[midKey] = solved.mid;
    p[endKey] = solved.end;
    return p;
  }

  function constrainElbowPriorityArm(
    p,
    shoulderKey,
    elbowKey,
    fistKey,
    upperLength,
    lowerLength,
  ) {
    var shoulder = p[shoulderKey];
    var elbow = p[elbowKey];
    var fist = p[fistKey];
    var dx = elbow.x - shoulder.x;
    var dy = elbow.y - shoulder.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var fx, fy, fistDist;
    if (dist < 0.001) {
      dx = 1;
      dy = 0;
      dist = 1;
    }
    if (dist > upperLength) {
      elbow = point(
        shoulder.x + (dx / dist) * upperLength,
        shoulder.y + (dy / dist) * upperLength,
      );
      p[elbowKey] = elbow;
    }
    fx = fist.x - elbow.x;
    fy = fist.y - elbow.y;
    fistDist = Math.sqrt(fx * fx + fy * fy);
    if (fistDist < 0.001) {
      fx = -1;
      fy = 0;
      fistDist = 1;
    }
    if (fistDist > lowerLength) {
      p[fistKey] = point(
        elbow.x + (fx / fistDist) * lowerLength,
        elbow.y + (fy / fistDist) * lowerLength,
      );
    }
    return p;
  }

  function solveTwoBone(root, desiredEnd, lenA, lenB, pole, bendSign) {
    var end = point(desiredEnd.x, desiredEnd.y);
    var dx = end.x - root.x;
    var dy = end.y - root.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var minReach = Math.abs(lenA - lenB) + 0.001;
    var maxReach = lenA + lenB - 0.001;
    var ux, uy, reach, proj, height, px, py, midA, midB, da, db;
    if (dist < 0.001) {
      dx = 1;
      dy = 0;
      dist = 1;
    }
    ux = dx / dist;
    uy = dy / dist;
    reach = Math.max(minReach, Math.min(maxReach, dist));
    if (dist !== reach) {
      end = point(root.x + ux * reach, root.y + uy * reach);
      dist = reach;
    }
    proj = (lenA * lenA - lenB * lenB + dist * dist) / (2 * dist);
    height = Math.sqrt(Math.max(0, lenA * lenA - proj * proj));
    px = -uy;
    py = ux;
    midA = point(
      root.x + ux * proj + px * height,
      root.y + uy * proj + py * height,
    );
    midB = point(
      root.x + ux * proj - px * height,
      root.y + uy * proj - py * height,
    );
    if (pole && typeof pole.x === "number" && typeof pole.y === "number") {
      da =
        (midA.x - pole.x) * (midA.x - pole.x) +
        (midA.y - pole.y) * (midA.y - pole.y);
      db =
        (midB.x - pole.x) * (midB.x - pole.x) +
        (midB.y - pole.y) * (midB.y - pole.y);
      return { mid: da <= db ? midA : midB, end: end };
    }
    return { mid: bendSign >= 0 ? midA : midB, end: end };
  }

  function applyDynamicArmPoles(p) {
    var lowerPole;
    var highPole;
    var returnBlend;
    if (p.farArmPoleMode !== "cross") return p;
    lowerPole = shifted(
      between(p.farShoulder, p.farFist, 0.52),
      0,
      p.farArmPoleDrop == null ? 14 : p.farArmPoleDrop,
    );
    highPole = shifted(between(p.farShoulder, p.farFist, 0.46), 0, -18);
    returnBlend = clamp01(p.farArmPoleReturn || 0);
    p.farArmPole = blendPoint(lowerPole, highPole, returnBlend);
    return p;
  }

  function applyCrossTargeting(p) {
    var targetHead = p.crossTargetHead;
    var targetChin;
    var contactTarget;
    var safeTarget;
    if (!targetHead || !p.crossTargetBlend) return p;
    targetChin = shifted(
      targetHead,
      BODY_MODEL.targetOffsets.crossChin.x,
      BODY_MODEL.targetOffsets.crossChin.y,
    );
    contactTarget = pointBeforeTarget(
      p.farShoulder,
      targetChin,
      p.crossFaceGap,
    );
    safeTarget = limitPointFromRoot(
      p.farShoulder,
      contactTarget,
      p.crossMaxReach,
    );
    p.farFist = blendPoint(p.farFist, safeTarget, p.crossTargetBlend);
    return p;
  }

  function applyStrikeKneeTargeting(p) {
    var target = p.strikeKneeTarget;
    var thigh;
    var targetDist;
    var safeTarget;
    if (!target || !p.strikeKneeTargetBlend) return p;
    thigh = p.strikeThighLength || BODY_MODEL.limbLengths.strikeThigh;
    targetDist = pointDistance(p.farHip, target);
    if (targetDist < thigh * 0.55) return p;
    safeTarget = pointAtModelLength(p.farHip, target, thigh, p.strikeKnee);
    p.strikeKnee = blendPoint(
      p.strikeKnee,
      safeTarget,
      clamp01(p.strikeKneeTargetBlend),
    );
    return p;
  }

  function constrainStrikeLeg(p) {
    var root = p.farHip;
    var knee = p.strikeKnee;
    var foot = p.strikeFoot;
    var thigh = p.strikeThighLength || BODY_MODEL.limbLengths.strikeThigh;
    var shin = p.strikeShinLength || BODY_MODEL.limbLengths.strikeShin;
    var dx = knee.x - root.x;
    var dy = knee.y - root.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var fx, fy, footDist;
    if (p.strikeKneePriority) {
      knee = pointAtModelLength(root, knee, thigh, p.farKnee);
      p.strikeKnee = knee;
      if (p.strikeShinFollow) {
        foot = shifted(
          knee,
          p.strikeShinFollow.x,
          p.strikeShinFollow.y,
        );
      }
      foot = pointAtModelLength(knee, foot, shin, p.farFoot);
      if (p.strikeFootGroundLimit && foot.y > 0) foot = point(foot.x, 0);
      p.strikeFoot = foot;
      p.farKnee = point(knee.x, knee.y);
      p.farFoot = point(foot.x, foot.y);
      return p;
    }
    if (dist > thigh) {
      knee = point(root.x + (dx / dist) * thigh, root.y + (dy / dist) * thigh);
      p.strikeKnee = knee;
    }
    fx = foot.x - knee.x;
    fy = foot.y - knee.y;
    footDist = Math.sqrt(fx * fx + fy * fy);
    if (footDist > shin) {
      foot = point(
        knee.x + (fx / footDist) * shin,
        knee.y + (fy / footDist) * shin,
      );
      p.strikeFoot = foot;
    }
    p.farKnee = point(knee.x, knee.y);
    p.farFoot = point(foot.x, foot.y);
    return p;
  }

  function constrainStrikeFootLeg(p) {
    var root = p.farHip;
    var end = point(p.strikeFoot.x, p.strikeFoot.y);
    var minForward = p.strikeMinForward || 0;
    var pole;
    var solved;
    if (minForward > 0 && end.x < root.x + minForward)
      end.x = root.x + minForward;
    pole =
      p.strikePole || point((root.x + end.x) / 2, Math.max(root.y, end.y) + 34);
    solved = solveTwoBone(
      root,
      end,
      p.strikeThighLength || BODY_MODEL.limbLengths.strikeThigh,
      p.strikeShinLength || BODY_MODEL.limbLengths.strikeShin,
      pole,
      -1,
    );
    p.strikeKnee = solved.mid;
    p.strikeFoot = solved.end;
    p.farKnee = point(p.strikeKnee.x, p.strikeKnee.y);
    p.farFoot = point(p.strikeFoot.x, p.strikeFoot.y);
    return p;
  }

  function constrainPose(p) {
    if (p.farElbowPriority)
      constrainElbowPriorityArm(
        p,
        "farShoulder",
        "farElbow",
        "farFist",
        BODY_MODEL.limbLengths.farArm[0],
        BODY_MODEL.limbLengths.farArm[1],
      );
    else
      constrainLimb(
        p,
        "farShoulder",
        "farElbow",
        "farFist",
        BODY_MODEL.limbLengths.farArm[0],
        BODY_MODEL.limbLengths.farArm[1],
        1,
        "farArmPole",
      );
    constrainLimb(
      p,
      "nearShoulder",
      "nearElbow",
      "nearFist",
      BODY_MODEL.limbLengths.nearArm[0],
      BODY_MODEL.limbLengths.nearArm[1],
      1,
    );
    if (p.strikeLegActive && p.strikeFootPriority) constrainStrikeFootLeg(p);
    else if (p.strikeLegActive) constrainStrikeLeg(p);
    else
      constrainLimb(
        p,
        "farHip",
        "farKnee",
        "farFoot",
        BODY_MODEL.limbLengths.farLeg[0],
        BODY_MODEL.limbLengths.farLeg[1],
        -1,
      );
    constrainLimb(
      p,
      "nearHip",
      "nearKnee",
      "nearFoot",
      BODY_MODEL.limbLengths.nearLeg[0],
      BODY_MODEL.limbLengths.nearLeg[1],
      -1,
    );
    return p;
  }

  function applyStrikeLeg(p, footPriority, kneePriority) {
    p.strikeLegActive = true;
    p.strikeFootPriority = !!footPriority;
    p.strikeKneePriority = !!kneePriority;
    p.farKnee = p.strikeKnee;
    p.farFoot = p.strikeFoot;
    return p;
  }

  function applyHitReaction(p, action, hit) {
    if (!hit) return p;
    if (action === "flying_knee" || action === "teep") {
      p.head = shifted(p.head, -34 * hit, -17 * hit);
      p.neck = shifted(p.neck, -21 * hit, -9 * hit);
      p.chest = shifted(p.chest, -10 * hit, 2 * hit);
      p.farShoulder = shifted(p.farShoulder, -11 * hit, 4 * hit);
      p.nearShoulder = shifted(p.nearShoulder, -12 * hit, 5 * hit);
      p.farElbow = shifted(p.farElbow, -12 * hit, 10 * hit);
      p.nearElbow = shifted(p.nearElbow, -13 * hit, 11 * hit);
      p.farFist = shifted(p.farFist, -11 * hit, 13 * hit);
      p.nearFist = shifted(p.nearFist, -13 * hit, 14 * hit);
      p.pelvis = shifted(p.pelvis, -3 * hit, 1 * hit);
      p.nearKnee = shifted(p.nearKnee, -4 * hit, 3 * hit);
    } else if (action === "knee") {
      p.head = shifted(p.head, -32 * hit, -15 * hit);
      p.neck = shifted(p.neck, -20 * hit, -7 * hit);
      p.chest = shifted(p.chest, -11 * hit, 3 * hit);
      p.farShoulder = shifted(p.farShoulder, -12 * hit, 6 * hit);
      p.nearShoulder = shifted(p.nearShoulder, -13 * hit, 6 * hit);
      p.pelvis = shifted(p.pelvis, -3 * hit, 4 * hit);
      p.nearElbow = shifted(p.nearElbow, -12 * hit, 11 * hit);
      p.nearFist = shifted(p.nearFist, -12 * hit, 13 * hit);
      p.farElbow = shifted(p.farElbow, -11 * hit, 11 * hit);
      p.farFist = shifted(p.farFist, -11 * hit, 13 * hit);
      p.nearKnee = shifted(p.nearKnee, -5 * hit, 2 * hit);
    } else {
      p.head = shifted(p.head, -29 * hit, -8 * hit);
      p.neck = shifted(p.neck, -18 * hit, -3 * hit);
      p.chest = shifted(p.chest, -9 * hit, 3 * hit);
      p.farShoulder = shifted(p.farShoulder, -8 * hit, 4 * hit);
      p.nearShoulder = shifted(p.nearShoulder, -9 * hit, 5 * hit);
      p.farElbow = shifted(p.farElbow, -8 * hit, 8 * hit);
      p.nearElbow = shifted(p.nearElbow, -9 * hit, 9 * hit);
      p.farFist = shifted(p.farFist, -8 * hit, 10 * hit);
      p.nearFist = shifted(p.nearFist, -9 * hit, 11 * hit);
      p.pelvis = shifted(p.pelvis, -3 * hit, 1 * hit);
    }
    return p;
  }

  function applyHighGuard(p, amount) {
    if (!amount) return p;
    p.pelvis = shifted(p.pelvis, -1 * amount, 5 * amount);
    p.chest = shifted(p.chest, -3 * amount, 6 * amount);
    p.neck = shifted(p.neck, -4 * amount, 7 * amount);
    p.head = shifted(p.head, -5 * amount, 9 * amount);
    p.farShoulder = shifted(p.farShoulder, -3 * amount, 5 * amount);
    p.nearShoulder = shifted(p.nearShoulder, -2 * amount, 5 * amount);
    p.farElbow = blendPoint(
      p.farElbow,
      point(p.head.x - 17, p.head.y + 23),
      amount,
    );
    p.nearElbow = blendPoint(
      p.nearElbow,
      point(p.head.x + 18, p.head.y + 23),
      amount,
    );
    p.farFist = blendPoint(
      p.farFist,
      point(p.head.x - 9, p.head.y + 6),
      amount,
    );
    p.nearFist = blendPoint(
      p.nearFist,
      point(p.head.x + 10, p.head.y + 6),
      amount,
    );
    p.farKnee = shifted(p.farKnee, 2 * amount, 3 * amount);
    p.nearKnee = shifted(p.nearKnee, -1 * amount, 4 * amount);
    return p;
  }

  function basePose(params) {
    var action = params.action || "idle";
    var t = params.progress || 0;
    var reach = params.reach || 0;
    var pulse = wave((params.time || 0) * 0.001);
    var hit = clamp01(params.hitReact || 0);
    var highGuard = clamp01(params.highGuard || 0);
    var hitAction = params.hitAction || "";
    var connected = !!params.connected;
    var targetHead = params.targetHeadLocal || null;
    var yBob = pulse * 1.4 - hit * 3;
    var lean = -10 * hit;
    var p = setupPose(yBob, lean);
    var neutralPose = clonePose(p);

    if (action === "jab") {
      var jabSnap = phasePulse(t, 0.1, 0.32);
      var jabRecover = phase(t, 0.3, 0.52);
      var jabStep = phasePulse(t, 0.06, 0.46);
      var jabDrop = jabSnap * 2.6 - jabRecover * 1.4;
      var jabDrive = jabSnap * 4.2 - jabRecover * 1.5;
      p.pelvis = point(
        3 + jabSnap * 5 - jabRecover * 2 + jabStep,
        -54 + yBob + jabDrop * 0.6,
      );
      p.chest = point(
        9 + jabSnap * 15 - jabRecover * 5 + jabDrive,
        -92 + yBob - jabSnap * 2 + jabDrop * 0.3,
      );
      p.neck = point(
        20 + jabSnap * 13 - jabRecover * 4 + jabDrive * 0.75,
        -108 + yBob - jabSnap * 2 + jabDrop * 0.16,
      );
      p.head = point(
        31 + jabSnap * 10 - jabRecover * 4 + jabDrive * 0.45,
        -123 + yBob - jabSnap + jabDrop * 0.1,
      );
      p.nearElbow = point(
        54 +
          reach * 0.18 +
          jabSnap * 21 -
          jabRecover * 12 +
          jabDrive +
          jabStep * 2,
        -103 + yBob - jabSnap * 4 + jabDrop * 0.15,
      );
      p.nearFist = point(
        82 +
          reach * 0.34 +
          jabSnap * 27 -
          jabRecover * 20 +
          jabDrive +
          jabStep * 3,
        -121 + yBob - jabSnap * 3,
      );
      p.farElbow = point(19 + jabSnap * 2, -82 + yBob + jabDrop * 0.25);
      p.farFist = point(34 + jabSnap * 2, -112 + yBob + jabDrop * 0.1);
      p.nearKnee = shifted(p.nearKnee, jabSnap * 2.5, jabDrop * 0.75);
      p.nearFoot = point(54 + jabStep * 8, 0);
    } else if (action === "cross") {
      var crossLoad = phasePulse(t, 0.02, 0.15);
      var crossRecover = phase(t, 0.44, 0.78);
      var crossHipTurn =
        acceleratePhase(t, 0.05, 0.18, 2.05) * (1 - crossRecover * 0.86);
      var crossShoulderTurn =
        acceleratePhase(t, 0.13, 0.27, 2.45) * (1 - crossRecover * 0.94);
      var crossWhip =
        acceleratePhase(t, 0.2, 0.34, 3.35) *
        (1 - phase(t, 0.42, 0.7) * 0.78);
      var crossContact =
        acceleratePhase(t, 0.2, 0.34, 3.4) *
        (1 - phase(t, 0.43, 0.66) * 0.94);
      var crossDrop =
        crossLoad * 2 + crossHipTurn * 4 + crossShoulderTurn * 2;
      var crossMaxReach =
        BODY_MODEL.limbLengths.farArm[0] +
        BODY_MODEL.limbLengths.farArm[1] -
        0.8;
      var crossReachStep = 0;
      var crossBodyStep = 0;
      var crossShoulderRoot;
      var crossReachNeed;
      var crossStepNeed;
      var crossTargetBlend;
      p.pelvis = point(
        2 - crossLoad * 2 + crossHipTurn * 4 + crossShoulderTurn * 2,
        -54 + yBob + crossDrop,
      );
      p.hipAttachBlend = 0.2 + crossRecover * 0.38;
      p.shoulderAttachBlend = 0.16 + crossRecover * 0.36;
      p.farHip = point(
        p.pelvis.x - 12 + crossHipTurn * 8 - crossRecover * 2,
        p.pelvis.y + 3 + crossHipTurn * 2,
      );
      p.nearHip = point(
        p.pelvis.x + 9 - crossHipTurn * 5 + crossRecover * 2,
        p.pelvis.y + 2 - crossShoulderTurn,
      );
      p.chest = point(
        10 -
          crossLoad * 3 +
          crossHipTurn * 4 +
          crossShoulderTurn * 4 +
          crossWhip * 2,
        -92 +
          yBob +
          crossDrop * 0.45 -
          crossShoulderTurn * 3 -
          crossWhip * 2,
      );
      p.neck = point(
        21 -
          crossLoad * 2 +
          crossHipTurn * 3 +
          crossShoulderTurn * 4 +
          crossWhip * 2,
        -108 +
          yBob +
          crossDrop * 0.26 -
          crossShoulderTurn * 3 -
          crossWhip * 2,
      );
      p.head = point(
        31 -
          crossLoad +
          crossHipTurn * 2 +
          crossShoulderTurn * 3 +
          crossWhip,
        -123 +
          yBob +
          crossDrop * 0.12 -
          crossShoulderTurn * 2 -
          crossWhip,
      );
      p.farShoulder = point(
        p.chest.x -
          11 -
          crossLoad * 7 +
          crossHipTurn * 3 +
          crossShoulderTurn * 3 +
          crossWhip,
        p.chest.y - 2 + crossShoulderTurn * 3,
      );
      p.nearShoulder = point(
        p.chest.x +
          11 +
          crossLoad * 3 -
          crossHipTurn * 7 -
          crossShoulderTurn * 22,
        p.chest.y + 2 + crossHipTurn - crossShoulderTurn,
      );
      if (targetHead) {
        crossShoulderRoot = blendPoint(
          p.farShoulder,
          point(p.chest.x - 9, p.chest.y - 1),
          p.shoulderAttachBlend,
        );
        crossReachNeed = Math.max(
          0,
          pointDistance(crossShoulderRoot, targetHead) - crossMaxReach,
        );
        crossStepNeed = Math.max(0, crossReachNeed - 8.5);
        crossReachStep =
          Math.min(34, crossStepNeed) *
          phase(t, 0.1, 0.25) *
          (1 - phase(t, 0.5, 0.78));
        crossBodyStep = crossReachStep;
        p.pelvis = shifted(p.pelvis, crossBodyStep * 0.34, 0);
        p.chest = shifted(p.chest, crossBodyStep, -crossReachStep * 0.08);
        p.neck = shifted(p.neck, crossBodyStep, -crossReachStep * 0.08);
        p.head = shifted(p.head, crossBodyStep * 0.86, 0);
        p.farHip = shifted(p.farHip, crossBodyStep * 0.04, 0);
        p.nearHip = shifted(p.nearHip, crossBodyStep * 0.62, 0);
        p.farShoulder = shifted(p.farShoulder, crossBodyStep, 0);
        p.nearShoulder = shifted(p.nearShoulder, crossBodyStep * 0.72, 0);
      }
      p.nearElbow = point(
        34 +
          crossLoad * 6 -
          crossShoulderTurn * 4 +
          crossWhip * 2,
        -84 + yBob + crossDrop * 0.35 - crossShoulderTurn * 2,
      );
      p.nearFist = point(
        48 +
          crossLoad * 5 -
          crossShoulderTurn * 5 +
          crossWhip * 2,
        -105 + yBob + crossDrop * 0.2 - crossShoulderTurn * 2,
      );
      p.farElbow = point(
        25 +
          crossHipTurn * 3 +
          crossShoulderTurn * 10 +
          crossWhip * 22 +
          crossBodyStep * 0.4,
        -84 +
          yBob -
          crossShoulderTurn * 8 -
          crossWhip * 6 +
          crossDrop * 0.16,
      );
      p.farFist = point(
        38 +
          crossHipTurn * 3 +
          crossShoulderTurn * 8 +
          crossWhip * 52 +
          crossBodyStep * 0.35,
        -108 + yBob - crossShoulderTurn * 13 - crossWhip * 8,
      );
      if (targetHead) {
        crossTargetBlend = Math.min(1, crossContact * 1.08);
        p.crossTargetHead = targetHead;
        p.crossMaxReach = crossMaxReach;
        p.crossFaceGap = 12;
        p.crossTargetBlend = crossTargetBlend;
      }
      p.farArmPoleMode = "cross";
      p.farArmPoleDrop = 16 - phase(t, 0.54, 0.84) * 7;
      p.farArmPoleReturn = 0;
      p.farKnee = point(
        -19 + crossHipTurn * 4 + crossShoulderTurn + crossBodyStep * 0.15,
        -29 + crossDrop * 0.7,
      );
      p.farFoot = point(BODY_MODEL.rearFoot.x, BODY_MODEL.rearFoot.y);
      p.nearKnee = point(
        25 + crossReachStep * 0.46 + crossHipTurn * 4,
        -31 + crossDrop,
      );
      p.nearFoot = point(BODY_MODEL.frontFoot.x + crossReachStep, 0);
    } else if (action === "teep") {
      var teepRecover = phase(t, 0.54, 0.86);
      var teepLegIn = phase(t, 0.04, 0.16);
      var teepLegReturn = phase(t, 0.66, 0.94);
      var teepLegBlend = teepLegIn * (1 - teepLegReturn);
      var teepLanding = phase(t, 0.68, 0.88);
      var teepGrip = phase(t, 0.02, 0.14) * (1 - teepRecover * 0.55);
      var teepChamber = phase(t, 0.05, 0.25) * (1 - teepRecover * 0.9);
      var teepHipLoad =
        acceleratePhase(t, 0.02, 0.18, 2.1) * (1 - teepRecover * 0.86);
      var teepShoulderLoad =
        acceleratePhase(t, 0.07, 0.25, 2.25) * (1 - teepRecover * 0.88);
      var teepSnap =
        acceleratePhase(t, 0.2, 0.42, 2.45) *
        (1 - phase(t, 0.58, 0.86) * 0.88);
      var teepContact =
        acceleratePhase(t, 0.25, 0.43, 2.65) *
        (1 - phase(t, 0.6, 0.86) * 0.94);
      var teepHipDrive = teepSnap;
      var teepCounter = teepSnap;
      var teepTarget = targetHead ? point(targetHead.x - 2, targetHead.y + 11) : null;
      var teepFold = Math.max(teepChamber, teepHipDrive * 0.35);
      var teepChamberKnee = point(
        28 + teepChamber * 24 + teepHipLoad * 4 + teepHipDrive * 15,
        -76 - teepChamber * 25 - teepHipDrive * 3,
      );
      var teepChamberFoot = point(
        teepChamberKnee.x - 7 - teepFold * 3,
        teepChamberKnee.y + 48 - teepHipDrive * 2,
      );
      var teepFlickFoot = point(
        42 +
          teepChamber * 24 +
          teepHipDrive * (83 + reach * 0.08),
        -36 - teepChamber * 42 - teepHipDrive * 44,
      );
      p.pelvis = point(
        10 +
          teepHipLoad * 10 +
          teepChamber * 6 +
          teepHipDrive * 18 -
          teepRecover * 7,
        -59 + yBob - teepChamber * 2 - teepHipDrive * 3 + teepRecover * 3,
      );
      p.chest = point(
        14 + teepShoulderLoad * 9 - teepCounter * 22 - teepRecover * 3,
        -96 + yBob - teepChamber * 4 + teepHipDrive * 2,
      );
      p.neck = point(
        25 + teepShoulderLoad * 6 - teepCounter * 27,
        -111 + yBob - teepChamber * 2 + teepHipDrive * 4,
      );
      p.head = point(
        36 + teepShoulderLoad * 4 - teepCounter * 31,
        -126 + yBob - teepChamber + teepHipDrive * 5,
      );
      p.farHip = point(
        p.pelvis.x - 12 + teepHipLoad * 4 + teepHipDrive * 18,
        p.pelvis.y + 3 - teepChamber * 0.5,
      );
      p.nearHip = point(
        p.pelvis.x + 7 + teepHipLoad * 2 + teepHipDrive * 4,
        p.pelvis.y + 2 - teepChamber * 0.6,
      );
      p.nearKnee = point(
        38 + teepHipLoad * 5 + teepChamber * 4 + teepHipDrive * 5,
        -37 - teepChamber * 2 - teepHipDrive * 4,
      );
      p.nearFoot = point(BODY_MODEL.frontFoot.x, 0);
      p.strikeFoot = blendPoint(
        blendPoint(teepChamberFoot, teepFlickFoot, teepSnap),
        neutralPose.farFoot,
        teepLanding,
      );
      p.strikeFoot = blendPoint(
        neutralPose.farFoot,
        p.strikeFoot,
        teepLegBlend,
      );
      if (connected && teepTarget)
        p.strikeFoot = blendPoint(
          p.strikeFoot,
          teepTarget,
          teepContact * 0.82 * teepLegBlend,
        );
      p.strikePole = blendPoint(
        neutralPose.farKnee,
        point(
          teepChamberKnee.x + teepSnap * 24,
          teepChamberKnee.y - teepChamber * 5 - teepSnap * 4,
        ),
        teepLegBlend,
      );
      if (teepLegBlend > 0.08)
        p.strikeFootAngle = Math.PI * 0.56 * teepLegBlend * (1 - teepSnap);
      p.strikeThighLength = lerp(
        BODY_MODEL.limbLengths.farLeg[0],
        BODY_MODEL.limbLengths.strikeThigh,
        teepLegBlend,
      );
      p.strikeShinLength = lerp(
        BODY_MODEL.limbLengths.farLeg[1],
        BODY_MODEL.limbLengths.strikeShin,
        teepLegBlend,
      );
      if (teepLegBlend > 0.015) applyStrikeLeg(p, true);
      p.nearElbow = point(
        23 + teepGrip * 8 + teepShoulderLoad * 4 - teepCounter * 12,
        -84 + yBob - teepChamber * 7 + teepHipDrive * 4,
      );
      p.nearFist = point(
        34 + teepGrip * 5 + teepShoulderLoad * 2 - teepCounter * 16,
        -98 + yBob - teepChamber * 9 + teepHipDrive * 5,
      );
      p.farElbow = point(
        9 + teepGrip * 7 + teepShoulderLoad * 8 - teepCounter * 10,
        -83 + yBob - teepChamber * 4 + teepHipDrive * 5,
      );
      p.farFist = point(
        20 + teepGrip * 4 + teepShoulderLoad * 5 - teepCounter * 17,
        -96 + yBob - teepChamber * 7 + teepHipDrive * 7,
      );
    } else if (action === "elbow") {
      var elbowLoad = phase(t, 0.04, 0.18);
      var elbowHipLead = phase(t, 0.04, 0.22);
      var elbowCut = phasePulse(t, 0.16, 0.4);
      var elbowRecover = phase(t, 0.36, 0.62);
      var elbowStep = phasePulse(t, 0.06, 0.44);
      var elbowDrop = elbowHipLead * 1.4 + elbowCut * 2.8 - elbowRecover * 1.8;
      var elbowHipTurn = elbowHipLead * 13 - elbowRecover * 4;
      var elbowShoulderTurn = elbowCut * 26 - elbowRecover * 8;
      var elbowTarget = targetHead
        ? point(targetHead.x - 2, targetHead.y + 8)
        : null;
      p.pelvis = point(
        3 + elbowHipTurn + elbowCut * 2 + elbowStep * 2,
        -54 + yBob + elbowDrop * 0.55,
      );
      p.chest = point(
        8 + elbowHipLead * 7 + elbowShoulderTurn,
        -94 + yBob - elbowCut * 3 + elbowDrop * 0.25,
      );
      p.neck = point(
        18 + elbowHipLead * 5 + elbowShoulderTurn * 0.74,
        -110 + yBob - elbowCut * 3 + elbowDrop * 0.12,
      );
      p.head = point(
        29 + elbowHipLead * 3 + elbowShoulderTurn * 0.42,
        -126 + yBob - elbowCut * 2,
      );
      p.nearElbow = point(
        40 + elbowHipLead * 4 + elbowCut * 9 - elbowRecover * 3,
        -85 + yBob + elbowDrop * 0.25,
      );
      p.nearFist = point(
        50 + elbowHipLead * 3 + elbowCut * 6 - elbowRecover * 2,
        -108 + yBob - elbowCut * 2,
      );
      p.farShoulder = point(
        16 + elbowHipLead * 18 + elbowCut * 62 - elbowRecover * 14,
        -96 + yBob - elbowCut * 15 + elbowDrop * 0.16,
      );
      p.farElbow = point(
        40 +
          reach * 0.1 +
          elbowHipLead * 14 +
          elbowCut * 48 -
          elbowRecover * 18 +
          elbowStep * 4,
        -107 + yBob - elbowCut * 9 + elbowDrop * 0.1,
      );
      if (connected && elbowTarget)
        p.farElbow = blendPoint(p.farElbow, elbowTarget, elbowCut * 0.96);
      p.farFist = point(
        31 + elbowLoad * 10 + elbowHipLead * 7 + elbowCut * 20 - elbowRecover * 8,
        -93 + yBob + elbowCut * 9 + elbowDrop * 0.2,
      );
      p.farElbowPriority = true;
      p.farKnee = shifted(p.farKnee, elbowCut * 2, elbowDrop * 0.55);
      p.nearKnee = shifted(p.nearKnee, elbowCut * 4, elbowDrop * 0.85);
      p.nearFoot = point(55 + elbowStep * 7, 0);
    } else if (action === "knee") {
      var kneeRecover = phase(t, 0.5, 0.86);
      var kneeLegIn = phase(t, 0.04, 0.16);
      var kneeLegReturn = phase(t, 0.64, 0.94);
      var kneeLegBlend = kneeLegIn * (1 - kneeLegReturn);
      var kneeLanding = phase(t, 0.66, 0.86);
      var kneeGrip = phase(t, 0.02, 0.14) * (1 - kneeRecover * 0.55);
      var chamber = phase(t, 0.05, 0.25) * (1 - kneeRecover * 0.9);
      var kneeHipLoad =
        acceleratePhase(t, 0.02, 0.18, 2.1) * (1 - kneeRecover * 0.86);
      var kneeShoulderLoad =
        acceleratePhase(t, 0.07, 0.25, 2.25) * (1 - kneeRecover * 0.88);
      var kneeWhip =
        acceleratePhase(t, 0.16, 0.42, 2.15) *
        (1 - phase(t, 0.56, 0.86) * 0.78);
      var kneeContact =
        acceleratePhase(t, 0.22, 0.42, 2.55) *
        (1 - phase(t, 0.58, 0.86) * 0.93);
      var kneeSettle = phase(t, 0.62, 0.96);
      var kneeHipDrive = kneeWhip;
      var kneeCounter = kneeWhip;
      var kneeTarget = targetHead ? point(targetHead.x - 2, targetHead.y + 12) : null;
      var kneeFold = Math.max(chamber, kneeHipDrive);
      var neutralKneeShinFollow = point(
        neutralPose.farFoot.x - neutralPose.farKnee.x,
        neutralPose.farFoot.y - neutralPose.farKnee.y,
      );
      var kneeShinFollow = point(
        -7 - kneeFold * 3 + kneeSettle * 3,
        48 - kneeHipDrive * 2 + kneeSettle * 4,
      );
      kneeShinFollow = blendPoint(
        neutralKneeShinFollow,
        kneeShinFollow,
        kneeLegBlend,
      );
      p.hipAttachBlend = 0.28 + kneeRecover * 0.3;
      p.shoulderAttachBlend = 0.3 + kneeRecover * 0.28;
      p.pelvis = point(
        10 +
          kneeHipLoad * 10 +
          chamber * 6 +
          kneeHipDrive * 22 -
          kneeRecover * 8,
        -59 + yBob - chamber * 2 - kneeHipDrive * 5 + kneeRecover * 3,
      );
      p.chest = point(
        14 + kneeShoulderLoad * 9 - kneeCounter * 25 - kneeRecover * 3,
        -96 + yBob - chamber * 4 + kneeHipDrive * 3,
      );
      p.neck = point(
        25 + kneeShoulderLoad * 6 - kneeCounter * 30,
        -111 + yBob - chamber * 2 + kneeHipDrive * 5,
      );
      p.head = point(
        36 + kneeShoulderLoad * 4 - kneeCounter * 34,
        -126 + yBob - chamber + kneeHipDrive * 6,
      );
      p.nearElbow = point(
        23 + kneeGrip * 8 + kneeShoulderLoad * 4 - kneeCounter * 14,
        -84 + yBob - chamber * 7 + kneeHipDrive * 5,
      );
      p.nearFist = point(
        34 + kneeGrip * 5 + kneeShoulderLoad * 2 - kneeCounter * 20,
        -98 + yBob - chamber * 9 + kneeHipDrive * 7,
      );
      p.farElbow = point(
        9 + kneeGrip * 7 + kneeShoulderLoad * 8 - kneeCounter * 12,
        -83 + yBob - chamber * 4 + kneeHipDrive * 7,
      );
      p.farFist = point(
        20 + kneeGrip * 4 + kneeShoulderLoad * 5 - kneeCounter * 20,
        -96 + yBob - chamber * 7 + kneeHipDrive * 9,
      );
      p.farHip = point(
        p.pelvis.x - 12 + kneeHipLoad * 4 + kneeHipDrive * 26,
        p.pelvis.y + 3 - chamber * 0.5,
      );
      p.nearHip = point(
        p.pelvis.x + 7 + kneeHipLoad * 2 + kneeHipDrive * 4,
        p.pelvis.y + 2 - chamber * 0.6,
      );
      p.nearKnee = point(
        38 + kneeHipLoad * 5 + chamber * 4 + kneeHipDrive * 5,
        -37 - chamber * 2 - kneeHipDrive * 6,
      );
      p.nearFoot = point(BODY_MODEL.frontFoot.x, 0);
      p.strikeKnee = blendPoint(
        neutralPose.farKnee,
        point(
          28 + chamber * 24 + kneeHipDrive * 40,
          -76 - chamber * 25 - kneeHipDrive * 6,
        ),
        kneeLegBlend,
      );
      p.strikeKneeTarget = kneeTarget;
      p.strikeKneeTargetBlend = connected
        ? kneeContact * 0.98 * kneeLegBlend
        : 0;
      p.strikeFoot = blendPoint(
        shifted(p.strikeKnee, kneeShinFollow.x, kneeShinFollow.y),
        neutralPose.farFoot,
        kneeLanding,
      );
      if (p.strikeFoot.y > 0) p.strikeFoot = point(p.strikeFoot.x, 0);
      if (kneeLegBlend > 0.08)
        p.strikeFootAngle = Math.PI * 0.56 * kneeLegBlend;
      p.strikeFootGroundLimit = true;
      p.strikeShinFollow = point(
        p.strikeFoot.x - p.strikeKnee.x,
        p.strikeFoot.y - p.strikeKnee.y,
      );
      p.strikeThighLength = lerp(
        BODY_MODEL.limbLengths.farLeg[0],
        BODY_MODEL.limbLengths.strikeThigh,
        kneeLegBlend,
      );
      p.strikeShinLength = lerp(
        BODY_MODEL.limbLengths.farLeg[1],
        BODY_MODEL.limbLengths.strikeShin,
        kneeLegBlend,
      );
      if (kneeLegBlend > 0.015) applyStrikeLeg(p, false, true);
    } else if (action === "flying_knee") {
      var flyRecover = phase(t, 0.46, 0.78);
      var flyLegIn = phase(t, 0.03, 0.12);
      var flyLegReturn = phase(t, 0.5, 0.82);
      var flyLegBlend = flyLegIn * (1 - flyLegReturn);
      var flyLanding = phase(t, 0.56, 0.76);
      var flyLoad = phase(t, 0.01, 0.1) * (1 - flyRecover * 0.55);
      var flyChamber = phase(t, 0.04, 0.18) * (1 - flyRecover * 0.84);
      var flyLaunch = phasePulse(t, 0.04, 0.46);
      var flyHipLoad =
        acceleratePhase(t, 0.01, 0.12, 2.25) * (1 - flyRecover * 0.86);
      var flyShoulderLoad =
        acceleratePhase(t, 0.05, 0.18, 2.4) * (1 - flyRecover * 0.88);
      var flyWhip =
        acceleratePhase(t, 0.13, 0.32, 2.75) *
        (1 - phase(t, 0.42, 0.72) * 0.78);
      var flyContact =
        acceleratePhase(t, 0.18, 0.34, 3) *
        (1 - phase(t, 0.4, 0.7) * 0.93);
      var flyHipDrive = flyWhip;
      var flyCounter = flyWhip;
      var flyTarget = targetHead ? point(targetHead.x - 3, targetHead.y + 13) : null;
      var flyFold = Math.max(flyChamber, flyHipDrive);
      var neutralFlyShinFollow = point(
        neutralPose.farFoot.x - neutralPose.farKnee.x,
        neutralPose.farFoot.y - neutralPose.farKnee.y,
      );
      var flyShinFollow = point(
        -7 - flyFold * 3 + flyRecover * 3,
        49 - flyHipDrive * 2 + flyRecover * 4,
      );
      flyShinFollow = blendPoint(
        neutralFlyShinFollow,
        flyShinFollow,
        flyLegBlend,
      );
      p.hipAttachBlend = 0.26 + flyRecover * 0.3;
      p.shoulderAttachBlend = 0.3 + flyRecover * 0.28;
      p.pelvis = point(
        8 +
          flyHipLoad * 6 +
          flyChamber * 9 +
          flyHipDrive * 24 -
          flyRecover * 12,
        -61 +
          yBob -
          flyLaunch * 8 -
          flyChamber * 5 -
          flyHipDrive * 2 +
          flyRecover * 24,
      );
      p.chest = point(
        16 +
          flyLoad * 4 +
          flyShoulderLoad * 10 -
          flyCounter * 28 -
          flyRecover * 7,
        -98 + yBob - flyLaunch * 6 - flyChamber * 4 + flyHipDrive * 4 + flyRecover * 19,
      );
      p.neck = point(
        27 +
          flyLoad * 3 +
          flyShoulderLoad * 7 -
          flyCounter * 34 -
          flyRecover * 6,
        -113 + yBob - flyLaunch * 6 - flyChamber * 3 + flyHipDrive * 6 + flyRecover * 17,
      );
      p.head = point(
        38 +
          flyLoad * 2 +
          flyShoulderLoad * 5 -
          flyCounter * 40 -
          flyRecover * 5,
        -127 + yBob - flyLaunch * 5 - flyChamber * 2 + flyHipDrive * 7 + flyRecover * 15,
      );
      p.nearElbow = point(
        31 + flyLoad * 4 + flyShoulderLoad * 4 - flyCounter * 16,
        -90 + yBob - flyLaunch * 4 - flyChamber * 2 + flyHipDrive * 6 + flyRecover * 8,
      );
      p.nearFist = point(
        43 + flyLoad * 2 + flyShoulderLoad * 2 - flyCounter * 23,
        -111 + yBob - flyLaunch * 4 - flyChamber * 3 + flyHipDrive * 8 + flyRecover * 9,
      );
      p.farElbow = point(
        4 + flyLoad * 6 + flyShoulderLoad * 8 - flyCounter * 14,
        -89 + yBob - flyLaunch * 4 - flyChamber + flyHipDrive * 7 + flyRecover * 8,
      );
      p.farFist = point(
        14 + flyLoad * 5 + flyShoulderLoad * 5 - flyCounter * 24,
        -111 + yBob - flyLaunch * 4 - flyChamber * 2 + flyHipDrive * 10 + flyRecover * 8,
      );
      p.nearHip = point(p.pelvis.x + 10, p.pelvis.y + 2);
      p.farHip = point(p.pelvis.x - 10, p.pelvis.y + 3);
      p.strikeKnee = point(
        38 +
          flyChamber * 24 +
          flyHipDrive * 54 +
          reach * 0.03 -
          flyRecover * 13,
        -82 -
          flyLaunch * 8 -
          flyChamber * 27 -
          flyHipDrive * 6 +
          flyRecover * 28,
      );
      p.strikeKnee = blendPoint(neutralPose.farKnee, p.strikeKnee, flyLegBlend);
      p.strikeKneeTarget = flyTarget;
      p.strikeKneeTargetBlend = connected ? flyContact * 0.98 * flyLegBlend : 0;
      p.strikeFoot = blendPoint(
        point(
          p.strikeKnee.x + flyShinFollow.x,
          p.strikeKnee.y + flyShinFollow.y,
        ),
        neutralPose.farFoot,
        flyLanding,
      );
      if (p.strikeFoot.y > 0) p.strikeFoot = point(p.strikeFoot.x, 0);
      if (flyLegBlend > 0.08)
        p.strikeFootAngle = Math.PI * 0.56 * flyLegBlend;
      p.strikeFootGroundLimit = true;
      p.strikeShinFollow = point(
        p.strikeFoot.x - p.strikeKnee.x,
        p.strikeFoot.y - p.strikeKnee.y,
      );
      p.strikeThighLength = lerp(
        BODY_MODEL.limbLengths.farLeg[0],
        BODY_MODEL.limbLengths.strikeThigh,
        flyLegBlend,
      );
      p.strikeShinLength = lerp(
        BODY_MODEL.limbLengths.farLeg[1],
        BODY_MODEL.limbLengths.strikeShin,
        flyLegBlend,
      );
      if (flyLegBlend > 0.015) applyStrikeLeg(p, false, true);
      p.nearKnee = point(
        18 - flyLoad * 5 - flyLaunch * 28 + flyCounter * 3 + flyRecover * 7,
        -36 - flyLaunch * 9 - flyChamber * 2 + flyCounter * 4 + flyRecover * 4,
      );
      p.nearFoot = point(
        44 - flyLoad * 7 - flyLaunch * 42 - flyCounter * 3 + flyRecover * 14,
        Math.min(0, -flyLaunch * 6 + flyCounter * 2),
      );
      var flyLeadFootAngleBlend =
        phase(t, 0.03, 0.12) * (1 - phase(t, 0.48, 0.7));
      if (flyLeadFootAngleBlend > 0.08)
        p.nearFootAngle = Math.PI * 0.5 * flyLeadFootAngleBlend;
    } else if (action === "advance") {
      var advanceHop = phasePulse(t, 0.03, 0.31);
      var advanceLean = phasePulse(t, 0.05, 0.34);
      var advanceLand = phasePulse(t, 0.34, 0.58);
      p.pelvis = point(
        6 + advanceLean * 8 - advanceLand * 3,
        -54 + yBob - advanceHop * 8 + advanceLand * 2,
      );
      p.chest = point(
        16 + advanceLean * 8 - advanceLand * 2,
        -92 + yBob - advanceHop * 7,
      );
      p.neck = point(
        28 + advanceLean * 7 - advanceLand * 2,
        -108 + yBob - advanceHop * 7,
      );
      p.head = point(
        40 + advanceLean * 6 - advanceLand * 2,
        -122 + yBob - advanceHop * 6,
      );
      p.farElbow = point(20 + advanceLean * 2, -82 + yBob - advanceHop * 2);
      p.farFist = point(36 + advanceLean * 3, -105 + yBob - advanceHop * 2);
      p.nearElbow = point(47 + advanceLean * 3, -82 + yBob - advanceHop * 2);
      p.nearFist = point(66 + advanceLean * 3, -94 + yBob - advanceHop * 2);
      p.nearKnee = point(
        26 + advanceLean * 5,
        -31 - advanceHop * 10 + advanceLand * 4,
      );
      p.nearFoot = point(
        51 + advanceLean * 3,
        -advanceHop * 9 + advanceLand * 2,
      );
      p.farKnee = point(
        -19 - advanceLean * 3,
        -29 - advanceHop * 9 + advanceLand * 4,
      );
      p.farFoot = point(
        -47 - advanceLean * 2,
        -advanceHop * 8 + advanceLand * 2,
      );
    } else if (action === "retreat") {
      var retreatHop = phasePulse(t, 0.03, 0.31);
      var retreatTravel = phase(t, 0.03, 0.36) * 24;
      var retreatRear = phase(t, 0.02, 0.24);
      p.pelvis = point(1 - retreatTravel, -54 + yBob - retreatHop * 5);
      p.chest = point(10 - retreatTravel * 0.82, -91 + yBob - retreatHop * 6);
      p.neck = point(22 - retreatTravel * 0.78, -108 + yBob - retreatHop * 6);
      p.head = point(34 - retreatTravel * 0.72, -122 + yBob - retreatHop * 6);
      p.nearElbow = point(
        39 - retreatTravel * 0.22,
        -84 + yBob - retreatHop * 2,
      );
      p.nearFist = point(
        49 - retreatTravel * 0.24,
        -105 + yBob - retreatHop * 2,
      );
      p.farElbow = point(
        18 - retreatTravel * 0.26,
        -80 + yBob - retreatHop * 2,
      );
      p.farFist = point(31 - retreatTravel * 0.3, -101 + yBob - retreatHop * 2);
      p.farKnee = point(
        -19 - retreatTravel - retreatRear * 8,
        -29 - retreatHop * 9,
      );
      p.farFoot = point(-47 - retreatTravel - retreatRear * 9, -retreatHop * 8);
      p.nearKnee = point(25 - retreatTravel * 0.9, -31 - retreatHop * 8);
      p.nearFoot = point(51 - retreatTravel * 0.9, -retreatHop * 7);
    } else if (action === "roll") {
      var rollIn = phase(t, 0.04, 0.26);
      var rollOut = phase(t, 0.58, 0.88);
      var duck = rollIn * (1 - rollOut);
      var tuck = phasePulse(t, 0.08, 0.76);
      var travel = phase(t, 0.06, 0.78);
      var recover = phase(t, 0.72, 0.96);
      p.pelvis = point(5 + travel * 22 - recover * 4, -46 + yBob + duck * 12);
      p.chest = point(18 + travel * 31 - recover * 7, -77 + yBob + duck * 21);
      p.neck = point(31 + travel * 32 - recover * 8, -89 + yBob + duck * 21);
      p.head = point(45 + travel * 31 - recover * 8, -101 + yBob + duck * 20);
      p.nearElbow = point(39 + travel * 29 + tuck * 8, -66 + yBob + duck * 16);
      p.nearFist = point(65 + travel * 27 + tuck * 4, -60 + yBob + duck * 13);
      p.farElbow = point(14 + travel * 29 + tuck * 4, -70 + yBob + duck * 15);
      p.farFist = point(0 + travel * 26 - tuck * 5, -61 + yBob + duck * 13);
      p.nearKnee = point(27 + travel * 29 + tuck * 5, -28 + duck * 12);
      p.nearFoot = point(55 + travel * 35, -1);
      p.farKnee = point(-15 + travel * 29, -24 + duck * 9);
      p.farFoot = point(-50 + travel * 24, 0);
    }

    blendPose(
      p,
      neutralPose,
      returnToNeutralBlend(action, t, params.neutralBlend),
    );
    applyHighGuard(p, highGuard);
    applyHitReaction(p, hitAction, hit);

    constrainBodyFrame(p);
    attachPose(p);
    constrainBodyFrame(p);
    applyCrossTargeting(p);
    applyStrikeKneeTargeting(p);
    applyDynamicArmPoles(p);
    return constrainPose(p);
  }

  function line(g, a, b, width, color, alpha) {
    g.moveTo(a.x, a.y)
      .lineTo(b.x, b.y)
      .stroke({
        width: width,
        color: color,
        alpha: alpha || 1,
        cap: "round",
        join: "round",
      });
  }

  function limb(g, a, b, c, width, color, alpha) {
    line(g, a, b, width, color, alpha);
    line(g, b, c, width * 0.92, color, alpha);
  }

  function drawJoint(g, p, radius, color, alpha) {
    g.circle(p.x, p.y, radius).fill({ color: color, alpha: alpha || 1 });
  }

  function drawSpineAndNeck(g, p, color, alpha) {
    line(g, p.farHip, p.nearHip, 7, color, alpha);
    line(g, p.farShoulder, p.nearShoulder, 7, color, alpha);
    line(g, p.pelvis, p.chest, 9, color, alpha);
    line(g, p.chest, p.neck, 8, color, alpha);
    line(g, p.neck, p.head, 7, color, alpha);
    drawJoint(g, p.chest, 5, color, alpha);
    drawJoint(g, p.neck, 5, color, alpha);
  }

  function drawHead(g, p, color, fillColor, alpha) {
    g.ellipse(p.head.x, p.head.y, 13, 16)
      .fill({ color: fillColor, alpha: alpha })
      .stroke({ width: 5, color: color, alpha: alpha });
  }

  function drawHand(g, p, color, fillColor, alpha) {
    g.roundRect(p.x - 7, p.y - 7, 15, 14, 5)
      .fill({ color: fillColor, alpha: alpha })
      .stroke({ width: 4, color: color, alpha: alpha });
  }

  function drawFoot(g, p, color, fillColor, alpha, angle) {
    var length = 28;
    var height = 8;
    var halfLength = length / 2;
    var halfHeight = height / 2;
    var cos;
    var sin;
    var px;
    var py;
    var points;
    if (typeof angle === "number") {
      cos = Math.cos(angle);
      sin = Math.sin(angle);
      px = -sin;
      py = cos;
      points = [
        p.x - cos * halfLength - px * halfHeight,
        p.y - sin * halfLength - py * halfHeight,
        p.x + cos * halfLength - px * halfHeight,
        p.y + sin * halfLength - py * halfHeight,
        p.x + cos * halfLength + px * halfHeight,
        p.y + sin * halfLength + py * halfHeight,
        p.x - cos * halfLength + px * halfHeight,
        p.y - sin * halfLength + py * halfHeight,
      ];
      g.moveTo(points[0], points[1])
        .lineTo(points[2], points[3])
        .lineTo(points[4], points[5])
        .lineTo(points[6], points[7])
        .closePath()
        .fill({ color: fillColor, alpha: alpha })
        .stroke({ width: 4, color: color, alpha: alpha, join: "round" });
      return;
    }
    g.roundRect(p.x - 12, p.y - 5, 28, height, 4)
      .fill({ color: fillColor, alpha: alpha })
      .stroke({ width: 4, color: color, alpha: alpha });
  }

  function drawRig(rig, pose, params, color, farColor, fillColor, alpha) {
    var backStrike =
      (params.action === "knee" ||
        params.action === "flying_knee" ||
        params.action === "teep") &&
      pose.strikeLegActive &&
      pose.strikeKnee &&
      pose.strikeFoot;
    alpha = 1;
    rig.shadow.ellipse(8, 3, 66, 10).fill({ color: 0x000000, alpha: 0.26 });

    if (backStrike) {
      limb(
        rig.farLeg,
        pose.farHip,
        pose.strikeKnee,
        pose.strikeFoot,
        10,
        farColor,
        alpha,
      );
      drawFoot(
        rig.farLeg,
        pose.strikeFoot,
        farColor,
        farColor,
        alpha,
        pose.strikeFootAngle,
      );
    } else {
      limb(
        rig.farLeg,
        pose.farHip,
        pose.farKnee,
        pose.farFoot,
        10,
        farColor,
        alpha,
      );
      drawFoot(rig.farLeg, pose.farFoot, farColor, farColor, alpha);
    }

    limb(
      rig.farArm,
      pose.farShoulder,
      pose.farElbow,
      pose.farFist,
      9,
      farColor,
      alpha,
    );
    if (params.action === "elbow")
      drawJoint(rig.farArm, pose.farElbow, 5, farColor, alpha);
    drawHand(rig.farArm, pose.farFist, farColor, farColor, alpha);

    drawSpineAndNeck(rig.core, pose, color, alpha);
    drawHead(rig.core, pose, color, fillColor, alpha);

    limb(
      rig.nearLeg,
      pose.nearHip,
      pose.nearKnee,
      pose.nearFoot,
      12,
      color,
      alpha,
    );
    drawFoot(
      rig.nearLeg,
      pose.nearFoot,
      color,
      fillColor,
      alpha,
      pose.nearFootAngle,
    );

    limb(
      rig.nearArm,
      pose.nearShoulder,
      pose.nearElbow,
      pose.nearFist,
      11,
      color,
      alpha,
    );
    drawHand(rig.nearArm, pose.nearFist, color, fillColor, alpha);

    drawJoint(rig.joints, pose.nearShoulder, 6, color, alpha);
    drawJoint(
      rig.joints,
      pose.nearElbow,
      5,
      color,
      alpha,
    );
    drawJoint(rig.joints, pose.nearHip, 6, color, alpha);
    drawJoint(rig.joints, pose.nearKnee, 6, color, alpha);
    drawJoint(rig.joints, pose.pelvis, 4, color, alpha);
    drawJoint(
      rig.joints,
      backStrike ? pose.strikeKnee : pose.farKnee,
      5,
      farColor,
      alpha,
    );
  }

  function draw(root, params) {
    var safeParams = params || {};
    var rig = ensure(root);
    var pose = basePose(safeParams);
    var color = safeParams.color || 0x6ee7ff;
    var farColor = safeParams.farColor || 0x3b5f88;
    var fillColor = safeParams.fillColor || color;
    var alpha = safeParams.alpha == null ? 1 : safeParams.alpha;
    var scale = safeParams.scale || 1;

    clear(rig);
    root.scale.x = (safeParams.facing === "left" ? -1 : 1) * scale;
    root.scale.y = scale;
    root.rotation = safeParams.rotation || 0;
    applyLayerZ(rig, safeParams.layerZ);
    drawRig(rig, pose, safeParams, color, farColor, fillColor, alpha);
  }

  function drawFlat(host, key, params) {
    var safeParams = params || {};
    var rig = ensureFlat(host, key);
    var pose = basePose(safeParams);
    var color = safeParams.color || 0x6ee7ff;
    var farColor = safeParams.farColor || 0x3b5f88;
    var fillColor = safeParams.fillColor || color;
    var alpha = safeParams.alpha == null ? 1 : safeParams.alpha;
    var scale = safeParams.scale || 1;
    var drawParams = safeParams;
    var facingSign;

    clear(rig);
    if (safeParams.anchorFrontFoot) {
      var anchorJoint = safeParams.anchorJoint || "nearFoot";
      var anchor = safeParams.anchorLivePose
        ? pose[anchorJoint] || pose.nearFoot
        : neutralAnchorPoint(anchorJoint);
      var verticalAnchor = safeParams.anchorHorizontalOnly
        ? neutralAnchorPoint("nearFoot")
        : anchor;
      facingSign = safeParams.facing === "left" ? -1 : 1;
      drawParams = copyParams(safeParams);
      drawParams.x = (safeParams.x || 0) - anchor.x * facingSign * scale;
      drawParams.y = (safeParams.y || 0) - verticalAnchor.y * scale;
    }
    if (typeof safeParams.groundY === "number") {
      if (drawParams === safeParams) drawParams = copyParams(safeParams);
      clampToGround(drawParams, pose, scale);
    }
    transformRig(rig, drawParams, scale);
    applyLayerZ(rig, safeParams.layerZ);
    drawRig(rig, pose, safeParams, color, farColor, fillColor, alpha);
  }

  return {
    draw: draw,
    drawFlat: drawFlat,
  };
})();
