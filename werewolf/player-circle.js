/* ===== PLAYER CIRCLE ===== */
/* DOM-based circular player layout. Exports positions for canvas vote lines.
   Uses C.roleCss() for colors — single source of truth in constants.js. */

var PlayerCircle = {
  internalContainer: null,
  internalNodes: {},
  internalPositions: {},
  internalPlayers: [],
  internalW: 0,
  internalH: 0,

  create: function (overlayContainer) {
    var div = document.createElement("div");
    div.id = "player-circle";
    div.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;";
    overlayContainer.appendChild(div);
    PlayerCircle.internalContainer = div;
  },

  update: function (view, contextPlayers, myId) {
    var players = view.players || [];
    var alive = view.alive || {};
    var phase = view.phase;
    var showRoles = view.roles || null;
    var myRole = view.myRole || null;
    var seerHistory = view.seerHistory || [];

    for (var i = 0; i < players.length; i++) {
      var pid = players[i];
      var node = PlayerCircle.internalNodes[pid];
      if (!node) {
        node = PlayerCircle.internalCreateNode(pid, contextPlayers);
        PlayerCircle.internalNodes[pid] = node;
        PlayerCircle.internalContainer.appendChild(node);
      }

      /* State classes */
      node.className =
        "ww-avatar" +
        (alive[pid] ? " alive" : " dead") +
        (pid === myId ? " me" : "");
      node.style.animationDelay = i * 0.4 + "s";

      /* Border color: role-aware */
      var border = C.BORDER;
      if (showRoles?.[pid]) {
        border = C.roleCss(showRoles[pid]);
      } else if (pid === myId && myRole) {
        border = C.roleCss(myRole);
      } else if (
        myRole === "werewolf" &&
        view.werewolves &&
        view.werewolves.indexOf(pid) !== -1
      ) {
        border = C.roleCss("werewolf");
      }

      /* Seer knowledge overrides border */
      var seerKnown = PlayerCircle.internalSeerLookup(seerHistory, pid);
      if (seerKnown && myRole === "seer") {
        border = C.roleCss(seerKnown);
      }
      node.style.borderColor = border;

      /* Role label */
      var roleLabel = node.querySelector(".ww-role-label");
      if (showRoles?.[pid]) {
        PlayerCircle.internalShowLabel(
          roleLabel,
          showRoles[pid],
          C.roleCss(showRoles[pid]),
        );
      } else if (seerKnown && myRole === "seer") {
        PlayerCircle.internalShowLabel(
          roleLabel,
          seerKnown,
          C.roleCss(seerKnown),
        );
      } else {
        roleLabel.style.display = "none";
      }

      /* Vote checkmark */
      var check = node.querySelector(".ww-check");
      check.style.display =
        phase === "day_vote" && view.voted && view.voted[pid]
          ? "block"
          : "none";
    }

    /* Remove departed players */
    var nodeKeys = Object.keys(PlayerCircle.internalNodes);
    for (var j = 0; j < nodeKeys.length; j++) {
      if (players.indexOf(nodeKeys[j]) === -1) {
        PlayerCircle.internalNodes[nodeKeys[j]].remove();
        delete PlayerCircle.internalNodes[nodeKeys[j]];
        delete PlayerCircle.internalPositions[nodeKeys[j]];
      }
    }

    PlayerCircle.internalPlayers = players;
    PlayerCircle.internalPositionNodes();
  },

  /* ── Private helpers ── */

  internalSeerLookup: function (history, pid) {
    for (var i = 0; i < history.length; i++) {
      if (history[i].target === pid) return history[i].role;
    }
    return null;
  },

  internalShowLabel: function (el, text, color) {
    el.textContent = text;
    el.style.color = color;
    el.style.display = "block";
  },

  internalCreateNode: function (pid, contextPlayers) {
    var name = pid;
    for (var i = 0; i < contextPlayers.length; i++) {
      if (contextPlayers[i].id === pid) {
        name = contextPlayers[i].name || pid;
        break;
      }
    }

    var div = document.createElement("div");
    div.className = "ww-avatar";
    div.setAttribute("data-player", pid);

    var letter = document.createElement("span");
    letter.className = "ww-letter";
    letter.textContent = name.charAt(0).toUpperCase();
    div.appendChild(letter);

    var nameEl = document.createElement("span");
    nameEl.className = "ww-name";
    nameEl.textContent = name;
    div.appendChild(nameEl);

    var roleLabel = document.createElement("span");
    roleLabel.className = "ww-role-label";
    roleLabel.style.display = "none";
    div.appendChild(roleLabel);

    var check = document.createElement("span");
    check.className = "ww-check";
    check.textContent = "\u2713";
    check.style.display = "none";
    div.appendChild(check);

    return div;
  },

  internalPositionNodes: function () {
    var players = PlayerCircle.internalPlayers;
    var count = players.length;
    if (count === 0) return;

    var w = PlayerCircle.internalW || window.innerWidth;
    var h = PlayerCircle.internalH || window.innerHeight;
    var cx = w / 2;
    var cy = h * C.CIRCLE_CENTER_Y;
    var radius = Math.min(w, h) * C.CIRCLE_RADIUS_RATIO;
    var half = C.AVATAR_SIZE / 2;

    for (var i = 0; i < count; i++) {
      var angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      var x = cx + Math.cos(angle) * radius;
      var y = cy + Math.sin(angle) * radius;

      var node = PlayerCircle.internalNodes[players[i]];
      if (node) {
        node.style.left = x - half + "px";
        node.style.top = y - half + "px";
      }
      PlayerCircle.internalPositions[players[i]] = { x: x, y: y };
    }
  },

  getPosition: function (playerId) {
    return PlayerCircle.internalPositions[playerId] || null;
  },

  recalculate: function () {
    PlayerCircle.internalW = window.innerWidth;
    PlayerCircle.internalH = window.innerHeight;
    PlayerCircle.internalPositionNodes();
  },

  resize: function (w, h) {
    PlayerCircle.internalW = w;
    PlayerCircle.internalH = h;
    PlayerCircle.internalPositionNodes();
  },
};
