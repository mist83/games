#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import {
  buildTestHtml,
  readAdditionalFiles,
} from "./lib/html-test-harness.mjs";
import { loadGameLogic } from "./lib/load-game-logic.mjs";
import {
  createSeededRandom,
  GameEngine,
  outcomeWinners,
  unwrapDecisionOption,
} from "./lib/playgent-core.mjs";
import { validateThumbnailSvg } from "./lib/thumbnail-validation.mjs";

const gameDir = process.argv[2];
const args = process.argv.slice(3);

function arg(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

if (!gameDir) {
  console.error(
    "Usage: node scripts/test-game-ui.mjs <game-directory> [--players N] [--seed N] [--headed] [--max-snapshots N]",
  );
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const absDir = path.resolve(gameDir);
const manifestPath = path.join(absDir, "manifest.json");
if (!existsSync(manifestPath)) {
  console.error(`Missing manifest.json in ${absDir}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const thumbnailFailures = validateThumbnailSvg(manifest, absDir);
if (thumbnailFailures.length > 0) {
  console.error(`Thumbnail validation failed for ${absDir}:`);
  for (const failure of thumbnailFailures) console.error(`  - ${failure}`);
  process.exit(1);
}
const GameLogic = loadGameLogic(absDir);
GameLogic.manifest = manifest;

const htmlPath = path.join(absDir, "index.html");
if (!existsSync(htmlPath)) {
  console.error(`Missing index.html in ${absDir}`);
  process.exit(1);
}

const rawHtml = readFileSync(htmlPath, "utf8");
const additionalFiles = readAdditionalFiles(absDir, manifest);
const usesPixi = (manifest.libraries ?? []).includes("pixi");
const pixiLibPath = path.join(
  repoRoot,
  "scripts",
  "vendor",
  "pixi-v8.17.0.min.js",
);
const hasPixiLib = existsSync(pixiLibPath);
const playerCount = Number.parseInt(
  arg("players", String(manifest.minPlayers)),
  10,
);
const headed = hasFlag("headed");
const screenshotDir = path.resolve("screenshots", manifest.slug);
const maxSnapshots = Number.parseInt(arg("max-snapshots", "12"), 10);

if (usesPixi && !hasPixiLib) {
  console.error(`PixiJS library missing: ${pixiLibPath}`);
  process.exit(1);
}

function makePlayers(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i}`,
    name: `Bot${i + 1}`,
  }));
}

function generateSnapshots(seed) {
  const rng = createSeededRandom(seed);
  const players = makePlayers(playerCount);
  const engine = new GameEngine(GameLogic, players, {}, seed);
  const snapshots = [];
  const actionMilestones = new Set([3, 6, 9]);
  let actionCount = 0;
  let lastPhase;
  const initialState = engine.getState();
  const hasPhases =
    initialState && typeof initialState === "object" && "phase" in initialState;

  function capture(label) {
    const result = engine.getResult();
    const playerId = players[0].id;
    const legalActions = engine.getActions(playerId);
    snapshots.push({
      label,
      view: engine.getView(playerId),
      legalActions,
      playerId,
      players,
      gameOver: result
        ? { playerIds: outcomeWinners(result), summary: result.summary }
        : null,
    });
  }

  capture("initial");

  for (let tick = 0; tick < 500; tick++) {
    const state = engine.getState();
    if (engine.getResult() !== null) break;
    if (hasPhases && state.phase !== lastPhase && lastPhase !== undefined)
      capture(`phase-${state.phase}`);
    lastPhase = state.phase;

    const playerActions = [];
    for (const player of players) {
      const actions = engine.getActions(player.id);
      if (actions.length > 0) playerActions.push({ player, actions });
    }

    if (playerActions.length === 0) {
      const sysConfig = engine.getTurnConfig(null);
      if (sysConfig?.onExpire) {
        engine.processAction("__system__", sysConfig.onExpire);
        actionCount++;
        continue;
      }
      break;
    }

    for (const { player, actions } of playerActions) {
      const option = rng.pick(actions);
      engine.processAction(player.id, unwrapDecisionOption(option));
      actionCount++;
      if (
        !hasPhases &&
        actionMilestones.has(actionCount) &&
        engine.getResult() === null
      ) {
        capture(`action-${actionCount}`);
      }
      if (engine.getResult() !== null) break;
    }
  }

  if (engine.getResult() !== null) capture("game-over");
  return { snapshots, actionCount };
}

