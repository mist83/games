import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

function stripTestExports(source) {
  return source
    .replace(/^\s*export\s+default\s+GameLogic\s*;?\s*$/gm, "")
    .replace(
      /^\s*export\s*\{\s*GameLogic\s*(?:as\s+default\s*)?\}\s*;?\s*$/gm,
      "",
    );
}

function createBlockedFunction(name) {
  return function blocked() {
    throw new Error(`${name} is not available in game.js logic`);
  };
}

export function loadGameLogic(gameDir) {
  const gameJsPath = path.join(gameDir, "game.js");
  const rawSource = readFileSync(gameJsPath, "utf8");
  if (/^\s*import\s/m.test(rawSource)) {
    throw new Error(
      "game.js must be classic platform-loadable JavaScript; import statements are not allowed",
    );
  }

  const source = stripTestExports(rawSource);
  const context = {
    console,
    setTimeout: createBlockedFunction("setTimeout"),
    clearTimeout: createBlockedFunction("clearTimeout"),
    setInterval: createBlockedFunction("setInterval"),
    clearInterval: createBlockedFunction("clearInterval"),
    Math: Object.create(Math, {
      random: {
        value: createBlockedFunction("Math.random"),
        writable: false,
        configurable: false,
      },
    }),
    Date: class FrozenDate extends Date {
      constructor(...args) {
        super(...(args.length > 0 ? args : [0]));
      }
      static now() {
        return 0;
      }
    },
    fetch: createBlockedFunction("fetch"),
    XMLHttpRequest: createBlockedFunction("XMLHttpRequest"),
    eval: createBlockedFunction("eval"),
    Function: createBlockedFunction("Function"),
  };
  context.globalThis = context;

  try {
    vm.runInNewContext(source, context, {
      filename: gameJsPath,
      timeout: 5000,
      displayErrors: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to evaluate game.js: ${message}`);
  }

  const gameLogic = context.GameLogic ?? null;

  if (!gameLogic || typeof gameLogic !== "object") {
    throw new Error("game.js did not define `var GameLogic = {...}`");
  }
  for (const key of ["setup", "apply", "project", "opportunities", "outcome"]) {
    if (typeof gameLogic[key] !== "function") {
      throw new Error(`GameLogic.${key} must be a function`);
    }
  }

  return gameLogic;
}
