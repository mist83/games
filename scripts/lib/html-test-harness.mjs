import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { PLATFORM_SOUND_IDS } from "./platform-sounds.mjs";

export function readAdditionalFiles(gameDir, manifest) {
  const additionalFiles = {};
  for (const filename of manifest.files ?? []) {
    const filePath = path.join(gameDir, filename);
    if (!existsSync(filePath)) {
      throw new Error(
        `manifest.files declares '${filename}' but the file is missing`,
      );
    }
    additionalFiles[filename] = readFileSync(filePath, "utf8");
  }
  return additionalFiles;
}

export function buildTestHtml(params) {
  const { rawHtml, additionalFiles, usesPixi, hasPixiLib } = params;
  const styleRegex = /<style[^>]*>[\s\S]*?<\/style>/gi;
  const scriptRegex = /<script[^>]*>[\s\S]*?<\/script>/gi;
  const styles = (rawHtml.match(styleRegex) || []).join("\n");
  const scripts = (rawHtml.match(scriptRegex) || []).join("\n");

  let bodyContent = rawHtml.replace(styleRegex, "").replace(scriptRegex, "");
  bodyContent = bodyContent
    .replace(/<\/?(html|head|body|!doctype)[^>]*>/gi, "")
    .trim();

  const additionalCss = [];
  const additionalJs = [];
  for (const [filename, content] of Object.entries(additionalFiles)) {
    const text = typeof content === "string" ? content : "";
    if (filename.endsWith(".css")) {
      additionalCss.push(`<style>/* ${filename} */\n${text}</style>`);
    } else if (filename.endsWith(".js")) {
      const cleaned = text
        .replace(/^\s*export\s+default\s+\w+\s*;?\s*$/gm, "")
        .replace(/^\s*export\s+\{[^}]*\}\s*;?\s*$/gm, "");
      additionalJs.push(`<script>/* ${filename} */\n${cleaned}</script>`);
    }
  }

  const pixiTag =
    usesPixi && hasPixiLib ? '<script src="/lib/pixi.min.js"></script>' : "";
  const platformSoundIds = JSON.stringify(PLATFORM_SOUND_IDS);
  const mockPlaygent = `
const __playgentPlatformSoundIds = new Set(${platformSoundIds});
window.__playgentSoundFailures = [];
function __playgentRecordSoundFailure(message) {
  window.__playgentSoundFailures.push(message);
}
window.playgent = {
  _stateChangeCb: null,
  _actionCb: null,
  onStateChange: function(cb) { window.playgent._stateChangeCb = cb; },
  onAction: function(cb) { window.playgent._actionCb = cb; },
  submitAction: function(action) { window.__lastAction = action; },
  sound: function(soundId) {
    if (arguments.length !== 1) {
      __playgentRecordSoundFailure("playgent.sound expects exactly one sound ID argument");
      return;
    }
    if (typeof soundId !== "string") {
      __playgentRecordSoundFailure("playgent.sound expects a string sound ID");
      return;
    }
    if (!__playgentPlatformSoundIds.has(soundId)) {
      __playgentRecordSoundFailure("unknown platform sound ID: " + soundId);
    }
  },
  toast: function() {},
  get teamAssignments() { return undefined; }
};
window.__playgentPush = function(view, legalActions, playerId, players, gameOver) {
  if (!window.playgent._stateChangeCb) return;
  window.playgent._stateChangeCb(view, legalActions, {
    myId: playerId,
    players: players,
    isMyTurn: legalActions.length > 0,
    currentPlayerId: legalActions.length > 0 ? playerId : null,
    gameOver: gameOver
  });
};
`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${styles}
${additionalCss.join("\n")}
${pixiTag}
</head>
<body>
${bodyContent}
<script>${mockPlaygent}</script>
${additionalJs.join("\n")}
${scripts}
</body>
</html>`;
}
