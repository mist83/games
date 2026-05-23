(function() {
  function hash01(a, b, c) {
    var n = Math.sin((a + 1) * 12.9898 + (b + 1) * 78.233 + (c + 1) * 37.719);
    return n - Math.floor(n);
  }

  function colorFor(kind, index) {
    var sets = {
      fire: [0xff431a, 0xff9b1f, 0xffd166, 0x431006],
      lava: [0xff2e00, 0xff7a00, 0xffd23b, 0x2b0500],
      laser: [0xa8f7ff, 0xfff7b7, 0x7bdff2, 0xffffff],
      dirt: [0x1d8f28, 0x0c5b19, 0x42c65f, 0x774d20],
      water: [0x3fb7ff, 0x176bff, 0xa7efff, 0x0e315e],
      extinguish: [0xcaf7ff, 0x75d7ff, 0xffffff, 0x9bc7d5],
      glue: [0x81e6ff, 0xc8f7ff, 0x3aa6cb, 0xffffff],
      bouncy: [0x33d6ff, 0xc8fbff, 0x087a96, 0x6ff0ff],
      blast: [0xffe066, 0xff8a1f, 0xf7f3d2, 0x8f1f05],
    };
    var list = sets[kind] || sets.blast;
    return list[index % list.length];
  }

  function particleSpec(event, index) {
    var kind = event.type === "burn" ? "fire" : event.mat || event.type || "blast";
    var speed = 70 + hash01(index, event.x || 0, 2) * 220;
    var angle = hash01(index, event.y || 0, 3) * Math.PI * 2;
    if (event.type === "dirt" || event.mat === "dirt") {
      speed *= 0.75;
      angle = -Math.PI / 2 + (hash01(index, 3, 4) - 0.5) * 1.8;
    }
    if (event.type === "burn") {
      speed *= 0.32;
      angle = -Math.PI / 2 + (hash01(index, 6, 5) - 0.5) * 1.1;
    }
    if (event.type === "extinguish") {
      speed *= 0.38;
      angle = -Math.PI / 2 + (hash01(index, 8, 5) - 0.5) * 1.4;
    }
    return {
      x: event.x || 0,
      y: event.y || 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (kind === "fire" || kind === "lava" || event.type === "extinguish" ? 80 : 30),
      life: 0.75 + hash01(index, 9, 1) * 0.95,
      age: 0,
      size: 3 + hash01(index, 4, 7) * (kind === "fire" || kind === "lava" ? 10 : 6),
      color: colorFor(kind, index),
      kind: kind,
    };
  }

  window.ArcTanksEffects = {
    hash01: hash01,
    colorFor: colorFor,
    particleSpec: particleSpec,
  };
})();
