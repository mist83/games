import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadGameLogic } from "./lib/load-game-logic.mjs";
import { GameEngine, unwrapDecisionOption } from "./lib/playgent-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gameDir = path.resolve(__dirname, "../sketchcode");
const GameLogic = loadGameLogic(gameDir);
const players = [
  { id: "p1", name: "Player 1" },
  { id: "p2", name: "Player 2" },
];
const humanPrimitiveTypes = [
  "draw_parts",
  "draw_line",
  "draw_curve",
  "draw_oval",
  "draw_rect",
  "draw_poly",
  "draw_dot",
  "draw_stroke_pair",
];
const humanBrowserTypes = ["draw_stroke"];
const redLayer = {
  type: "draw_svg_layer",
  svg: '<ellipse cx="50" cy="50" rx="22" ry="16" fill="red" stroke="darkred" stroke-width="2"/>',
};
const greenLayer = {
  type: "draw_svg_layer",
  svg: '<rect x="45" y="20" width="10" height="22" fill="green" stroke="darkgreen" stroke-width="2"/>',
};
const blackLayer = {
  type: "draw_svg_layer",
  svg: '<circle cx="50" cy="50" r="8" fill="black"/>',
};

function freshEngine() {
  return new GameEngine(GameLogic, players, {}, 12345);
}

function drawerId(engine) {
  const state = engine.getState();
  return state.players[state.drawerIndex];
}

function actionTypes(engine) {
  return engine
    .getActions(drawerId(engine))
    .map((option) => unwrapDecisionOption(option).type);
}

function opportunityActions(engine, actorId, context) {
  return GameLogic.opportunities(engine.getState(), actorId, context).flatMap(
    (opportunity) =>
      opportunity.decision.type === "choose"
        ? opportunity.decision.options
        : [],
  );
}

function opportunityDecisions(engine, actorId, context) {
  return opportunityActions(engine, actorId, context).map((option) =>
    unwrapDecisionOption(option),
  );
}

function chatConfigs(engine, actorId, context) {
  return GameLogic.opportunities(engine.getState(), actorId, context)
    .filter((opportunity) => opportunity.chat)
    .map((opportunity) => opportunity.chat);
}

{
  const engine = freshEngine();
  const types = actionTypes(engine);
  assert(
    types.includes("draw_stroke"),
    "socket/browser drawer controls should expose draw_stroke by default",
  );
  for (const type of humanPrimitiveTypes)
    assert(
      !types.includes(type),
      `socket/browser drawer controls should not expose ${type}`,
    );
  assert(
    !types.includes("draw_svg_layer"),
    "socket/browser drawer controls should not expose draw_svg_layer",
  );
  const agentView = engine.getProjection(drawerId(engine)).agentView;
  assert(
    agentView.actionTypes.includes("draw_svg_layer"),
    "agentView should expose draw_svg_layer",
  );
  for (const type of humanBrowserTypes.concat(humanPrimitiveTypes))
    assert(
      !agentView.actionTypes.includes(type),
      `agentView should not expose ${type}`,
    );
}

{
  const engine = freshEngine();
  const drawer = drawerId(engine);
  const agentOptions = opportunityActions(engine, drawer, { surface: "agent" });
  const socketOptions = opportunityDecisions(engine, drawer, {
    transport: "socket.io",
  });
  const drawOption = agentOptions.find(
    (option) => unwrapDecisionOption(option).type === "draw_svg_layer",
  );
  assert(
    drawOption,
    "draw_svg_layer should be exposed as an opportunity option",
  );
  assert(
    drawOption.schema,
    "draw_svg_layer should carry an opportunity schema",
  );
  assert.equal(
    drawOption.schema.fields.svg.freeText,
    true,
    "svg field should be free text",
  );
  for (const type of humanPrimitiveTypes) {
    assert(
      !agentOptions.some(
        (option) => unwrapDecisionOption(option).type === type,
      ),
      `${type} should not be exposed as an agent opportunity option`,
    );
  }
  assert(
    !socketOptions.some((option) => option.type === "draw_svg_layer"),
    "draw_svg_layer should not be exposed as a socket/browser option",
  );
  assert(
    socketOptions.some((option) => option.type === "draw_stroke"),
    "socket/browser option should include draw_stroke",
  );
  for (const type of humanPrimitiveTypes)
    assert(
      !socketOptions.some((option) => option.type === type),
      `socket/browser option should not include ${type}`,
    );

  const drawerChats = chatConfigs(engine, drawer, { surface: "agent" });
  assert(
    drawerChats.length > 0,
    "drawer opportunity should still expose spectator chat",
  );
  for (const chat of drawerChats) {
    assert.equal(chat.channels.length, 1);
    assert.equal(
      chat.channels[0],
      "spectator",
      "drawer should only be able to chat in spectator channel",
    );
    assert.equal(chat.defaultChannel, "spectator");
    assert.equal(chat.canSend, true);
    assert(
      chat.memberships.includes("spectator"),
      "spectator chat should declare spectator membership",
    );
  }
  assert.notEqual(
    engine.getProjection(drawer).agent?.tools?.send_message,
    "hidden",
    "drawer send_message should not be globally hidden when spectator chat is legal",
  );
}

