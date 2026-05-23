# games/team-agent-tactics

1v1 / 2v2 auto-battler. Draft units from a shared pool, build synergies, fight. Team HP shared in 2v2.

## Shape

- **Players:** 2 (1v1) or 4 (2v2). No other counts.
- **Rendering:** PixiJS (WebGL). Manifest declares `"libraries": ["pixi"]`.
- **Modules:** `game.js` + PixiJS UI modules (`board-view.js`, `shop-panel.js`, `bench-panel.js`, `hud-view.js`, `layout.js`, `constants.js`, `tween.js`, `effects.js`, `styles.css`).
- Implements: 26-unit roster with tier/trait/atk/hp, shop + bench/board placement (4×2 grid), 6 traits, star upgrades (3-of-a-kind), economy (gold + streak bonus), team HP, fixed-lane matchups, gift unit + gift gold (2v2 only).

## Gotchas

- **Mode detection** — `setup()` checks `ids.length`: 2 = 1v1, 4 = 2v2, anything else → immediate gameOver. No FFA.
- **Fixed lanes** — matchups never change: `alpha[0]` vs `beta[0]`, `alpha[1]` vs `beta[1]`. Set once in `setup()`.
- **Team HP** — both lane results apply independently to the losing team's HP. No netting.
- **Gift lifecycle** — `giftedUnitThisRound` / `giftedGoldThisRound` must reset to `false` in `_advanceToShop`. Gifting to a ready teammate is allowed.
- **Phase machine** — `shop → battle → battleResult → loop`. Battle phase auto-resolves via `__system__` action. **Handle system actions BEFORE player-identity guards in `perform()`.**
- **Display phases need `opportunities()` deadlines** — every display phase (e.g. `battleResult`) needs a system opportunity with `deadline.timeoutMs` and `deadline.onExpire`, or the game freezes.
- **Shared unit pool** — buying depletes it, selling returns units to it.
- **Star merge** — 3 copies → 1 star unit with `ceil(1.5×)` stats. Triggers on buy AND on gift-receive. Check both paths.
- **Grid indexing** — `board[0-3]` = front row, `board[4-7]` = back row. Manhattan distance for targeting.
