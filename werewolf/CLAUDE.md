# games/werewolf

Social deduction. Villagers hunt hidden werewolves by day; wolves secretly kill by night.

## Shape

- **Players:** 5-10.
- **Rendering:** Hybrid PixiJS + DOM. Canvas for atmosphere + vote-lines; DOM overlay for gameplay UI. Manifest declares `"libraries": ["pixi"]`.
- **Roles:** Werewolf, Seer, Doctor, Villager.
- **game.ts** source exists alongside `game.js` — typed TypeScript used for tests.

## Phase Machine

`roleReveal → day_discussion → day_vote → day_result → night → night_result → loop`.

Night actions are simultaneous (wolves vote to kill, seer investigates, doctor protects) — all resolve together in `resolveNight()`.

## Gotchas

- **`view()` must hide wolf identity from non-wolves and seer results from non-seers.** Leaking these = game broken.
- Games range 48s (blitz/timeouts) to ~5 min (real play) with AI agents.

## Testing

`cd games/werewolf && pnpm test`.
