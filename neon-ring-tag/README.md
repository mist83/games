# Muay ThAI

## Architecture

Muay ThAI is a two-player simultaneous three-action Muay Thai game. The engine models three persistent distances: clinch, pocket, and capped distance. Each queued action resolves movement first, derives range from the fighters' front-foot numbers, then checks attack legality at the post-movement distance.

The core design split is strict: `game.js` is the rules authority, while `index.html` and `wireframe-renderer.js` are presentation. This keeps range, stored damage, combo damage, pressure, and hit decisions deterministic for agents and tests, and lets the Pixi renderer exaggerate motion without changing combat outcomes.

The rules surface is intentionally small: HP, stored damage, hit/dodge streaks, range, front-foot position, movement, and one Light plus one Heavy attack per range. There is no line selection; every strike targets the head. Older arcade-fighter concepts such as guard, meter, long-lived resources, throws, supers, lines, and projectiles are not modeled.

The renderer uses a procedural wireframe skeleton rather than image sprites. Poses may move limbs aggressively, but the axial spine and neck chain is always drawn from pelvis through chest and neck to head so animation variants cannot visually detach the torso from the head.

## Fundamental Premises

Muay ThAI is built around a few hard rules. These are not tuning details; future mechanics, UI, and animation work should preserve them unless the game is intentionally redesigned.

1. Rules are deterministic and renderer-independent. `game.js` is the only authority for range, legal hits, misses, stored damage, combo damage, HP, phase flow, and outcome. The Pixi renderer can dramatize events, but it cannot decide combat truth.

2. The core readable loop is movement first, range second, RPS third. Every attack resolves movement before strike checks. The final front-foot gap determines range, then Light/Movement/Heavy interaction determines whether attacks land or store damage.

3. The game has exactly three persistent ranges. Gap 0 is Clinch, where front feet and lead hands overlap. Gap 1 is Pocket, where fighters are toe-to-toe. Gap 2 is capped Distance, a single repeated step beyond Pocket. Distance cannot drift farther apart in state.

4. Each range has one Light and one Heavy head attack. Distance is Teep/Flying Knee, Pocket is Jab/Cross, and Clinch is Elbow/Knee. No line selection exists; all strikes are head-line strikes for now.

5. The RPS triangle is the strategic source of fun. Light catches Movement in range and stores +1 damage. Movement dodges Heavy and stores +2 damage. Heavy stuffs Light and stores +1 damage. Advance into Retreat stores +1 pressure damage so retreat cannot be spammed for free.

6. Stored damage is short-term setup, not a long-lived meter. It is earned after the current action resolves, spends all at once on the next landed hit, carries through one following exchange, and expires if still unspent after that exchange.

7. Combo damage is immediate. Consecutive landed hits add visible, same-turn burst damage. Dodge streaks build stored damage for a future counter, not retroactive damage.

8. Front feet are the spatial source of truth. The number line models front-foot positions and range. Animation may briefly lift, step, hop, or jump, but it must return to the authoritative foot position unless the resolved game state moved that foot.

9. Fighters must not slide through contact. If a limb can reach the opponent's face, the strike launches from planted feet. If a technique needs body travel, it uses a small technique-specific step or jump and never crosses the opponent's center line.

10. Successful strikes must visibly contact the opponent's face. A spectator should be able to understand the result by watching the body mechanics: landed strikes touch the head, misses visibly pass short, pass over, or happen at the wrong range.

11. Body animation is procedural and constrained. Poses layer on top of the shared setup pose, blend back to neutral, and pass through limb constraints before drawing. Strike legs use explicit two-bone IK and pole targets so knees cannot invert or fold through the body.

12. Visual clarity beats feature breadth. There are no legacy torso blocks, fingers, target crosses, side swaps, pivots behind opponents, long-lived Read, lines, guards, throws, supers, projectiles, or hidden matchup rules. New features must earn their complexity by making kickboxing reads more obvious to watch.

## Components

`game.js` defines the `GameLogic` contract, move catalog, range legality, simultaneous attack resolution, carried stored damage, combo damage, front-foot positions, and projection data. `MOVES[*].range` and `MOVES[*].commitment` are the shared contracts for strike distance and Light/Heavy behavior. `resolveAttack` applies movement first, updates feet, derives range, then resolves Light-vs-movement, movement-vs-Heavy, Heavy-vs-Light, and same-commitment trades.

The front-foot gap is capped at 2 for Distance: gap 0 is Clinch, gap 1 is Pocket, and gap 2 is Distance. The visual number step is the clinch-to-pocket spacing: gap 0 overlaps front feet and lead hands, gap 1 is toe-to-toe, and gap 2 repeats that distance once more. A retreat at capped Distance does not permanently move the foot number unless the opponent advances with it; it is presented as a hop-step out and recovery back to the same number.

`index.html` builds the Pixi UI, action queue controls, scrolling number line, combat effects, floating bonus text, and animation timing. It consumes projected state and last-exchange events from the platform but does not decide whether attacks hit.

`wireframe-renderer.js` draws the procedural fighter rig. The shared body model defines the setup pose, anchor joints, limb lengths, and strike-leg IK constraints; action poses layer on top of that setup pose and blend back to neutral before the action ends. Draw helpers render limbs, spine, neck, head, hands, feet, and impact effects.

`scenarios.json` contains deterministic regression coverage for Light/Heavy balance, movement-first attack legality, stored damage spend/expiry, combo rewards, pressure, and number-line range carry.

`manifest.json` exposes the game metadata, rules text, Pixi dependency, and extra renderer file to the platform loader.
