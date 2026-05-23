# Rentopoly

This game is intentionally a public-information roll-and-move property trader; keep hidden state out unless `rules.visibility` changes in `game.js`.
The board, rent tables, card decks, and trade validation live in `game.js`; update `manifest.json` rules whenever those player-facing mechanics change.
Agent poll uses concise labels for tile actions and a schema-backed `propose_trade`; keep the raw defaults valid for timeout and validation paths.
Use deterministic helpers only; dice rolls come from stored seed state, not runtime randomness.
The UI is a single inline Pixi renderer in `index.html`; no build step or external app code is involved.
Before PR, run from the `games` repo root: `node scripts/test-game-logic.mjs rentopoly --sweep`.