{
  const engine = freshEngine();
  const drawer = drawerId(engine);
  const guesser = players.find((player) => player.id !== drawer).id;
  const guessOptions = opportunityActions(engine, guesser, {
    surface: "agent",
  });
  const guessOption = guessOptions.find(
    (option) => unwrapDecisionOption(option).type === "guess",
  );
  assert(guessOption, "guess should be exposed as an opportunity option");
  assert.equal(
    guessOption.label,
    "guess(text=<text>)",
    "guess option should describe its text field",
  );
  assert(guessOption.schema, "guess option should carry an opportunity schema");
  assert.equal(
    guessOption.schema.fields.text.freeText,
    true,
    "guess text should be free text",
  );
  assert.equal(
    guessOption.schema.fields.text.maxLength,
    40,
    "guess text schema should match apply-time truncation",
  );
}

{
  const engine = freshEngine();
  const drawer = drawerId(engine);
  const guesser = players.find((player) => player.id !== drawer).id;
  const firstGuess = { type: "guess", text: "wrong answer" };
  const duplicateGuess = { type: "guess", text: "Wrong-Answer" };
  let state;
  let validation;

  validation = GameLogic.validate(engine.getState(), guesser, firstGuess);
  assert.equal(validation.ok, true, "first guess should validate");
  engine.processAction(guesser, firstGuess);
  state = engine.getState();
  assert.equal(state.guessCounts[guesser], 1);
  assert.equal(state.guessLog.length, 1);

  validation = GameLogic.validate(state, guesser, duplicateGuess);
  assert.equal(
    validation.ok,
    false,
    "duplicate normalized guess should reject",
  );
  assert.equal(validation.code, "DUPLICATE_GUESS");
  assert.match(validation.error, /already guessed/i);
  engine.processAction(guesser, duplicateGuess);
  state = engine.getState();
  assert.equal(
    state.guessCounts[guesser],
    1,
    "duplicate guess should not spend a guess",
  );
  assert.equal(
    state.guessLog.length,
    1,
    "duplicate guess should not add another guess log entry",
  );

  engine.processAction(guesser, { type: "guess", text: "different object" });
  state = engine.getState();
  assert.equal(state.guessCounts[guesser], 2);
  assert.equal(state.guessLog.length, 2);
}

{
  const threePlayers = [
    { id: "p1", name: "Player 1" },
    { id: "p2", name: "Player 2" },
    { id: "p3", name: "Player 3" },
  ];
  const engine = new GameEngine(GameLogic, threePlayers, {}, 42);
  const drawer = drawerId(engine);
  const solvedGuesser = threePlayers.find((player) => player.id !== drawer).id;
  const openGuesser = threePlayers.find(
    (player) => player.id !== drawer && player.id !== solvedGuesser,
  ).id;
  const prompt = engine.getState().prompt;
  const beforeActionCount = engine.getState().actionCount;

  engine.processAction(solvedGuesser, { type: "guess", text: prompt });

  assert.equal(
    engine.getState().phase,
    "draw",
    "one solved REST guesser should not end a three-player draw round",
  );
  assert(
    engine.getState().solved[solvedGuesser],
    "correct guess should mark that guesser solved",
  );
  assert.equal(
    engine.getState().actionCount,
    beforeActionCount + 1,
    "correct guesses should refresh agent-visible action state",
  );
  assert(
    !opportunityDecisions(engine, solvedGuesser, { surface: "agent" }).some(
      (decision) => decision.type === "guess",
    ),
    "solved REST guesser should not keep a guess option",
  );
  assert(
    !engine
      .getProjection(solvedGuesser)
      .agentView.actionTypes.includes("guess"),
    "solved REST guesser actionTypes should drop guess",
  );
  assert.equal(
    engine.getProjection(solvedGuesser).agentView.guessesRemaining,
    0,
    "solved REST guesser should show no remaining guesses",
  );
  assert.equal(
    "guessActions" in engine.getProjection(solvedGuesser).agentView,
    false,
    "solved REST guesser should not receive guess instructions",
  );
  assert(
    opportunityDecisions(engine, openGuesser, { surface: "agent" }).some(
      (decision) => decision.type === "guess",
    ),
    "unsolved guesser should keep the active guess option",
  );
}

