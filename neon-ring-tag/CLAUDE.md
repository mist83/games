# games/neon-ring-tag

Two-player simultaneous three-action Muay Thai game using PixiJS and a procedural wireframe fighter renderer.

## Shape

- **Players:** 2.
- **Rendering:** PixiJS plus `wireframe-renderer.js`.
- **Files:** `manifest.json`, `game.js`, `index.html`, `thumbnail.svg`, `wireframe-renderer.js`, `scenarios.json`.
- **Core loop:** movement first, post-movement range second, Light/Movement/Heavy interaction third.

## Animation Guidance

- Keep combat truth in `game.js` and animation truth in the renderer. The renderer may overlap actions, exaggerate contact, or add recovery, but it should only dramatize resolved events from projection.
- Use stable anchors. Front-foot numbers are the spatial source of truth, and overhead combat text is anchored to nameplate positions rather than animated heads or roots. Motion can travel during a strike, but it should settle back to the resolved foot state.
- Treat `actionTimeline()` as presentation timing, not rules timing. Rules resolve movement first, but movement-caused whiffs read better when the attack and evasive movement animate at the same time.
- Build each technique from a shared stance plus explicit phases: load, chamber, drive, contact, and recovery. Shared helpers are good for math, blending, constraints, and drawing; the actual pose blocks should stay direct enough that a designer can tune body mechanics by reading the numbers.
- Make strikes show their real mechanics. A cross needs a small front-foot step, dropped center of gravity, hip and torso drive, rear hand contact, and a retraction back to stance. A teep needs knee chamber first, hip thrust second, and only partial target blending so the leg does not collapse. A knee from clinch needs its target blend faded during recovery so the leg settles smoothly.
- Do not swap limb layers during a strike. Far limbs stay in far containers and near limbs stay in near containers; if depth needs emphasis, adjust fighter-level ordering instead. Sudden limb z-index changes look like body parts popping through the model.
- Keep the skeleton visually consistent. Wireframe path strokes use round caps and joins, and hands, feet, hips, torso, spine, and neck should share the same rounded language.
- Damage, miss, dodge, and stored-damage text should behave like HUD feedback, not debris. It should hold long enough to read, drift only a little, and stay near the relevant fighter's stable overhead plate.
- Visual QA should target specific exchanges. Force deterministic cross, teep, knee, movement-whiff, hit, miss, and dodge cases, then scrub local animation progress around chamber, contact, and recovery instead of judging only from live play speed.
- Abstract helpers around repeated invariants, not around martial-arts intent. If a helper hides whether a limb is chambering, driving, or recovering, it will make future animation fixes slower and less realistic.

## Testing

Run from the repo root:

```bash
node scripts/test-game.mjs ./neon-ring-tag --all --seeds 42,1337
```
