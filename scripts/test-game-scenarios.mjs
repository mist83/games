#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { loadGameLogic } from "./lib/load-game-logic.mjs";
import { GameEngine, outcomeWinners } from "./lib/playgent-core.mjs";

const gameDir = process.argv[2];
const args = process.argv.slice(3);

function arg(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

function usage() {
  console.error(
    "Usage: node scripts/test-game-scenarios.mjs <game-directory> [--file scenarios.json] [--trace]",
  );
}

if (!gameDir) {
  usage();
  process.exit(1);
}

const absDir = path.resolve(gameDir);
const manifestPath = path.join(absDir, "manifest.json");
if (!existsSync(manifestPath)) {
  console.error(`Missing manifest.json in ${absDir}`);
  process.exit(1);
}

const scenarioPath = path.resolve(absDir, arg("file", "scenarios.json"));
if (!existsSync(scenarioPath)) {
  console.log(
    `No scenarios found for ${path.basename(absDir)} (${path.relative(process.cwd(), scenarioPath)}).`,
  );
  process.exit(0);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const GameLogic = loadGameLogic(absDir);
const rawScenarios = JSON.parse(readFileSync(scenarioPath, "utf8"));
const scenarios = Array.isArray(rawScenarios)
  ? rawScenarios
  : rawScenarios.scenarios || [];

function makePlayers(countOrPlayers) {
  if (Array.isArray(countOrPlayers)) {
    return countOrPlayers.map((entry, i) => {
      if (typeof entry === "string") return { id: entry, name: entry };
      return {
        id: entry.id || `player-${i}`,
        name: entry.name || entry.id || `Bot${i + 1}`,
      };
    });
  }
  const count = countOrPlayers || manifest.minPlayers;
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i}`,
    name: `Bot${i + 1}`,
  }));
}

function json(value) {
  return JSON.stringify(value);
}

function getPath(root, dottedPath) {
  if (!dottedPath) return root;
  const parts = dottedPath.split(".");
  let cur = root;
  for (const part of parts) {
    if (cur == null) return undefined;
    const match = part.match(/^(.+)\[(\d+)\]$/);
    if (match) {
      cur = cur[match[1]];
      cur = cur ? cur[Number.parseInt(match[2], 10)] : undefined;
    } else {
      cur = cur[part];
    }
  }
  return cur;
}

function normalizeActionEntry(entry) {
  if (Array.isArray(entry)) {
    return { actorId: entry[0], decision: entry[1] };
  }
  return {
    actorId: entry.actorId || entry.playerId,
    decision: entry.decision || entry.action,
  };
}

function compareExpected(actual, expected) {
  if (json(actual) === json(expected)) return null;
  return `expected ${json(expected)}, got ${json(actual)}`;
}

function checkExpectations(engine, scenario) {
  const failures = [];
  const expect = scenario.expect || {};
  const state = engine.getState();
  const outcome = engine.getResult();

  if (expect.phase !== undefined) {
    const mismatch = compareExpected(state.phase, expect.phase);
    if (mismatch) failures.push(`EXPECT: phase ${mismatch}`);
  }
  if (expect.outcomeType !== undefined) {
    const actualType = outcome ? outcome.type : null;
    const mismatch = compareExpected(actualType, expect.outcomeType);
    if (mismatch) failures.push(`EXPECT: outcomeType ${mismatch}`);
  }
  if (expect.winners !== undefined || expect.playerIds !== undefined) {
    const expectedWinners = expect.winners || expect.playerIds;
    const mismatch = compareExpected(outcomeWinners(outcome), expectedWinners);
    if (mismatch) failures.push(`EXPECT: winners ${mismatch}`);
  }
  for (const [statePath, expected] of Object.entries(expect.state || {})) {
    const actual = getPath(state, statePath);
    const mismatch = compareExpected(actual, expected);
    if (mismatch) failures.push(`EXPECT: state.${statePath} ${mismatch}`);
  }
  for (const projectionCheck of expect.projections || []) {
    const playerId =
      projectionCheck.playerId === undefined ? null : projectionCheck.playerId;
    const projection = engine.getProjection(playerId);
    for (const [projectionPath, expected] of Object.entries(
      projectionCheck.equals || {},
    )) {
      const actual = getPath(projection, projectionPath);
      const mismatch = compareExpected(actual, expected);
      if (mismatch)
        failures.push(
          `EXPECT: project(${playerId}).${projectionPath} ${mismatch}`,
        );
    }
    for (const projectionPath of projectionCheck.absent || []) {
      const actual = getPath(projection, projectionPath);
      if (actual !== undefined)
        failures.push(
          `EXPECT: project(${playerId}).${projectionPath} should be absent`,
        );
    }
  }
  return failures;
}

function runScenario(scenario, index) {
  const players = makePlayers(
    scenario.players || scenario.playerCount || manifest.minPlayers,
  );
  const seed = scenario.seed || 42;
  const engine = new GameEngine(
    GameLogic,
    players,
    scenario.config || {},
    seed,
    scenario.teamAssignments,
  );
  const failures = [];
  const log = [];

  for (let i = 0; i < (scenario.actions || []).length; i++) {
    const entry = normalizeActionEntry(scenario.actions[i]);
    if (!entry.actorId || !entry.decision) {
      failures.push(
        `ACTION ${i + 1}: scenario action must include actorId/playerId and decision/action`,
      );
      break;
    }
    const before = json(engine.getState());
    engine.processAction(entry.actorId, entry.decision);
    const after = json(engine.getState());
    log.push(entry);
    if (scenario.requireChange !== false && before === after) {
      failures.push(
        `ACTION ${i + 1}: ${entry.actorId} ${json(entry.decision)} did not change state`,
      );
      break;
    }
  }

  failures.push(...checkExpectations(engine, scenario));

  const name = scenario.name || `scenario ${index + 1}`;
  const passed = failures.length === 0;
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
  if (!passed) {
    for (const failure of failures) console.log(`  - ${failure}`);
    console.log(
      `  Replay: node scripts/test-game-scenarios.mjs ${gameDir} --file ${path.relative(absDir, scenarioPath)} --trace`,
    );
    if (hasFlag("trace")) {
      for (const entry of log)
        console.log(`  ${entry.actorId}: ${json(entry.decision)}`);
    }
  }
  return passed;
}

console.log(`Testing scenarios for ${manifest.name} (${manifest.slug})`);
if (scenarios.length === 0) {
  console.log(
    `No scenarios declared in ${path.relative(process.cwd(), scenarioPath)}.`,
  );
  process.exit(0);
}

let allPassed = true;
for (let i = 0; i < scenarios.length; i++) {
  if (!runScenario(scenarios[i], i)) allPassed = false;
}
process.exit(allPassed ? 0 : 1);