{
  const threePlayers = [
    { id: "p1", name: "Player 1" },
    { id: "p2", name: "Player 2" },
    { id: "p3", name: "Player 3" },
  ];
  const engine = new GameEngine(GameLogic, threePlayers, {}, 42);
  const firstDrawer = drawerId(engine);
  const guesser = threePlayers.find((player) => player.id !== firstDrawer).id;
  const guess = { type: "guess", text: "wrong answer" };

  engine.processAction(guesser, guess);
  assert.equal(
    GameLogic.validate(engine.getState(), guesser, guess).code,
    "DUPLICATE_GUESS",
  );
  engine.processAction("__system__", engine.getTurnConfig(null).onExpire);
  engine.processAction("__system__", engine.getTurnConfig(null).onExpire);
  assert.notEqual(
    drawerId(engine),
    guesser,
    "selected player should be a guesser again in the later drawing round",
  );
  assert.equal(
    GameLogic.validate(engine.getState(), guesser, guess).ok,
    true,
    "same guess should be allowed again in a new drawing round",
  );
}

{
  const engine = freshEngine();
  const drawer = drawerId(engine);
  engine.processAction(drawer, {
    type: "draw_stroke",
    points: "10,10 30,20 60,50 80,80",
    stroke: "black",
    width: 4,
  });
  engine.processAction(drawer, {
    type: "draw_stroke",
    points: "15,80 35,60 55,62 85,30",
    stroke: "red",
    width: 4,
  });
  const state = engine.getState();
  assert.equal(state.drawEvents.length, 2, "freehand strokes should append");
  assert.equal(state.drawEvents[0].type, "stroke");
  assert.equal(state.drawEvents[1].type, "stroke");
  assert.equal(state.drawEvents[0].color, "black");
  assert.equal(state.drawEvents[1].color, "red");
}

{
  const engine = freshEngine();
  const drawer = drawerId(engine);
  engine.processAction(drawer, redLayer);
  let state = engine.getState();
  assert.equal(state.drawEvents.length, 1, "valid SVG should add one layer");
  assert.equal(state.drawEvents[0].type, "svg_layer");
  assert.match(state.drawEvents[0].svg, /fill="red"/);
  assert.match(state.drawEvents[0].summary, /SVG layer/);

  engine.processAction(drawer, greenLayer);
  state = engine.getState();
  assert.equal(
    state.drawEvents.length,
    2,
    "second valid SVG should append a layer",
  );
  assert.match(
    state.drawEvents[0].svg,
    /fill="red"/,
    "first layer should stay below",
  );
  assert.match(
    state.drawEvents[1].svg,
    /fill="green"/,
    "second layer should be latest/top layer",
  );
  assert.equal(
    engine.getView(drawer).svgLayers.length,
    2,
    "projection should include SVG layers",
  );

  engine.processAction(drawer, {
    type: "draw_svg_layer",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="8" fill="blue"/></svg>',
  });
  state = engine.getState();
  assert.equal(
    state.drawEvents.length,
    3,
    "safe outer svg wrapper should be stripped and accepted",
  );
  assert.match(state.drawEvents[2].svg, /fill="blue"/);
}

{
  const engine = freshEngine();
  const drawer = drawerId(engine);
  engine.processAction(drawer, redLayer);
  engine.processAction(drawer, greenLayer);
  const beforeUndo = engine.getState();
  assert.equal(
    beforeUndo.drawEvents.length,
    2,
    "two layers should be present before undo",
  );
  engine.processAction(drawer, { type: "undo_draw" });
  const state = engine.getState();
  assert.equal(
    state.drawEvents.length,
    1,
    "undo_draw should remove only the latest SVG layer",
  );
  assert.match(state.drawEvents[0].svg, /fill="red"/);
  assert.equal(
    state.actionCount,
    beforeUndo.actionCount + 1,
    "undo_draw should still count as an internal revision action",
  );
}

{
  const engine = freshEngine();
  const drawer = drawerId(engine);
  engine.processAction(drawer, blackLayer);
  assert.equal(
    engine.getState().drawEvents.length,
    1,
    "black-only details should still be accepted",
  );
}

