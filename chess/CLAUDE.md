# games/chess

Classic 2-player chess. Sequential turns, full rules.

## Shape

- **Players:** 2.
- **Rendering:** DOM + Canvas (particle effects only).
- **Files:** 3-file format only (`manifest.json`, `game.js`, `index.html`). No extra modules.
- **`agentView`:** viewer color, White/Black names, side to move, check state, last move, and a labeled 8×8 grid for LLM agents.

## Rules Implemented (`game.js`)

Full chess: castling, en passant, pawn promotion choices, check/checkmate, stalemate, and insufficient-material draws (K-K, K+B-K, K+N-K).

## Gotchas

- Move generation validates legality — `getValidMoves()` filters pseudo-legal moves through check detection. You can't move into check.
- Draw detection is non-obvious; test before modifying.
