# scripts/lib/

## Architecture

This folder holds shared test harness code. It keeps the public scripts short and makes the production-sensitive pieces, especially game loading and deterministic engine behavior, consistent across logic and UI tests.

The runtime is intentionally a small JavaScript snapshot instead of a package import. That tradeoff avoids requiring the main monorepo while keeping local author validation close to the platform contract.

## Components

`load-game-logic.mjs` executes `game.js` as a classic script in a restricted VM context, then returns `GameLogic`.

`playgent-core.mjs` provides `GameEngine`, seeded randomness, lifecycle-action filtering, decision-option unwrapping, opportunity-derived action/timer helpers, outcome helpers, and projection validation for `view`, `agentView`, and optional `Projection.agent` tool intent.

`html-test-harness.mjs` builds a browser page with mock `window.playgent`, injected helper files, and optional vendored PixiJS.

`platform-sounds.mjs` mirrors the public platform sound catalog for local UI validation. Keep it aligned with the main repo's `apps/shell/public/SOUND_GUIDE.md` and `sounds/catalog.json`.
