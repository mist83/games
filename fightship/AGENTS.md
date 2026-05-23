# FightShip

Keep placement deterministic: `auto_place` and the default `ready` fleet both come from `game.js` `_autoFleet`.
Do not put the full `ready.ships` JSON in agent-facing labels; labels stay compact and the decision payload carries the fleet.
`shotLog` in projected `view` is intentionally capped because the iframe does not read the full history.
`agentView` is the compact poll surface: grids, last shot, and fleet hit counts should stay mechanical and bounded.
Run checks from the games repo root: `node scripts/test-game-logic.mjs ./fightship --sweep`.
