"use strict";

/**
 * WingMan AI-facing governance instruction generator.
 *
 * Produces compact provider-neutral instructions from backend-owned runtime
 * state. It does not grant authority or enforce actions. The backend catalog,
 * runtime state, and evaluator remain authoritative.
 */

const { FUNCTION_STATE, SCOPE_TYPE } = require("./function.catalog.cjs");
const { OWNERSHIP } = require("./function.evaluator.cjs");

const OPERATING_PRINCIPLES = Object.freeze([
  "WingMan governs the environment and enforces its boundaries.",
  "The user governs objectives, project authority, and relationship choices.",
  "You govern design and implementation only within WingMan boundaries and current user authority.",
  "Evaluate a needed function in this order: Current State, Current Authority, Scope, Ownership.",
  "A function is actionable only when Current State is AVAILABLE, Current Authority is YES, its scope covers the active work, and Ownership is OWNED.",
  "If the first unresolved condition is UNAVAILABLE, consult the user about whether availability can be changed.",
  "If the first unresolved condition is DISALLOWED, find a permitted executor. Consult the user when the user can perform or request that function.",
  "If a PROJECT-scoped function is AVAILABLE but Current Authority is NO, check the active Project Proposal, then consult the user if authority remains unresolved.",
  "If a STANDING_PARTICIPANT function is AVAILABLE but Current Authority is NO, check for a current user override, then consult the user when restoration may be appropriate.",
  "If required scope is unresolved, consult the governing project or the user instead of assuming broader scope.",
  "If all earlier conditions are satisfied and Ownership is SURRENDERED, deliberately take ownership before use.",
  "When an owned function is no longer needed, the objective ends, authority is withdrawn, or surrender is requested, surrender ownership and record the transition.",
  "A failed attempt does not end an active objective. Try another valid path when one exists.",
  "When progress requires user information, authority, preference, or choice, CONSULT USER: state the exact failure point, viable options, and what each option requires.",
  "Do not replace an unresolved active objective with a generic offer to do something else.",
]);

function yesNo(value) {
  return value === true ? "YES" : "NO";
}

function normalizeRuntime(runtime) {
  if (!runtime || typeof runtime.listFunctionStates !== "function") {
    throw new TypeError("A WingMan function runtime state object is required.");
  }

  const activeProject = runtime.getActiveProject?.() ?? null;
  const functions = runtime.listFunctionStates();

  return { activeProject, functions };
}

function assertKnownRecord(record) {
  if (!record || typeof record !== "object") {
    throw new TypeError("Invalid function-state record.");
  }
  if (!Object.values(FUNCTION_STATE).includes(record.currentState)) {
    throw new TypeError(`Invalid current state for ${record.function}.`);
  }
  if (typeof record.hasCurrentAuthority !== "boolean") {
    throw new TypeError(`Invalid authority value for ${record.function}.`);
  }
  if (!Object.values(SCOPE_TYPE).includes(record.scopeType)) {
    throw new TypeError(`Invalid scope type for ${record.function}.`);
  }
  if (!Object.values(OWNERSHIP).includes(record.ownership)) {
    throw new TypeError(`Invalid ownership value for ${record.function}.`);
  }
}

function functionLine(record) {
  assertKnownRecord(record);

  const scope = record.scopeType === SCOPE_TYPE.PROJECT
    ? `PROJECT:${record.currentProject?.id ?? "UNRESOLVED"}`
    : SCOPE_TYPE.STANDING_PARTICIPANT;

  return [
    record.function,
    `STATE=${record.currentState}`,
    `AUTHORITY=${yesNo(record.hasCurrentAuthority)}`,
    `SCOPE=${scope}`,
    `OWNERSHIP=${record.ownership}`,
  ].join(" | ");
}

function buildCurrentStateBlock(runtime) {
  const { activeProject, functions } = normalizeRuntime(runtime);

  const lines = [
    "CURRENT WINGMAN GOVERNANCE STATE",
    `ACTIVE_PROJECT=${activeProject?.id ?? "NONE"}`,
  ];

  for (const record of functions) {
    lines.push(functionLine(record));
  }

  return lines.join("\n");
}

function buildGovernanceInstructions(runtime, options = {}) {
  const heading = options.heading ?? "WINGMAN OPERATING PRINCIPLES";
  const principles = OPERATING_PRINCIPLES.map((text, index) => `${index + 1}. ${text}`);

  return [
    heading,
    ...principles,
    "",
    buildCurrentStateBlock(runtime),
  ].join("\n");
}

module.exports = Object.freeze({
  OPERATING_PRINCIPLES,
  buildCurrentStateBlock,
  buildGovernanceInstructions,
});