function sampleSnapshots(snapshots, limit) {
  if (!Number.isFinite(limit) || limit <= 0 || snapshots.length <= limit)
    return snapshots;
  const selected = [];
  const used = new Set();

  function add(index) {
    if (
      index < 0 ||
      index >= snapshots.length ||
      used.has(index) ||
      selected.length >= limit
    )
      return;
    used.add(index);
    selected.push({ index, snapshot: snapshots[index] });
  }

  add(0);
  const seenLabels = new Set();
  for (let i = 0; i < snapshots.length && selected.length < limit; i++) {
    if (seenLabels.has(snapshots[i].label)) continue;
    seenLabels.add(snapshots[i].label);
    add(i);
  }
  add(snapshots.length - 1);

  var stride = Math.max(1, Math.floor(snapshots.length / limit));
  for (
    let i = stride;
    i < snapshots.length && selected.length < limit;
    i += stride
  )
    add(i);
  for (let i = 0; i < snapshots.length && selected.length < limit; i++) add(i);

  return selected
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.snapshot);
}

let baseSeed = Number.parseInt(arg("seed", "42"), 10);
let generated = generateSnapshots(baseSeed);
for (
  let attempt = 1;
  attempt < 3 && generated.snapshots.length < 3;
  attempt++
) {
  baseSeed += 1000;
  generated = generateSnapshots(baseSeed);
}
const originalSnapshotCount = generated.snapshots.length;
generated = {
  ...generated,
  snapshots: sampleSnapshots(generated.snapshots, maxSnapshots),
};

const testHtml = buildTestHtml({
  rawHtml,
  additionalFiles,
  usesPixi,
  hasPixiLib,
});
const universalLandmarks = ["[data-phase]", "[data-player]", "[data-status]"];
const canvasOnly = usesPixi && !rawHtml.includes("data-phase");
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
];

function startServer(html) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.url === "/lib/pixi.min.js" && hasPixiLib) {
        const pixi = readFileSync(pixiLibPath);
        res.writeHead(200, {
          "Content-Type": "application/javascript",
          "Content-Length": pixi.length,
        });
        res.end(pixi);
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    });
    server.listen(0, "127.0.0.1", () =>
      resolve({ server, url: `http://127.0.0.1:${server.address().port}` }),
    );
  });
}

async function collectLayoutFailures(
  page,
  label,
  viewportName,
  warnings,
  failures,
) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const overflowX = Math.max(doc.scrollWidth, body.scrollWidth) - vw;
    const selectors =
      "button, [role='button'], a[href], input, select, textarea, [data-action-idx], [onclick]";
    const items = Array.from(document.querySelectorAll(selectors))
      .filter((el) => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return (
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          rect.width > 0 &&
          rect.height > 0
        );
      })
      .map((el, index) => {
        const rect = el.getBoundingClientRect();
        return {
          index,
          label:
            el.id ||
            el.getAttribute("data-action-idx") ||
            el.textContent?.trim().slice(0, 40) ||
            el.tagName,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        };
      });
    const offscreen = items.filter(
      (r) => r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1,
    );
    const tooSmall = items.filter((r) => r.width < 36 || r.height < 36);
    const overlaps = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const x = Math.max(
          0,
          Math.min(a.right, b.right) - Math.max(a.left, b.left),
        );
        const y = Math.max(
          0,
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
        );
        const area = x * y;
        if (area <= 0) continue;
        const minArea = Math.min(a.width * a.height, b.width * b.height);
        if (area / minArea > 0.2) overlaps.push([a.label, b.label]);
      }
    }
    return { overflowX, offscreen, tooSmall, overlaps };
  });

  if (metrics.overflowX > 1)
    failures.push(
      `[${viewportName}/${label}] horizontal overflow: ${Math.round(metrics.overflowX)}px`,
    );
  for (const item of metrics.offscreen) {
    failures.push(
      `[${viewportName}/${label}] interactive element offscreen: ${item.label}`,
    );
  }
  for (const item of metrics.tooSmall) {
    warnings.push(
      `[${viewportName}/${label}] small touch target: ${item.label} (${Math.round(item.width)}x${Math.round(item.height)})`,
    );
  }
  for (const pair of metrics.overlaps) {
    failures.push(
      `[${viewportName}/${label}] overlapping interactive elements: ${pair[0]} / ${pair[1]}`,
    );
  }
}

