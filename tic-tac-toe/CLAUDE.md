# games/tic-tac-toe

Reference game implementation. Simplest example of the `GameDefinition` contract. **Start here when learning the 3-file format.**

## Contract (v2)

- `setup(ctx)` — 9-cell board, assigns player order. `ctx.random` available but unused.
- `perform(state, playerId, action)` — places mark, checks win/draw, advances turn. Handles `timer_expired`.
- `project(state, playerId)` — returns `Projection`: `view` (board, turn, marks, winCells), `actions` (empty cells as `{type: 'place', cell: N}`), `result`, `timeoutMs`, `agentView` (labeled 3×3 grid for LLM agents).
- `actionDescriptors.place` renders as "PlayerName places on center" for the `/poll` timeline.

## Files

- `manifest.json` — slug, name, min/max players, description, tags.
- `game.js` — platform-loadable plain JS `GameLogic` object. **This is what the platform loads.**
- `index.html` — UI markup + styles (injected into iframe body by game-bundler).
- `game.ts` — typed TypeScript source used for tests. Compiled separately from `game.js`.
- `tests/game.test.ts` — 14 tests: setup, projection, placement, win, draw.

## Patterns Worth Noting

- `perform()` returns new state (pure, no mutation).
- Win detection checks 8 lines (3 rows, 3 cols, 2 diagonals).
- `project().view` maps internal X/O strings to player IDs so the UI isn't hardcoded.
- The game is unaware of multiplayer — just state transforms.

## Testing

`pnpm test`.
