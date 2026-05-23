export function createSeededRandom(seed) {
  let state = seed | 0;

  function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function integer(min, max) {
    if (min > max) throw new Error(`integer(): min (${min}) > max (${max})`);
    return Math.floor(next() * (max - min + 1)) + min;
  }

  function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = integer(0, i);
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function pick(array) {
    if (array.length === 0)
      throw new Error("pick(): cannot pick from empty array");
    return array[integer(0, array.length - 1)];
  }

  return { next, integer, shuffle, pick };
}

export function unwrapDecisionOption(option) {
  if (
    option &&
    typeof option === "object" &&
    "decision" in option &&
    ("schema" in option || "label" in option || "required" in option)
  ) {
    return option.decision;
  }
  return option;
}

export function outcomeWinners(outcome) {
  if (!outcome) return [];
  if (Array.isArray(outcome.playerIds)) return outcome.playerIds;
  return [];
}

export function isPlatformLifecycleAction(action) {
  if (!action || typeof action !== "object") return false;
  return action.type === "start_game" || action.type === "restart_game";
}

export class GameEngine {
  constructor(game, players, config, seed, teamAssignments) {
    this.game = game;
    this.players = players;
    this.config = config;
    this.actionLog = [];
    this.sourceLogLength = 0;
    this.state = game.setup({
      players,
      config,
      random: createSeededRandom(seed),
      seed,
      ...(teamAssignments ? { teamAssignments } : {}),
    });
  }

  processAction(playerId, action, timestamp) {
    this.state = this.game.apply(this.state, playerId, action);
    this.actionLog.push({
      playerId,
      action,
      timestamp: timestamp ?? Date.now(),
    });
    this.sourceLogLength++;
  }

  getState() {
    return typeof this.game.getLiveState === "function"
      ? this.game.getLiveState()
      : this.state;
  }

  getProjection(playerId) {
    return this.game.project(this.state, playerId);
  }

  getView(playerId) {
    return this.getProjection(playerId).view;
  }

  getActions(playerId) {
    return this.getOpportunities(playerId).flatMap((opportunity) => {
      const decision = opportunity?.decision;
      if (!decision) return [];
      if (decision.type === "choose" && Array.isArray(decision.options))
        return decision.options;
      if (decision.type === "schema")
        return [{ decision: decision.template ?? {}, schema: decision.schema }];
      if (decision.type === "orders")
        return [
          { decision: {}, schema: decision.schema, label: opportunity.prompt },
        ];
      return [];
    });
  }

  getResult() {
    return this.game.outcome(this.state);
  }

  getTurnConfig(playerId) {
    const opportunities =
      playerId === null
        ? this.getOpportunities("__system__")
        : this.getOpportunities(playerId);
    for (const opportunity of opportunities) {
      if (!opportunity?.deadline) continue;
      const config = {};
      if (opportunity.deadline.timeoutMs != null)
        config.timeoutMs = opportunity.deadline.timeoutMs;
      if (opportunity.deadline.onExpire != null)
        config.onExpire = opportunity.deadline.onExpire;
      return Object.keys(config).length > 0 ? config : null;
    }
    return null;
  }

  getActionLog() {
    return [...this.actionLog];
  }

  getOpportunities(playerId) {
    const result = this.game.opportunities(this.state, playerId, {
      actorId: playerId,
    });
    if (Array.isArray(result)) return result;
    return result ? [result] : [];
  }
}

export function validateProjectionShape(projection, label, _options = {}) {
  const errors = [];
  if (
    !projection ||
    typeof projection !== "object" ||
    Array.isArray(projection)
  ) {
    return [`${label}: project() must return an object`];
  }
  if (
    !("view" in projection) ||
    projection.view === null ||
    typeof projection.view !== "object" ||
    Array.isArray(projection.view)
  ) {
    errors.push(`${label}: project().view must be an object`);
  }
  for (const key of [
    "actions",
    "result",
    "timeoutMs",
    "defaultAction",
    "currentPlayerId",
  ]) {
    if (projection[key] !== undefined) {
      errors.push(
        `${label}: project().${key} belongs in opportunities() or outcome(), not project()`,
      );
    }
  }
  if (projection.textBoard !== undefined) {
    errors.push(
      `${label}: project().textBoard is no longer supported; use agentView`,
    );
  }
  if (projection.agent !== undefined) {
    if (
      projection.agent === null ||
      typeof projection.agent !== "object" ||
      Array.isArray(projection.agent)
    ) {
      errors.push(`${label}: project().agent must be an object`);
    } else {
      const allowedAgentKeys = new Set(["tools"]);
      for (const key of Object.keys(projection.agent)) {
        if (!allowedAgentKeys.has(key) && key !== "next") {
          errors.push(`${label}: project().agent.${key} is not supported`);
        }
      }
      if (projection.agent.next !== undefined) {
        errors.push(
          `${label}: project().agent.next is not supported; put mechanical game facts in agentView, opportunity prompts, labels, or schemas`,
        );
      }
      if (projection.agent.tools !== undefined) {
        if (
          projection.agent.tools === null ||
          typeof projection.agent.tools !== "object" ||
          Array.isArray(projection.agent.tools)
        ) {
          errors.push(
            `${label}: project().agent.tools must be an object when present`,
          );
        } else {
          const allowedTools = new Set([
            "poll_state",
            "submit_action",
            "send_message",
          ]);
          const allowedIntent = new Set(["auto", "hidden"]);
          for (const [tool, intent] of Object.entries(projection.agent.tools)) {
            if (!allowedTools.has(tool)) {
              errors.push(
                `${label}: project().agent.tools.${tool} is not a supported tool name`,
              );
            }
            if (!allowedIntent.has(intent)) {
              errors.push(
                `${label}: project().agent.tools.${tool} must be "auto" or "hidden"`,
              );
            }
          }
        }
      }
    }
  }
  return errors;
}
