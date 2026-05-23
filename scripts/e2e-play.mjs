#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadGameLogic } from "./lib/load-game-logic.mjs";
import {
  createSeededRandom,
  GameEngine,
  unwrapDecisionOption,
} from "./lib/playgent-core.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const ROOT_PROMPT_TEMPLATE_PATH = path.join(
  scriptDir,
  "e2e-play-root-prompt.md",
);
const rawArgs = process.argv.slice(2);
const gameDirArg = rawArgs[0];
const args = rawArgs.slice(1);

const MODES = new Set(["smoke", "full", "weird", "viewport", "diagnostic"]);
const ADAPTERS = new Set(["codex", "claude", "both"]);
const REQUIRED_PAYLOAD_FILES = [
  "manifest.json",
  "game.js",
  "index.html",
  "thumbnail.svg",
];
const URGENT_REST_DEADLINE_MS = 15_000;
const CRITICAL_REST_DEADLINE_MS = 5_000;

function usage() {
  console.error(
    [
      "Usage: node scripts/e2e-play.mjs <game-directory> [options]",
      "",
      "Options:",
      "  --base URL              Host base URL (default: http://localhost:3000)",
      "  --prod                  Shortcut for --base https://clankerfights.ai",
      "  --game-id ID            Existing platform game id/slug (default: manifest.slug)",
      "  --upload                Upload this local payload before play",
      "  --mode MODE             smoke|full|weird|viewport|diagnostic (default: smoke)",
      "  --players N             Requested player count (default: manifest.minPlayers)",
      "  --runs N                Independent live playthroughs in the root prompt (default: 3)",
      "  --adapter NAME          codex|claude|both (default: both)",
      "  --out-dir DIR           Artifact root (default: e2e-runs)",
      "  --no-preflight          Skip scripts/test-game.mjs --all",
      "  --allow-preflight-fail  Still write prompts if preflight fails",
      "  --seeds LIST            Preflight seeds (default: 42,1337)",
      "  --max-actions N         Gameplay action budget (default: 300)",
      "  --max-minutes N         Wall-clock budget (default: 20)",
      "  --poll-timeout-ms N     REST poll timeout (default: 5000)",
      "  --headed                Mark browser prompt for headed Chrome",
      "  --require-host          Fail unless --base responds to HTTP GET",
      "  --print-root-prompt     Print the selected root prompt path at the end",
    ].join("\n"),
  );
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

function arg(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseInteger(name, fallback) {
  const raw = arg(name, String(fallback));
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value)) fail(`Expected --${name} to be an integer`);
  return value;
}

function parsePositiveInteger(name, fallback) {
  const value = parseInteger(name, fallback);
  if (value < 1) fail(`Expected --${name} to be at least 1`);
  return value;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (err) {
    throw new Error(
      `Could not parse ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function liveRunExpectation({ topology, mode, playthroughCount }) {
  return {
    summary: `Auto-QA live play should run ${playthroughCount} independent playthrough${playthroughCount === 1 ? "" : "s"}, create real rooms, keep isolated REST and browser workers alive, drive each game to a terminal or clearly stable state, and report expectation, QA test cases, and observed result.`,
    gates: {
      playthroughs: `Exactly ${playthroughCount} independent room playthrough${playthroughCount === 1 ? "" : "s"} must be attempted. Each playthrough has its own room code, worker artifacts, action counts, result, and pass/fail gate summary.`,
      room: "A room is created on the target host with every named worker connected as a non-spectator before start.",
      workerLifecycle:
        "UI/browser workers stay alive with their browser context open from join through game over or failure; a lobby-only browser final is not a valid join gate.",
      rest: "When a REST worker receives legal opportunities, at least one successful REST /action is submitted before that worker's turn deadline expires.",
      browser:
        "When UI-1 receives legal UI opportunities, at least one real browser gesture is used; no REST /action or playgent.submitAction bypass is used by UI-1.",
      adversarial:
        "Workers play like curious QA testers, not happy-path bots: they intentionally try odd-but-legal decisions, boundary inputs, harmless UI probes, resize/keyboard/double-click behavior, and recovery paths when those are visible and safe. Probes must stay bounded, non-abusive, and must not consume urgent turn deadlines.",
      qaTests:
        "Workers write down the test cases they invent while playing, then attempt the safe ones and record expected result, observed result, pass/fail, and evidence. The final report aggregates those test cases per playthrough.",
      progress:
        mode === "smoke"
          ? "The room makes visible progress and should reach game over for short deterministic games."
          : "The room makes visible progress across phases and stops only on pass, hard failure, timeout, or a documented stable non-terminal state.",
      weird:
        mode === "weird"
          ? "Weird probes are required in addition to normal adversarial QA, are bounded, recover to legal progress, and never intentionally consume an urgent turn deadline."
          : "No extra weird-mode probes are required beyond normal adversarial QA.",
      isolation:
        "No worker receives another worker's private poll, token, cursor, hidden state, or reasoning.",
    },
    report:
      "reports/summary.md must include Expectation, QA Test Cases, and Result sections; reports/test-cases.json must aggregate worker test ledgers; reports/failures.json must contain fix-oriented failure codes when any gate fails.",
  };
}

function renderExpectationLines(expectation) {
  const lines = [];
  lines.push("Expected Auto-QA outcome:");
  lines.push("");
  lines.push(`- Overall: ${expectation.summary}`);
  for (const [gate, description] of Object.entries(expectation.gates)) {
    lines.push(`- ${gate}: ${description}`);
  }
  lines.push(`- report: ${expectation.report}`);
  return lines;
}

function renderPlaythroughPlan(playthroughCount) {
  const lines = [];
  for (let index = 1; index <= playthroughCount; index++) {
    const label = String(index).padStart(2, "0");
    lines.push(
      `- Playthrough ${label}: create a fresh room and fresh worker artifact subfolders; vary at least one REST strategy choice or browser probe from prior playthroughs when legal state allows it, and record each attempted or skipped QA test case with evidence.`,
    );
  }
  return lines.join("\n");
}

function ensureInside(parentDir, childPath) {
  const resolved = path.resolve(parentDir, childPath);
  const relative = path.relative(parentDir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes game directory: ${childPath}`);
  }
  return resolved;
}

function relFromRepo(absPath) {
  const relative = path.relative(repoRoot, absPath);
  return relative && !relative.startsWith("..") ? relative : absPath;
}

function normalizeBaseUrl(base) {
  try {
    const url = new URL(base);
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    fail(`Invalid --base URL: ${base}`);
  }
}

