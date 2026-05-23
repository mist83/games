# games/liarliar

Bluffing party game. Players write fake answers to trivia; everyone then votes for the one they think is real.

## Shape

- **Players:** 2-8.
- **Rendering:** DOM only (no Canvas, no PixiJS).
- **Files:** 3-file format.
- **Phases:** `writing → voting → results → gameOver` — simultaneous turns.

## Gotchas

- Trivia bank is embedded inline in `game.js` as a `QUESTIONS` array. Adding questions means editing that file.
- Scoring: +500 for finding truth, +250 per player fooled by your lie.
- All players submit simultaneously in each phase (`simultaneous-turns` pattern).
