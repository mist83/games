# scripts/lib/

This folder is a minimal standalone mirror of author-facing platform behavior.
Keep `playgent-core.mjs` small; add only runtime pieces needed by local tests.
`load-game-logic.mjs` must accept canonical uploaded games that only declare `var GameLogic = {...}`.
Do not add network, DOM, or monorepo dependencies here.
`platform-sounds.mjs` must stay in sync with the public platform sound catalog; UI tests use it to reject stale or unknown `playgent.sound()` IDs.