async function collectCustomLayoutFailures(
  page,
  label,
  viewportName,
  warnings,
  failures,
) {
  const checks = await page
    .evaluate(() => {
      if (typeof window.__playgentCheckLayout !== "function") return [];
      const result = window.__playgentCheckLayout();
      if (!Array.isArray(result)) {
        return [{ message: "__playgentCheckLayout must return an array" }];
      }
      return result.map((entry) => {
        if (typeof entry === "string") return { message: entry };
        if (entry && typeof entry === "object") return entry;
        return { message: String(entry) };
      });
    })
    .catch((err) => [
      {
        message: `__playgentCheckLayout threw: ${err instanceof Error ? err.message : String(err)}`,
      },
    ]);

  for (const check of checks) {
    const message = check.message || JSON.stringify(check);
    const line = `[${viewportName}/${label}] ${message}`;
    if (check.severity === "warning") warnings.push(line);
    else failures.push(line);
  }
}

async function collectSoundFailures(page, label, viewportName, failures) {
  const soundFailures = await page.evaluate(() => {
    const failures = window.__playgentSoundFailures || [];
    window.__playgentSoundFailures = [];
    return failures;
  });
  for (const failure of soundFailures) {
    failures.push(`[${viewportName}/${label}] ${failure}`);
  }
}

async function runTest() {
  mkdirSync(screenshotDir, { recursive: true });
  const { server, url } = await startServer(testHtml);
  let browser;
  try {
    browser = await chromium.launch({ headless: !headed });
  } catch (err) {
    server.close();
    console.error(
      `BLOCKED: Could not launch Playwright browser: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(2);
  }

  const failures = [];
  const warnings = [];
  let screenshotCount = 0;

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => consoleErrors.push(err.message));

      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(usesPixi ? 1000 : 300);

      for (let i = 0; i < generated.snapshots.length; i++) {
        const snap = generated.snapshots[i];
        await page.evaluate(
          ({ view, legalActions, playerId, players, gameOver }) => {
            window.__playgentPush(
              view,
              legalActions,
              playerId,
              players,
              gameOver,
            );
          },
          snap,
        );
        await page.waitForTimeout(usesPixi ? 500 : 200);

        for (const selector of universalLandmarks) {
          const count = await page.locator(selector).count();
          if (count === 0) {
            const message = `[${viewport.name}/${snap.label}] missing universal landmark: ${selector}`;
            if (canvasOnly) warnings.push(message);
            else failures.push(message);
          }
        }

        await collectLayoutFailures(
          page,
          snap.label,
          viewport.name,
          warnings,
          failures,
        );
        await collectCustomLayoutFailures(
          page,
          snap.label,
          viewport.name,
          warnings,
          failures,
        );
        await collectSoundFailures(page, snap.label, viewport.name, failures);
        const screenshotPath = path.join(
          screenshotDir,
          `${viewport.name}-${String(i).padStart(2, "0")}-${snap.label}.png`,
        );
        await page.screenshot({ path: screenshotPath, fullPage: true });
        screenshotCount++;
      }

      await page.waitForTimeout(400);
      await collectSoundFailures(
        page,
        "delayed-sounds",
        viewport.name,
        failures,
      );
      for (const err of consoleErrors)
        failures.push(`[${viewport.name}] Console error: ${err}`);
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log("\n-------------------------------------------");
  console.log("  UI TEST REPORT");
  console.log("-------------------------------------------");
  console.log(`  Game:         ${manifest.name}`);
  console.log(`  Players:      ${playerCount}`);
  console.log(`  Seed:         ${baseSeed}`);
  console.log(
    `  Snapshots:    ${generated.snapshots.length}${originalSnapshotCount === generated.snapshots.length ? "" : ` of ${originalSnapshotCount}`}`,
  );
  console.log(`  Viewports:    ${viewports.map((v) => v.name).join(", ")}`);
  console.log(
    `  Screenshots:  ${screenshotCount} (in ${path.relative(process.cwd(), screenshotDir)}/)`,
  );
  if (usesPixi)
    console.log(`  PixiJS:       ${path.relative(process.cwd(), pixiLibPath)}`);
  if (warnings.length > 0) {
    console.log(`  Warnings:     ${warnings.length}`);
    for (const warning of warnings) console.log(`    - ${warning}`);
  }
  if (failures.length > 0) {
    console.log(`  Status:       FAIL (${failures.length} issue(s))`);
    for (const failure of failures) console.log(`    - ${failure}`);
  } else {
    console.log("  Status:       PASS");
  }
  console.log("-------------------------------------------\n");

  return failures.length === 0 ? 0 : 1;
}

console.log(
  `Generated ${generated.snapshots.length} snapshot(s)${originalSnapshotCount === generated.snapshots.length ? "" : ` from ${originalSnapshotCount}`} (${generated.actionCount} actions, seed ${baseSeed})`,
);
for (const snap of generated.snapshots) console.log(`  - ${snap.label}`);

process.exit(await runTest());