function safeReadText(filePath) {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function truncate(text, maxLength = 500) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function safeJson(value, maxLength = 500) {
  try {
    return truncate(JSON.stringify(value), maxLength);
  } catch {
    return "[unserializable]";
  }
}

function renderTemplate(template, values) {
  const rendered = template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) => {
    if (!(key in values)) {
      throw new Error(`Missing template value for ${match}`);
    }
    return values[key];
  });
  const leftover = rendered.match(/\{\{[A-Z0-9_]+\}\}/);
  if (leftover)
    throw new Error(`Unresolved template placeholder: ${leftover[0]}`);
  return rendered.endsWith("\n") ? rendered : `${rendered}\n`;
}

function sanitizeGeneratedPlayerText(text) {
  return String(text)
    .replace(/\bREST-\d+\b/g, "<rest-player>")
    .replace(/\bUI-1\b/g, "<browser-player>")
    .replace(/\bplayer-\d+\b/g, "<player-id>");
}

function sanitizeGeneratedPlayerValue(value) {
  if (typeof value === "string") return sanitizeGeneratedPlayerText(value);
  if (Array.isArray(value))
    return value.map((item) => sanitizeGeneratedPlayerValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        sanitizeGeneratedPlayerValue(entry),
      ]),
    );
  }
  return value;
}

function listDeclaredFiles(manifest) {
  if (!Array.isArray(manifest.files)) return [];
  return manifest.files
    .filter((entry) => typeof entry === "string" && entry.trim())
    .map((entry) => entry.trim());
}

function collectPayload(absDir, manifest) {
  const files = [];
  const missing = [];
  const seen = new Set();
  const declared = [
    ...REQUIRED_PAYLOAD_FILES,
    ...listDeclaredFiles(manifest),
    ...(manifest.thumbnail &&
    !REQUIRED_PAYLOAD_FILES.includes(manifest.thumbnail)
      ? [manifest.thumbnail]
      : []),
    existsSync(path.join(absDir, "e2e-play.json")) ? "e2e-play.json" : null,
  ].filter(Boolean);

  for (const relativePath of declared) {
    if (seen.has(relativePath)) continue;
    seen.add(relativePath);
    const absolutePath = ensureInside(absDir, relativePath);
    if (!existsSync(absolutePath)) {
      missing.push(relativePath);
      continue;
    }
    const stat = statSync(absolutePath);
    if (!stat.isFile()) {
      missing.push(relativePath);
      continue;
    }
    files.push({
      relativePath,
      absolutePath,
      bytes: stat.size,
    });
  }

  return { files, missing };
}

function readRepoGuidance() {
  const names = ["AGENTS.md", "CLAUDE.md", "LESSONS.md", "SOUND_GUIDE.md"];
  return names.map((name) => {
    const absolutePath = path.join(repoRoot, name);
    return {
      name,
      path: absolutePath,
      present: existsSync(absolutePath),
      bytes: existsSync(absolutePath) ? statSync(absolutePath).size : 0,
    };
  });
}

function detectBrowserHooks(indexHtml, hints) {
  function count(pattern) {
    const matches = indexHtml.match(pattern);
    return matches ? matches.length : 0;
  }

  return {
    hasPlaygentE2E: indexHtml.includes("__playgentE2E"),
    hasPlaygentCheckLayout: indexHtml.includes("__playgentCheckLayout"),
    hasDataActionIdx: indexHtml.includes("data-action-idx"),
    hasDataCell: indexHtml.includes("data-cell"),
    hasDataCard: indexHtml.includes("data-card"),
    buttonMentions: count(/<button\b/gi),
    roleButtonMentions: count(/role=["']button["']/gi),
    inputMentions: count(/<input\b/gi),
    selectMentions: count(/<select\b/gi),
    canvasMentions: count(/<canvas\b|createElement\(["']canvas["']\)/gi),
    hints: hints?.browserHints ?? null,
  };
}

function makePlayers(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `player-${index}`,
    name: index === 0 ? "REST-1" : index === 1 ? "UI-1" : `REST-${index}`,
  }));
}

function summarizeSchema(schema) {
  if (!schema || typeof schema !== "object") return null;
  const summary = {};
  if (schema.type) summary.type = schema.type;
  if (schema.required) summary.required = schema.required;
  if (schema.properties && typeof schema.properties === "object") {
    summary.properties = Object.fromEntries(
      Object.entries(schema.properties)
        .slice(0, 8)
        .map(([key, value]) => [
          key,
          {
            type: value?.type ?? typeof value,
            enum: Array.isArray(value?.enum)
              ? sanitizeGeneratedPlayerValue(value.enum.slice(0, 8))
              : undefined,
            minimum: value?.minimum,
            maximum: value?.maximum,
            minLength: value?.minLength,
            maxLength: value?.maxLength,
          },
        ]),
    );
  }
  return summary;
}

function summarizeDecisionShape(value, key = "") {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return value.length > 0 ? [summarizeDecisionShape(value[0])] : [];
  }
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .slice(0, 10)
      .map(([entryKey, entryValue]) => [
        entryKey,
        summarizeDecisionShape(entryValue, entryKey),
      ]);
    return Object.fromEntries(entries);
  }
  if (key === "type" && typeof value === "string") return value;
  if (typeof value === "string") return sanitizeGeneratedPlayerText(value);
  return `<${typeof value}>`;
}

function decisionType(decision) {
  if (decision == null) return String(decision);
  if (typeof decision !== "object") return typeof decision;
  if (typeof decision.type === "string") return decision.type;
  if (typeof decision.action === "string") return decision.action;
  const keys = Object.keys(decision).slice(0, 3);
  return keys.length > 0 ? keys.join(",") : "object";
}

function summarizeDecisionOption(option) {
  const metadata =
    option && typeof option === "object" && "decision" in option ? option : {};
  const decision = unwrapDecisionOption(option);
  return {
    label:
      typeof metadata.label === "string"
        ? sanitizeGeneratedPlayerText(metadata.label)
        : typeof decision === "string"
          ? sanitizeGeneratedPlayerText(decision)
          : null,
    type: decisionType(decision),
    decision: safeJson(summarizeDecisionShape(decision), 260),
    required: metadata.required === true,
    schema: summarizeSchema(metadata.schema),
  };
}

