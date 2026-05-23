# games/texas-holdem

No-limit Texas Hold'em poker. Sequential betting rounds with hidden hole cards.

## Shape

- **Players:** 2-12, configurable starting chips.
- **Rendering:** PixiJS (WebGL). Manifest declares `"libraries": ["pixi"]`.
- **Modules:** `game.js` + PixiJS UI modules (`card-sprite.js`, `table-view.js`, `player-node.js`, `action-bar.js`, `hand-eval.js`, `spectator-odds.js`, `layout.js`, `constants.js`, `tween.js`, `effects.js`).
- Implements: blinds, 4 betting rounds, hand evaluation, showdown, side pots.

## Gotchas

- **`hand-eval.js`** contains the 5-card evaluator (`_eval5`, `_bestHand`). Poker hand rankings are non-trivial — test thoroughly before modifying.
- **`player-node.js` scope trap** — `updateFromView` must declare `var avatarR = node._avatarR` at top. Hoisting bug caused a crash previously.
- **Hot-reload disposes the isolate** — editing game files during an in-flight REST call silently fails. Restart the host _after_ edits.
- Games last 6-13 minutes with AI agents (~27 polls per agent, ~70 chat messages).
- PixiJS UI is functional but not polished; target is Zynga Poker level.
