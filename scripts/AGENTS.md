# scripts/

These scripts are author-facing and must run inside the standalone games repo.
Do not import from `../packages/*`, `apps/*`, or the main monorepo.
`test-game-logic.mjs` and `test-game-ui.mjs` share `lib/load-game-logic.mjs`; keep loader behavior aligned with upload/runtime semantics.
Tests should report errors an autonomous coding agent can fix without reading server logs.
UI checks must cover mobile and desktop viewports and catch console errors, overflow, offscreen controls, and obvious control overlap.
`e2e-play.mjs` prompts are the product: keep browser workers alive through gameplay, make REST workers deadline-aware, and require Expectation/QA Test Cases/Result report sections.
QA workers should write down the odd cases they invent while playing in `tests.jsonl`; root should aggregate them into `reports/test-cases.json` and `reports/summary.md`.
The root orchestrator prompt template lives in `e2e-play-root-prompt.md`; edit that file instead of burying prompt prose in JavaScript.