function summarizeGameLogic(absDir, manifest, playerCount) {
  const result = {
    phases: [],
    actionSamples: [],
    warnings: [],
  };

  let GameLogic;
  try {
    GameLogic = loadGameLogic(absDir);
    GameLogic.manifest = manifest;
  } catch (err) {
    result.warnings.push(
      `Could not load game logic: ${err instanceof Error ? err.message : String(err)}`,
    );
    return result;
  }

  let engine;
  try {
    engine = new GameEngine(GameLogic, makePlayers(playerCount), {}, 42);
  } catch (err) {
    result.warnings.push(
      `Could not initialize game engine: ${err instanceof Error ? err.message : String(err)}`,
    );
    return result;
  }

  const rng = createSeededRandom(42);
  const phaseSet = new Set();
  const sampleKeys = new Set();

  function recordPhase() {
    const state = engine.getState();
    if (state && typeof state === "object" && typeof state.phase === "string") {
      phaseSet.add(state.phase);
    }
  }

  function recordActions() {
    for (const player of makePlayers(playerCount)) {
      let actions;
      try {
        actions = engine.getActions(player.id);
      } catch (err) {
        result.warnings.push(
          `Could not read actions for ${player.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
        continue;
      }
      for (const option of actions.slice(0, 8)) {
        const summary = summarizeDecisionOption(option);
        const key = `${summary.type}:${summary.label ?? ""}:${summary.decision}`;
        if (sampleKeys.has(key)) continue;
        sampleKeys.add(key);
        result.actionSamples.push(summary);
        if (result.actionSamples.length >= 32) return;
      }
    }
  }

  recordPhase();
  recordActions();

  for (let tick = 0; tick < 40 && result.actionSamples.length < 32; tick++) {
    if (engine.getResult() !== null) break;
    const actionable = [];
    for (const player of makePlayers(playerCount)) {
      const actions = engine.getActions(player.id);
      if (actions.length > 0) actionable.push({ player, actions });
    }
    if (actionable.length === 0) {
      const sysConfig = engine.getTurnConfig(null);
      if (sysConfig?.onExpire) {
        engine.processAction("__system__", sysConfig.onExpire);
        recordPhase();
        recordActions();
        continue;
      }
      break;
    }

    const { player, actions } = rng.pick(actionable);
    const option = rng.pick(actions);
    try {
      engine.processAction(player.id, unwrapDecisionOption(option));
    } catch (err) {
      result.warnings.push(
        `Stopped action sampling after ${player.id} action failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      break;
    }
    recordPhase();
    recordActions();
  }

  result.phases = Array.from(phaseSet);
  return result;
}

function computeTopology(manifest, requestedPlayers) {
  const minPlayers = Number.isInteger(manifest.minPlayers)
    ? manifest.minPlayers
    : 2;
  const maxPlayers = Number.isInteger(manifest.maxPlayers)
    ? manifest.maxPlayers
    : minPlayers;
  const targetPlayers = requestedPlayers ?? minPlayers;
  const playerCount = clamp(targetPlayers, Math.max(2, minPlayers), maxPlayers);
  const roster = [
    {
      name: "REST-1",
      transport: "REST",
      role: "host/player",
      seatIndex: 0,
      prompt: "REST-1.md",
    },
    {
      name: "UI-1",
      transport: "Playwright",
      role: "browser/player",
      seatIndex: 1,
      prompt: "UI-1.md",
    },
  ];

  for (let seatIndex = 2; seatIndex < playerCount; seatIndex++) {
    roster.push({
      name: `REST-${seatIndex}`,
      transport: "REST",
      role: "player",
      seatIndex,
      prompt: `REST-${seatIndex}.md`,
    });
  }

  return {
    targetPlayers,
    playerCount,
    browserPlayerCount: 1,
    restPlayerCount: playerCount - 1,
    roster,
  };
}

function renderGameBrief({
  manifest,
  gameDir,
  payload,
  repoGuidance,
  hooks,
  logicSummary,
  topology,
  mode,
  baseUrl,
  gameId,
  uploadRequested,
}) {
  const lines = [];
  lines.push(`# E2E Game Brief: ${manifest.name ?? manifest.slug}`);
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Game directory: ${gameDir}`);
  lines.push(`Base URL: ${baseUrl}`);
  lines.push(`Game id/slug: ${gameId}`);
  lines.push(`Run mode: ${mode}`);
  lines.push(`Upload requested: ${uploadRequested ? "yes" : "no"}`);
  lines.push("");
  lines.push("## Manifest");
  lines.push("");
  lines.push(`- slug: ${manifest.slug ?? "(missing)"}`);
  lines.push(
    `- players: ${manifest.minPlayers ?? "?"}-${manifest.maxPlayers ?? "?"}`,
  );
  lines.push(`- version: ${manifest.version ?? "(unspecified)"}`);
  lines.push(`- tags: ${(manifest.tags ?? []).join(", ") || "(none)"}`);
  lines.push(
    `- libraries: ${(manifest.libraries ?? []).join(", ") || "(none)"}`,
  );
  lines.push(
    `- visibility: read from GameLogic.rules.visibility during worker prep`,
  );
  lines.push("");
  lines.push("## Rules");
  lines.push("");
  lines.push(manifest.rules ?? "(manifest.rules missing)");
  lines.push("");
  lines.push("## Worker Topology");
  lines.push("");
  lines.push(`- playerCount: ${topology.playerCount}`);
  lines.push(`- REST players: ${topology.restPlayerCount}`);
  lines.push(`- browser players: ${topology.browserPlayerCount}`);
  for (const worker of topology.roster) {
    lines.push(
      `- ${worker.name}: ${worker.transport}, ${worker.role}, seat ${worker.seatIndex}`,
    );
  }
  lines.push("");
  lines.push("## Payload Files");
  lines.push("");
  for (const file of payload.files) {
    lines.push(`- ${file.relativePath} (${file.bytes} bytes)`);
  }
  for (const missing of payload.missing) {
    lines.push(`- MISSING: ${missing}`);
  }
  lines.push("");
  lines.push("## Repo Guidance Read");
  lines.push("");
  for (const doc of repoGuidance) {
    lines.push(
      `- ${doc.name}: ${doc.present ? `${doc.bytes} bytes at ${doc.path}` : "missing"}`,
    );
  }
  lines.push("");
  lines.push("## Browser Surfaces");
  lines.push("");
  lines.push(
    `- window.__playgentE2E: ${hooks.hasPlaygentE2E ? "present" : "not found"}`,
  );
  lines.push(
    `- window.__playgentCheckLayout: ${hooks.hasPlaygentCheckLayout ? "present" : "not found"}`,
  );
  lines.push(
    `- data-action-idx: ${hooks.hasDataActionIdx ? "mentioned" : "not found"}`,
  );
  lines.push(`- data-cell: ${hooks.hasDataCell ? "mentioned" : "not found"}`);
  lines.push(`- data-card: ${hooks.hasDataCard ? "mentioned" : "not found"}`);
  lines.push(`- button tags: ${hooks.buttonMentions}`);
  lines.push(`- role=button: ${hooks.roleButtonMentions}`);
  lines.push(`- input tags: ${hooks.inputMentions}`);
  lines.push(`- select tags: ${hooks.selectMentions}`);
  lines.push(`- canvas usage: ${hooks.canvasMentions}`);
  if (hooks.hints) {
    lines.push("");
    lines.push("### e2e-play.json Browser Hints");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(hooks.hints, null, 2));
    lines.push("```");
  }
  lines.push("");
  lines.push("## Action Shape Samples");
  lines.push("");
  if (logicSummary.phases.length > 0) {
    lines.push(
      `Observed phase names during static sampling: ${logicSummary.phases.join(", ")}`,
    );
    lines.push("");
  }
  if (logicSummary.actionSamples.length === 0) {
    lines.push("No action samples were found during static sampling.");
  } else {
    for (const sample of logicSummary.actionSamples) {
      lines.push(
        `- ${sample.label ? `${sample.label} ` : ""}[${sample.type}] ${sample.decision}`,
      );
      if (sample.schema)
        lines.push(`  schema: ${safeJson(sample.schema, 360)}`);
    }
  }
  if (logicSummary.warnings.length > 0) {
    lines.push("");
    lines.push("## Sampling Warnings");
    lines.push("");
    for (const warning of logicSummary.warnings) lines.push(`- ${warning}`);
  }
  lines.push("");
  lines.push("## Isolation Notes");
  lines.push("");
  lines.push(
    "This brief is shared static context. It must not be extended with any worker's private poll, hand, role, hidden orders, session token, cursor, or private reasoning.",
  );
  return `${lines.join("\n")}\n`;
}

function renderRestPrompt({
  worker,
  manifest,
  runDir,
  gameDir,
  baseUrl,
  gameId,
  mode,
  topology,
  budgets,
  playthroughCount,
}) {
  const isHost = worker.name === "REST-1";
  const lines = [];
  lines.push(`# ${worker.name} REST Player Prompt`);
  lines.push("");
  lines.push(
    `You are ${worker.name}, an isolated REST player for ${manifest.name ?? manifest.slug}.`,
  );
  lines.push("");
  lines.push(`Run directory: ${runDir}`);
  lines.push(`Game directory: ${gameDir}`);
  lines.push(`Game brief: ${path.join(runDir, "game-brief.md")}`);
  lines.push(`Base URL: ${baseUrl}`);
  lines.push(`Game id/slug: ${gameId}`);
  lines.push(`Run mode: ${mode}`);
  lines.push(`Planned playthroughs: ${playthroughCount}`);
  lines.push(`Player count: ${topology.playerCount}`);
  lines.push(`Max actions: ${budgets.maxActions}`);
  lines.push(`Poll timeout: ${budgets.pollTimeoutMs}ms`);
  lines.push("");
  lines.push(
    "Read the game brief, manifest.json, game.js, index.html, and any declared helper files enough to understand the rules and action meanings.",
  );
  lines.push(
    "Use only documented room REST endpoints: /poll, /action, /chat, /rejoin, and setup/join/start endpoints given by the root orchestrator.",
  );
  lines.push(
    "Every meaningful poll result must become a model-mediated player decision. Do not become a fixed action-number bot.",
  );
  lines.push(
    "Adversarial QA mindset: try to expose rule, deadline, chat, and recovery bugs while staying within legal actions. Prefer an unusual-but-legal move sometimes, test boundary schema values when visible, and make table talk when channels invite it.",
  );
  lines.push(
    "Maintain a running QA test ledger while you play. When you notice an odd legal case or a possible failure mode, write a test idea before or immediately after trying it, then record whether you attempted it, what you expected, what happened, pass/fail/blocked, and evidence.",
  );
  lines.push(
    "Do not optimize only for winning. Your job is to make the game prove it survives realistic, curious, odd-but-legal play.",
  );
  lines.push(
    "Submit only one listed numbered action with the exact actionSetId from the same poll. If a write returns a fresh poll, reason from it before any other write.",
  );
  lines.push(
    `When your poll contains an actionSet, treat the turn deadline as part of the decision. If deadline.remainingMs is at or below ${URGENT_REST_DEADLINE_MS}, choose and submit in the same step before verbose artifact writing. If it is at or below ${CRITICAL_REST_DEADLINE_MS}, submit any legal progress action immediately rather than timing out.`,
  );
  lines.push(
    "Do not wait for root permission, another poll, or a transcript update once you have a current legal actionSet for your own turn. Store the poll first, submit, then write the explanatory transcript.",
  );
  lines.push(
    "If an action write returns 409, immediately poll again and continue from the fresh state unless the poll shows game over, no legal actions for you, privacy leak, or hard failure.",
  );
  lines.push(
    "Chat only on channels exposed to you by the latest poll, and never invent chat.channel if the contract does not expose it.",
  );
  lines.push(
    "Do not inspect another worker's poll transcript, hidden state, hand, role, private orders, cursor, token, or reasoning.",
  );
  lines.push("");
  if (isHost) {
    lines.push("Host setup:");
    lines.push("");
    lines.push("1. Create the room as REST-1:");
    lines.push("");
    lines.push("```http");
    lines.push(`POST ${baseUrl}/api/games/${gameId}/rooms`);
    lines.push("{");
    lines.push('  "name": "REST-1",');
    lines.push(`  "maxPlayers": ${topology.playerCount},`);
    lines.push('  "seatPolicy": "anyone",');
    lines.push('  "allowSpectators": true');
    lines.push("}");
    lines.push("```");
    lines.push("");
    lines.push(
      "2. Report only the room code, your player id, and whether you received a token to the root. Keep full poll bodies in your own worker artifacts.",
    );
    lines.push(
      "3. After the root confirms all workers joined, start the room with your host token:",
    );
    lines.push("");
    lines.push("```http");
    lines.push(`POST ${baseUrl}/api/rooms/<ROOM_CODE>/start`);
    lines.push("Authorization: Bearer <REST-1_SESSION_TOKEN>");
    lines.push("{}");
    lines.push("```");
  } else {
    lines.push("Join setup:");
    lines.push("");
    lines.push("1. Wait for the root to provide the room code.");
    lines.push("2. Join as your exact worker name:");
    lines.push("");
    lines.push("```http");
    lines.push(`POST ${baseUrl}/api/rooms/<ROOM_CODE>/join`);
    lines.push("{");
    lines.push(`  "name": "${worker.name}"`);
    lines.push("}");
    lines.push("```");
    lines.push("");
    lines.push(
      "3. Report only your player id and join status to root. Keep your token and poll transcript scoped to this worker unless root explicitly needs the token for mechanical recovery.",
    );
  }
  lines.push("");
  lines.push("Player loop:");
  lines.push("");
  lines.push("1. Poll with your latest cursor:");
  lines.push("");
  lines.push("```http");
  lines.push(
    `GET ${baseUrl}/api/rooms/<ROOM_CODE>/poll?cursor=<CURSOR>&timeout_ms=${budgets.pollTimeoutMs}&wake=attention`,
  );
  lines.push("Authorization: Bearer <YOUR_SESSION_TOKEN>");
  lines.push("```");
  lines.push("");
  lines.push("2. Store every returned cursor, including unchanged polls.");
  lines.push(
    "3. If the poll changed state, attention, chat, legal actions, or game over, make a model decision.",
  );
  lines.push(
    "4. If you have legal actions, submit one before any deadline expires. Artifact polish is lower priority than avoiding auto-play.",
  );
  lines.push(
    "5. In every mode, choose unusual legal options sometimes when the deadline allows it. In weird mode, increase that curiosity, but keep the game progressing and never spend an urgent turn on a probe.",
  );
  lines.push(
    "6. Across repeated playthroughs, vary your choices instead of replaying the same opening or policy unless the legal state forces it.",
  );
  lines.push(
    "7. For each attempted or skipped QA test, append one JSON object to tests.jsonl with id, playthrough, worker, risk, setup, steps, expected, observed, status, evidence, and skippedReason when applicable.",
  );
  lines.push(
    "8. Write poll.jsonl, writes.jsonl, tests.jsonl, and transcript.md under your worker artifact directory.",
  );
  return `${lines.join("\n")}\n`;
}

function renderBrowserPrompt({
  worker,
  manifest,
  runDir,
  gameDir,
  baseUrl,
  mode,
  budgets,
  playthroughCount,
  headed,
}) {
  const lines = [];
  lines.push(`# ${worker.name} Browser Player Prompt`);
  lines.push("");
  lines.push(
    `You are ${worker.name}, the isolated browser/UI player for ${manifest.name ?? manifest.slug}.`,
  );
  lines.push("");
  lines.push(`Run directory: ${runDir}`);
  lines.push(`Game directory: ${gameDir}`);
  lines.push(`Game brief: ${path.join(runDir, "game-brief.md")}`);
  lines.push(`Base URL: ${baseUrl}`);
  lines.push(`Run mode: ${mode}`);
  lines.push(`Planned playthroughs: ${playthroughCount}`);
  lines.push(
    `Browser mode: ${headed ? "headed Chrome requested" : "headless Chromium default"}`,
  );
  lines.push(`Browser action timeout: ${budgets.browserActionTimeoutMs}ms`);
  lines.push("");
  lines.push(
    "Wait for the root to provide the room code, then use Playwright Chromium to open:",
  );
  lines.push("");
  lines.push("```text");
  lines.push(`${baseUrl}/?code=<ROOM_CODE>`);
  lines.push("```");
  lines.push("");
  lines.push(
    "Join as UI-1 if the shell asks for a display name. Play only through real UI gestures: click, type, drag, tap, press keys, hover, resize, or wait.",
  );
  lines.push(
    "Adversarial QA mindset: use the UI like a curious tester. Try harmless odd-but-legal interactions before or between valid moves when the state is not urgent: hover, click empty visible space, double-click one control and verify only one action lands, resize desktop/mobile, press Escape/Tab/Enter/arrows, edit inputs, and recover to a valid move.",
  );
  lines.push(
    "Maintain a running QA test ledger while you play. When you notice an odd UI state or possible failure mode, write a test idea before or immediately after trying it, then record whether you attempted it, what you expected, what happened, pass/fail/blocked, and evidence.",
  );
  lines.push(
    "Do not optimize only for winning. Your job is to prove visible controls, layout, timing, and recovery behavior survive realistic awkward use.",
  );
  lines.push(
    "Keep the same Playwright browser context and page alive after joining. A lobby screenshot is only a readiness checkpoint, not task completion; do not close the browser or send a final response until game over, hard failure, privacy leak, browser bypass, or root explicitly cancels the run.",
  );
  lines.push(
    "If your environment supports non-final progress updates, report a short ready checkpoint after joining, then continue waiting in the same browser session for host start and gameplay. If it does not support non-final updates, stay running silently rather than ending the task. If the page reloads or reconnects, recover through visible UI only and record the recovery.",
  );
  lines.push(
    "Do not call REST /action, do not call playgent.submitAction() from JavaScript, and do not mutate game state through evaluate().",
  );
  lines.push("");
  lines.push("Allowed reads from the shell or game iframe:");
  lines.push("");
  lines.push("- visible DOM text, attributes, geometry, and screenshots");
  lines.push("- console/page errors and network failures");
  lines.push("- canvas pixels and screenshot diffs");
  lines.push("- window.__playgentE2E.getSnapshot() if present");
  lines.push("- window.__playgentE2E.getInteractiveRegions() if present");
  lines.push(
    "- window.__playgentE2E.checkLayout() and window.__playgentCheckLayout() if present",
  );
  lines.push("");
  lines.push("Disallowed reads:");
  lines.push("");
  lines.push("- window.__playgentE2EState");
  lines.push(
    "- raw legalActions, actionSetId, REST cursors, tokens, or playgent internals",
  );
  lines.push("- another worker's private poll or reasoning");
  lines.push("");
  lines.push(
    "For each meaningful observation, decide an intent first, then execute it with Playwright. Prefer DOM controls, then iframe controls, then public interactive regions for canvas/PixiJS hitboxes. A bare canvas with no public region is not enough when the UI player has legal actions.",
  );
  lines.push("");
  lines.push(
    "Take screenshots at lobby, first playable state, before and after each UI action, phase changes, weird probes, game over, and failures. Write observations.jsonl, intents.jsonl, actions.jsonl, tests.jsonl, console.jsonl, network.jsonl, layout.jsonl, pixels.jsonl, screenshots, and trace/video artifacts under your worker artifact directory.",
  );
  lines.push(
    "For each attempted or skipped QA test, append one JSON object to tests.jsonl with id, playthrough, worker, risk, setup, steps, expected, observed, status, evidence, and skippedReason when applicable.",
  );
  lines.push("");
  lines.push(
    "In every mode, attempt at least one safe adversarial UI probe per playthrough when the UI offers a recoverable opportunity. In weird mode, attempt more varied probes. Do not let probes consume an urgent visible turn or cause an avoidable timeout.",
  );
  lines.push(
    "Across repeated playthroughs, vary which controls, cells, cards, options, or inputs you exercise so the suite covers more UI surface than a single happy path.",
  );
  return `${lines.join("\n")}\n`;
}

function renderRootPrompt({
  adapter,
  manifest,
  runDir,
  gameDir,
  baseUrl,
  gameId,
  mode,
  topology,
  budgets,
  playthroughCount,
  uploadRequested,
}) {
  const expectation = liveRunExpectation({ topology, mode, playthroughCount });
  const title = adapter === "codex" ? "Codex" : "Claude Code";
  const template = safeReadText(ROOT_PROMPT_TEMPLATE_PATH);
  if (!template) {
    throw new Error(
      `Missing root prompt template: ${ROOT_PROMPT_TEMPLATE_PATH}`,
    );
  }
  const uploadSection = uploadRequested
    ? [
        "Upload step:",
        "",
        "Upload the payload to the base host with CLANKERFIGHTS_UPLOAD_TOKEN before creating a room. Record the returned opaque game id in room.json and use it instead of the manifest slug.",
        "",
      ].join("\n")
    : "";
  const workerRoster = topology.roster
    .map(
      (worker) =>
        `- ${worker.name}: ${worker.transport}, prompt ${path.join(runDir, "prompts", worker.prompt)}`,
    )
    .join("\n");
  let adapterSection;
  if (adapter === "codex") {
    adapterSection = [
      "Codex adapter:",
      "",
      "1. Spawn one worker subagent per roster entry. Use worker subagents for REST seats and a worker subagent for UI-1 when available.",
      "2. Give each worker only its own prompt file plus shared static game files and game brief.",
      "3. If UI-1 cannot directly drive Playwright, root may run a local Playwright helper, but UI-1 must still make every gameplay/UI intent decision from observation bundles.",
      "4. Let workers run in parallel. Do not give UI-1 a join-only task and do not wait for UI-1 to finish at lobby; confirm liveness from room state, screenshots, or explicit non-final progress only.",
    ].join("\n");
  } else {
    adapterSection = [
      "Claude Code adapter:",
      "",
      "1. Use Task/subagents when available, one isolated worker per roster entry.",
      "2. If Task/subagents are unavailable, launch one isolated Claude process or terminal per worker prompt.",
      "3. A single Claude context must not play multiple hidden-information seats.",
      "4. If screenshot vision is unavailable, still record screenshots and mark the report as vision_limited.",
    ].join("\n");
  }
  return renderTemplate(template, {
    TITLE: title,
    GAME_NAME: manifest.name ?? manifest.slug,
    RUN_DIR: runDir,
    GAME_DIR: gameDir,
    GAME_BRIEF: path.join(runDir, "game-brief.md"),
    BASE_URL: baseUrl,
    GAME_ID: gameId,
    MODE: mode,
    UPLOAD_REQUESTED: uploadRequested ? "yes" : "no",
    BUDGETS: `${budgets.maxActions} actions per playthrough, ${budgets.maxMinutes} minutes per playthrough, ${budgets.pollTimeoutMs}ms polls`,
    PLAYTHROUGH_COUNT: String(playthroughCount),
    PLAYTHROUGH_PLAN: renderPlaythroughPlan(playthroughCount),
    EXPECTATION: renderExpectationLines(expectation).join("\n"),
    UPLOAD_SECTION: uploadSection,
    WORKER_ROSTER: workerRoster,
    ADAPTER_SECTION: adapterSection,
    URGENT_REST_DEADLINE_MS: String(URGENT_REST_DEADLINE_MS),
  });
}

function renderSummary({
  manifest,
  runDir,
  gameDir,
  baseUrl,
  gameId,
  mode,
  topology,
  preflight,
  uploadRequested,
  hostCheck,
  adapter,
  playthroughCount,
}) {
  const lines = [];
  const expectation = liveRunExpectation({ topology, mode, playthroughCount });
  lines.push(`# E2E Play Harness Run`);
  lines.push("");
  lines.push(`Status: ${preflight?.ok === false ? "blocked" : "prepared"}`);
  lines.push(`Game: ${manifest.name ?? manifest.slug}`);
  lines.push(`Slug: ${manifest.slug ?? "(missing)"}`);
  lines.push(`Game dir: ${gameDir}`);
  lines.push(`Run dir: ${runDir}`);
  lines.push(`Base URL: ${baseUrl}`);
  lines.push(`Game id/slug: ${gameId}`);
  lines.push(`Mode: ${mode}`);
  lines.push(`Playthroughs: ${playthroughCount}`);
  lines.push(`Adapter prompts: ${adapter}`);
  lines.push(`Upload requested: ${uploadRequested ? "yes" : "no"}`);
  lines.push(`Players: ${topology.playerCount}`);
  lines.push("");
  lines.push("## Generated Prompts");
  lines.push("");
  if (adapter === "codex" || adapter === "both") {
    lines.push(
      `- Codex root: ${path.join(runDir, "prompts", "ROOT-CODEX.md")}`,
    );
  }
  if (adapter === "claude" || adapter === "both") {
    lines.push(
      `- Claude root: ${path.join(runDir, "prompts", "ROOT-CLAUDE.md")}`,
    );
  }
  for (const worker of topology.roster) {
    lines.push(
      `- ${worker.name}: ${path.join(runDir, "prompts", worker.prompt)}`,
    );
  }
  lines.push("");
  lines.push("## Checks");
  lines.push("");
  if (preflight) {
    lines.push(
      `- Static preflight: ${preflight.ok ? "pass" : "fail"} (${preflight.command})`,
    );
  } else {
    lines.push("- Static preflight: skipped by --no-preflight");
  }
  if (hostCheck) {
    lines.push(
      `- Host check: ${hostCheck.ok ? "pass" : "fail"} (${hostCheck.status ?? hostCheck.error})`,
    );
  } else {
    lines.push("- Host check: skipped unless --require-host is passed");
  }
  lines.push("");
  lines.push("## Live Run Expectation");
  lines.push("");
  for (const line of renderExpectationLines(expectation)) lines.push(line);
  lines.push("");
  lines.push("## Final Report Contract");
  lines.push("");
  lines.push(
    "- After the pasted root prompt runs, replace this prepared summary with Expectation, QA Test Cases, and Result sections.",
  );
  lines.push(
    "- QA Test Cases must summarize the odd cases workers considered or attempted, grouped by playthrough, with expected result, observed result, pass/fail/blocked status, and evidence paths.",
  );
  lines.push(
    "- Also write the structured aggregate ledger to `reports/test-cases.json`.",
  );
  lines.push(
    "- Result must include gate statuses, REST/browser action counts, final room outcome or stall reason, and artifact paths.",
  );
  lines.push(
    `- Result must summarize all ${playthroughCount} planned playthrough${playthroughCount === 1 ? "" : "s"} individually and as an aggregate.`,
  );
  lines.push(
    "- Failures must also be written to `reports/failures.json` with fix-oriented codes and evidence.",
  );
  lines.push("");
  lines.push("## Next Step");
  lines.push("");
  lines.push(
    "Paste the root prompt for your agent environment. It will create or upload the game on the target host, spawn isolated player workers, and drive the live room through REST plus Playwright.",
  );
  lines.push("");
  lines.push("Local default:");
  lines.push("");
  lines.push("```sh");
  lines.push(
    `node scripts/e2e-play.mjs ${relFromRepo(gameDir)} --mode ${mode}`,
  );
  lines.push("```");
  lines.push("");
  lines.push("Production upload/play:");
  lines.push("");
  lines.push("```sh");
  lines.push(
    `node scripts/e2e-play.mjs ${relFromRepo(gameDir)} --prod --upload --mode full`,
  );
  lines.push("```");
  return `${lines.join("\n")}\n`;
}

function runPreflight(gameDir, runDir, seeds) {
  const gameArg = relFromRepo(gameDir);
  const commandArgs = [
    "scripts/test-game.mjs",
    gameArg,
    "--all",
    "--seeds",
    seeds,
  ];
  console.log(`\n=== Static preflight ===`);
  console.log(`${process.execPath} ${commandArgs.join(" ")}`);
  const result = spawnSync(process.execPath, commandArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 24,
    shell: false,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  writeFileSync(path.join(runDir, "preflight.stdout.txt"), result.stdout ?? "");
  writeFileSync(path.join(runDir, "preflight.stderr.txt"), result.stderr ?? "");
  return {
    command: `${process.execPath} ${commandArgs.join(" ")}`,
    status: result.status,
    signal: result.signal,
    error: result.error ? result.error.message : null,
    ok: result.status === 0 && !result.error,
  };
}

async function checkHost(baseUrl) {
  try {
    const response = await fetch(baseUrl, { method: "GET" });
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function uploadPayload({ baseUrl, gameDir, payload, token }) {
  if (typeof fetch !== "function" || typeof FormData !== "function") {
    throw new Error("This Node runtime does not expose fetch/FormData");
  }
  if (!token) {
    throw new Error("CLANKERFIGHTS_UPLOAD_TOKEN is required with --upload");
  }

  const form = new FormData();
  for (const file of payload.files) {
    const bytes = readFileSync(file.absolutePath);
    form.append(
      "files",
      new Blob([bytes]),
      file.relativePath.replaceAll(path.sep, "/"),
    );
  }
  form.append("source", "games-repo-e2e-play");
  form.append("root", path.basename(gameDir));

  const endpoint = new URL("/api/games", baseUrl);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!response.ok) {
    throw new Error(
      `Upload failed (${response.status} ${response.statusText}): ${truncate(text, 500)}`,
    );
  }
  const gameId = body?.gameId ?? body?.id ?? body?.slug ?? body?.game?.id;
  if (!gameId) {
    throw new Error(
      `Upload response did not include gameId/id/slug: ${truncate(text, 500)}`,
    );
  }
  return {
    endpoint: endpoint.toString(),
    status: response.status,
    body,
    gameId,
  };
}

async function main() {
  if (!gameDirArg || hasFlag("help") || hasFlag("h")) {
    usage();
    process.exit(gameDirArg ? 0 : 1);
  }

  const absDir = path.resolve(repoRoot, gameDirArg);
  if (!existsSync(path.join(absDir, "manifest.json"))) {
    fail(`Missing manifest.json in ${absDir}`);
  }

  const manifest = readJson(path.join(absDir, "manifest.json"));
  if (!manifest.slug) fail(`manifest.slug is required in ${absDir}`);

  const mode = arg("mode", "smoke");
  if (!MODES.has(mode)) fail(`Unsupported --mode ${mode}`);

  const adapter = arg("adapter", "both");
  if (!ADAPTERS.has(adapter)) fail(`Unsupported --adapter ${adapter}`);

  const baseUrl = normalizeBaseUrl(
    hasFlag("prod")
      ? "https://clankerfights.ai"
      : arg("base", "http://localhost:3000"),
  );
  const requestedPlayers = args.includes("--players")
    ? parseInteger("players", manifest.minPlayers)
    : null;
  const topology = computeTopology(manifest, requestedPlayers);
  const playthroughCount = parsePositiveInteger("runs", 3);
  const gameIdFromArgs = arg("game-id", manifest.slug);
  let gameId = gameIdFromArgs;
  const uploadRequested = hasFlag("upload");
  const budgets = {
    maxActions: parseInteger("max-actions", 300),
    maxMinutes: parseInteger("max-minutes", 20),
    pollTimeoutMs: parseInteger("poll-timeout-ms", 5000),
    browserActionTimeoutMs: parseInteger("browser-action-timeout-ms", 15000),
    phaseStallMs: parseInteger("phase-stall-ms", 60000),
  };

  const outRoot = path.resolve(repoRoot, arg("out-dir", "e2e-runs"));
  const runDir = path.join(outRoot, `${timestamp()}-${manifest.slug}`);
  mkdirSync(runDir, { recursive: true });
  mkdirSync(path.join(runDir, "prompts"), { recursive: true });
  mkdirSync(path.join(runDir, "reports"), { recursive: true });
  mkdirSync(path.join(runDir, "workers"), { recursive: true });
  writeJson(path.join(runDir, "reports", "test-cases.json"), []);

  const payload = collectPayload(absDir, manifest);
  if (payload.missing.length > 0) {
    writeJson(path.join(runDir, "reports", "failures.json"), [
      {
        code: "setup.payload_incomplete",
        missing: payload.missing,
      },
    ]);
    fail(`Payload is missing files: ${payload.missing.join(", ")}`);
  }

  const hintsPath = path.join(absDir, "e2e-play.json");
  const hints = existsSync(hintsPath) ? readJson(hintsPath) : null;
  const indexHtml = safeReadText(path.join(absDir, "index.html"));
  const hooks = detectBrowserHooks(indexHtml, hints);
  const repoGuidance = readRepoGuidance();
  const logicSummary = summarizeGameLogic(
    absDir,
    manifest,
    topology.playerCount,
  );

  let hostCheck = null;
  if (hasFlag("require-host")) {
    console.log(`Checking host ${baseUrl}...`);
    hostCheck = await checkHost(baseUrl);
    if (!hostCheck.ok) {
      writeJson(path.join(runDir, "reports", "failures.json"), [
        {
          code: "setup.host_unavailable",
          baseUrl,
          detail: hostCheck,
        },
      ]);
      fail(
        `Host check failed for ${baseUrl}: ${hostCheck.status ?? hostCheck.error}`,
      );
    }
  }

  let preflight = null;
  if (!hasFlag("no-preflight")) {
    preflight = runPreflight(absDir, runDir, arg("seeds", "42,1337"));
    if (!preflight.ok && !hasFlag("allow-preflight-fail")) {
      writeJson(path.join(runDir, "reports", "failures.json"), [
        {
          code: "setup.static_preflight_failed",
          command: preflight.command,
          status: preflight.status,
          signal: preflight.signal,
          error: preflight.error,
        },
      ]);
      console.error(`Preflight failed. Artifacts written to ${runDir}`);
      process.exit(1);
    }
  }

  let upload = { requested: uploadRequested, status: "skipped" };
  if (uploadRequested) {
    try {
      const uploadResult = await uploadPayload({
        baseUrl,
        gameDir: absDir,
        payload,
        token: process.env.CLANKERFIGHTS_UPLOAD_TOKEN,
      });
      upload = { requested: true, status: "uploaded", ...uploadResult };
      gameId = uploadResult.gameId;
    } catch (err) {
      upload = {
        requested: true,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      };
      writeJson(path.join(runDir, "reports", "failures.json"), [
        {
          code: "setup.game_upload_failed",
          baseUrl,
          detail: upload.error,
        },
      ]);
      writeJson(path.join(runDir, "run.json"), {
        status: "blocked",
        manifestSlug: manifest.slug,
        runDir,
        baseUrl,
        gameId,
        upload,
      });
      fail(`Upload failed: ${upload.error}`);
    }
  }

  const gameBrief = renderGameBrief({
    manifest,
    gameDir: absDir,
    payload,
    repoGuidance,
    hooks,
    logicSummary,
    topology,
    mode,
    baseUrl,
    gameId,
    uploadRequested,
  });
  writeFileSync(path.join(runDir, "game-brief.md"), gameBrief);
  writeFileSync(
    path.join(runDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  const rootPromptContext = {
    manifest,
    runDir,
    gameDir: absDir,
    baseUrl,
    gameId,
    mode,
    topology,
    budgets,
    playthroughCount,
    uploadRequested,
  };
  if (adapter === "codex" || adapter === "both") {
    writeFileSync(
      path.join(runDir, "prompts", "ROOT-CODEX.md"),
      renderRootPrompt({ adapter: "codex", ...rootPromptContext }),
    );
  }
  if (adapter === "claude" || adapter === "both") {
    writeFileSync(
      path.join(runDir, "prompts", "ROOT-CLAUDE.md"),
      renderRootPrompt({ adapter: "claude", ...rootPromptContext }),
    );
  }

  for (const worker of topology.roster) {
    const workerDir = path.join(runDir, "workers", worker.name);
    mkdirSync(workerDir, { recursive: true });
    for (let index = 1; index <= playthroughCount; index++) {
      const playthroughDir = path.join(
        workerDir,
        `playthrough-${String(index).padStart(2, "0")}`,
      );
      mkdirSync(playthroughDir, { recursive: true });
      writeFileSync(path.join(playthroughDir, "tests.jsonl"), "");
      if (worker.transport === "Playwright") {
        mkdirSync(path.join(playthroughDir, "screenshots"), {
          recursive: true,
        });
      }
    }
    if (worker.transport === "Playwright") {
      mkdirSync(path.join(workerDir, "screenshots"), { recursive: true });
      writeFileSync(
        path.join(runDir, "prompts", worker.prompt),
        renderBrowserPrompt({
          worker,
          manifest,
          runDir,
          gameDir: absDir,
          baseUrl,
          mode,
          budgets,
          playthroughCount,
          headed: hasFlag("headed") || mode === "diagnostic",
        }),
      );
    } else {
      writeFileSync(
        path.join(runDir, "prompts", worker.prompt),
        renderRestPrompt({
          worker,
          manifest,
          runDir,
          gameDir: absDir,
          baseUrl,
          gameId,
          mode,
          topology,
          budgets,
          playthroughCount,
        }),
      );
    }
    writeFileSync(
      path.join(workerDir, "transcript.md"),
      `# ${worker.name} Transcript\n\nPending live run.\n`,
    );
    writeFileSync(path.join(workerDir, "tests.jsonl"), "");
  }

  const runJson = {
    status: preflight?.ok === false ? "blocked" : "prepared",
    createdAt: new Date().toISOString(),
    baseUrl,
    gameId,
    manifestSlug: manifest.slug,
    manifestName: manifest.name ?? null,
    revisionId: null,
    gameDir: absDir,
    runDir,
    mode,
    adapter,
    playthroughCount,
    topology,
    budgets,
    adversarialPolicy: {
      required: true,
      minimumSafeUiProbesPerPlaythrough: 1,
      varyChoicesAcrossPlaythroughs: true,
      recordQaTestLedger: true,
      workerLedgerFile: "tests.jsonl",
      aggregateLedgerFile: "reports/test-cases.json",
      stayWithinLegalActions: true,
      skipProbeWhenDeadlineUrgentMs: URGENT_REST_DEADLINE_MS,
      notes:
        "Workers should behave like curious QA testers: odd-but-legal decisions, harmless UI probes, boundary inputs, resize/keyboard/double-click behavior, and recovery checks without blocking progress. They must write attempted and skipped test cases to tests.jsonl for final report aggregation.",
    },
    weirdness:
      mode === "weird"
        ? {
            normalFinishBias: 0.6,
            oddLegalChoiceBias: 0.25,
            uiProbeBias: 0.15,
            maxWeirdProbesPerTurn: 2,
            maxNoProgressWeirdTurns: 3,
          }
        : null,
    viewportPlan:
      mode === "viewport"
        ? [
            { name: "desktop", width: 1280, height: 800 },
            { name: "mobile", width: 390, height: 844 },
          ]
        : [{ name: "desktop", width: 1280, height: 800 }],
    upload,
    hostCheck,
    preflight,
    expectation: liveRunExpectation({ topology, mode, playthroughCount }),
    finalStatus: "prepared",
    failureCodes: [],
  };
  writeJson(path.join(runDir, "run.json"), runJson);
  writeJson(path.join(runDir, "room.json"), {
    baseUrl,
    gameId,
    roomCode: null,
    started: false,
    workers: topology.roster.map((worker) => ({
      name: worker.name,
      transport: worker.transport,
      playerId: null,
      joined: false,
      cursor: null,
      tokenStoredByWorker: null,
      playthroughs: Array.from({ length: playthroughCount }, (_, index) => ({
        index: index + 1,
        roomCode: null,
        playerId: null,
        joined: false,
        finalStatus: "pending",
      })),
    })),
  });
  writeJson(path.join(runDir, "reports", "failures.json"), []);
  writeJson(path.join(runDir, "reports", "test-cases.json"), []);
  writeFileSync(
    path.join(runDir, "reports", "summary.md"),
    renderSummary({
      manifest,
      runDir,
      gameDir: absDir,
      baseUrl,
      gameId,
      mode,
      topology,
      preflight,
      uploadRequested,
      hostCheck,
      adapter,
      playthroughCount,
    }),
  );

  console.log("\n-------------------------------------------");
  console.log("  E2E PLAY HARNESS PREPARED");
  console.log("-------------------------------------------");
  console.log(`  Game:       ${manifest.slug}`);
  console.log(`  Mode:       ${mode}`);
  console.log(`  Runs:       ${playthroughCount}`);
  console.log(`  Base:       ${baseUrl}`);
  console.log(`  Game id:    ${gameId}`);
  console.log(`  Players:    ${topology.playerCount}`);
  console.log(`  Run dir:    ${runDir}`);
  if (adapter === "codex" || adapter === "both") {
    console.log(
      `  Codex:      ${path.join(runDir, "prompts", "ROOT-CODEX.md")}`,
    );
  }
  if (adapter === "claude" || adapter === "both") {
    console.log(
      `  Claude:     ${path.join(runDir, "prompts", "ROOT-CLAUDE.md")}`,
    );
  }
  console.log("-------------------------------------------\n");

  if (hasFlag("print-root-prompt")) {
    const rootPrompt =
      adapter === "claude"
        ? path.join(runDir, "prompts", "ROOT-CLAUDE.md")
        : path.join(runDir, "prompts", "ROOT-CODEX.md");
    console.log(rootPrompt);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
