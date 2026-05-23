/* ===== TWEEN SYSTEM ===== */

var Tween = {
  internalTweens: [],

  to: function (target, props, duration, ease, onComplete) {
    if (!target || target.destroyed) return null;
    var tw = {
      target: target,
      startProps: {},
      endProps: props,
      duration: duration || 400,
      ease: ease || "easeOut",
      elapsed: 0,
      onComplete: onComplete || null,
    };
    var keys = Object.keys(props);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      tw.startProps[k] = target[k] !== undefined ? target[k] : 0;
    }
    Tween.internalTweens.push(tw);
    return tw;
  },

  update: function (dt) {
    var ms = dt * 16.67;
    var remaining = [];
    for (var i = 0; i < Tween.internalTweens.length; i++) {
      var tw = Tween.internalTweens[i];
      if (!tw.target || tw.target.destroyed) continue;
      tw.elapsed += ms;
      var t = tw.elapsed / tw.duration;
      if (t > 1) t = 1;
      var e;
      if (tw.ease === "linear") e = t;
      else if (tw.ease === "easeIn") e = t * t;
      else if (tw.ease === "backOut") {
        var s = 1.70158;
        e = 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
      } else if (tw.ease === "elasticOut") {
        e =
          t === 0
            ? 0
            : t === 1
              ? 1
              : Math.pow(2, -10 * t) *
                  Math.sin(((t - 0.075) * (2 * Math.PI)) / 0.3) +
                1;
      } else e = 1 - (1 - t) * (1 - t); /* easeOut */
      var keys = Object.keys(tw.endProps);
      for (var j = 0; j < keys.length; j++) {
        var k = keys[j];
        tw.target[k] =
          tw.startProps[k] + (tw.endProps[k] - tw.startProps[k]) * e;
      }
      if (t < 1) remaining.push(tw);
      else if (tw.onComplete) tw.onComplete();
    }
    Tween.internalTweens = remaining;
  },

  killAll: function () {
    Tween.internalTweens = [];
  },

  killTweensOf: function (target) {
    Tween.internalTweens = Tween.internalTweens.filter(function (tw) {
      return tw.target !== target;
    });
  },
};
