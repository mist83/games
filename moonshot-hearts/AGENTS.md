# Moonshot Hearts

Pass and play decisions should contain only the cards needed by `perform()`; keep card text in labels or `agentView`, not in raw actions.
Passing generates many combinations, so labels must stay short and deterministic.
`agentView` should list the hand, trick context, scores, and playable cards without duplicating every pass option.
The game is fixed at four players; do not loosen player count unless the full Hearts rules are reworked.
Run checks from the games repo root: `node scripts/test-game-logic.mjs ./moonshot-hearts --sweep`.