{
  const engine = freshEngine();
  const drawer = drawerId(engine);
  engine.processAction(drawer, redLayer);
  const beforeCount = engine.getState().drawEvents.length;
  const badLayers = [
    '<text x="10" y="10">apple</text>',
    "<script>alert(1)</script>",
    '<rect x="10" y="10" width="20" height="20" fill="red" onclick="alert(1)"/>',
    '<image href="https://example.com/apple.png"/>',
    "<foreignObject><div>apple</div></foreignObject>",
    '<rect x="10" y="10" width="20" height="20" fill="none" stroke="none"/>',
    '<circle cx="50" cy="50" r="8" fill="red" opacity="0"/>',
    '<line x1="10" y1="10" x2="80" y2="80"/>',
  ];
  for (const svg of badLayers) {
    engine.processAction(drawer, { type: "draw_svg_layer", svg });
    assert.equal(
      engine.getState().drawEvents.length,
      beforeCount,
      `unsafe SVG should be rejected: ${svg}`,
    );
    assert.match(
      engine.getState().lastDrawError,
      /unsafe|not allowed|references|event handlers|visible shape/i,
    );
  }
}

{
  const engine = freshEngine();
  const drawer = drawerId(engine);
  const guesser = players.find((player) => player.id !== drawer).id;
  const prompt = engine.getState().prompt;
  assert.equal(
    engine.getView(drawer).secretPrompt,
    prompt,
    "drawer should see the current round prompt",
  );
  engine.processAction(drawer, redLayer);
  assert.equal(
    engine.getState().prompt,
    prompt,
    "drawing a layer should not change the prompt",
  );
  engine.processAction(guesser, { type: "guess", text: "wrong answer" });
  assert.equal(
    engine.getState().prompt,
    prompt,
    "wrong guesses should not change the prompt",
  );
  assert.equal(
    engine.getView(drawer).secretPrompt,
    prompt,
    "drawer refresh/projection should keep showing the same prompt mid-round",
  );

  assert.equal(engine.getState().phase, "draw");
  assert.equal(
    engine.getActions(guesser).length,
    1,
    "guesser should still have an active guess action",
  );
  assert(
    !("timeoutMs" in engine.getProjection(drawer)),
    "drawer projection should not own the draw-phase timeout",
  );
  assert(
    !("timeoutMs" in engine.getProjection(guesser)),
    "guesser projection should not own the draw-phase timeout",
  );
  assert(
    !("phaseTimeoutMs" in engine.getView(drawer)),
    "drawer view should not own the draw-phase timeout",
  );

  const systemConfig = engine.getTurnConfig(null);
  assert.equal(
    systemConfig.timeoutMs,
    240000,
    "system opportunity should own the draw-phase timeout",
  );
  assert.equal(systemConfig.onExpire.type, "advance_phase");
  assert.equal(systemConfig.onExpire.timerId, "draw");
  assert.equal(systemConfig.onExpire.phase, "draw");
  assert.equal(systemConfig.onExpire.roundIndex, 0);
  engine.processAction("__system__", systemConfig.onExpire);
  assert.equal(
    engine.getState().roundIndex,
    1,
    "system draw timeout should advance to the next drawer",
  );
  assert.equal(engine.getState().phase, "draw");
  const promptAfterAdvance = engine.getState().prompt;
  engine.processAction("__system__", systemConfig.onExpire);
  assert.equal(
    engine.getState().roundIndex,
    1,
    "stale duplicate draw timeout should not advance a later round",
  );
  assert.equal(
    engine.getState().prompt,
    promptAfterAdvance,
    "stale duplicate draw timeout should not change the active prompt",
  );
}

{
  const threePlayers = [
    { id: "p1", name: "Player 1" },
    { id: "p2", name: "Player 2" },
    { id: "p3", name: "Player 3" },
  ];
  const engine = new GameEngine(GameLogic, threePlayers, {}, 42);
  const drawer = drawerId(engine);
  const guessers = threePlayers.filter((player) => player.id !== drawer);
  const prompt = engine.getState().prompt;
  engine.processAction(guessers[0].id, { type: "guess", text: prompt });
  assert.equal(
    engine.getState().phase,
    "draw",
    "one correct guess should not end a round while another guesser is unsolved",
  );
  engine.processAction("__system__", engine.getTurnConfig(null).onExpire);
  assert.equal(
    engine.getState().phase,
    "draw",
    "draw timeout with unsolved guessers should start the next draw round",
  );
  assert.equal(engine.getState().roundIndex, 1);
  assert.notEqual(
    drawerId(engine),
    drawer,
    "draw timeout with unsolved guessers should move to the next drawer",
  );
}

console.log("Sketchcode SVG layer drawing tests passed.");
