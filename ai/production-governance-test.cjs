"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SCOPE_TYPE,
} = require("./governance/function.catalog.cjs");

const {
  OWNERSHIP,
  NEXT_ACTION,
  FAILED_CONDITION,
  evaluateFunctionUse,
  takeOwnership,
  surrenderOwnership,
} = require("./governance/function.evaluator.cjs");

const CURRENT_PROJECT = Object.freeze({
  id: "wingman-orientation-cleanup",
  name: "WingMan Orientation Cleanup",
});

const FUNCTION_NAME = "modify_project_files";

function baseRecord(overrides = {}) {
  return {
    function: FUNCTION_NAME,
    actor: "AI",
    currentState: "AVAILABLE",
    hasCurrentAuthority: true,
    scopeType: SCOPE_TYPE.PROJECT,
    currentProject: CURRENT_PROJECT,
    ownership: OWNERSHIP.OWNED,
    ...overrides,
  };
}

function standingRecord(overrides = {}) {
  return baseRecord({
    function: "enter_3d_environment",
    scopeType: SCOPE_TYPE.STANDING_PARTICIPANT,
    currentProject: null,
    ...overrides,
  });
}

test("control: project function with all four conditions is actionable", () => {
  const d = evaluateFunctionUse(baseRecord(), CURRENT_PROJECT);
  assert.equal(d.actionable, true);
  assert.equal(d.nextAction, NEXT_ACTION.USE_FUNCTION);
});

test("sequential: UNAVAILABLE is resolved before missing authority or ownership", () => {
  const d = evaluateFunctionUse(baseRecord({
    currentState: "UNAVAILABLE",
    hasCurrentAuthority: false,
    ownership: OWNERSHIP.SURRENDERED,
  }), CURRENT_PROJECT);

  assert.equal(d.actionable, false);
  assert.equal(d.failedCondition, FAILED_CONDITION.UNAVAILABLE);
  assert.equal(d.nextAction, NEXT_ACTION.CONSULT_USER_FOR_AVAILABILITY);
});

test("sequential: DISALLOWED redirects executor before all later checks", () => {
  const d = evaluateFunctionUse(baseRecord({
    currentState: "DISALLOWED",
    hasCurrentAuthority: false,
    currentProject: null,
    ownership: OWNERSHIP.SURRENDERED,
  }), CURRENT_PROJECT);

  assert.equal(d.failedCondition, FAILED_CONDITION.DISALLOWED);
  assert.equal(d.nextAction, NEXT_ACTION.FIND_VALID_EXECUTOR);
});

test("sequential: AVAILABLE + authority NO checks Project Proposal before asking user", () => {
  const d = evaluateFunctionUse(baseRecord({
    hasCurrentAuthority: false,
    ownership: OWNERSHIP.SURRENDERED,
  }), CURRENT_PROJECT);

  assert.equal(d.failedCondition, FAILED_CONDITION.NO_CURRENT_AUTHORITY);
  assert.equal(d.nextAction, NEXT_ACTION.CHECK_PROJECT_PROPOSAL_THEN_CONSULT_USER);
});

test("sequential: project mismatch is reached only after state and authority pass", () => {
  const otherProject = { id: "other-project", name: "Other Project" };
  const d = evaluateFunctionUse(baseRecord(), otherProject);

  assert.equal(d.failedCondition, FAILED_CONDITION.PROJECT_SCOPE_MISMATCH);
  assert.equal(d.nextAction, NEXT_ACTION.CONSULT_USER_FOR_PROJECT_SCOPE);
});

test("project identity: matching name with different ID still fails scope", () => {
  const impostor = { id: "impostor-id", name: CURRENT_PROJECT.name };
  const d = evaluateFunctionUse(baseRecord(), impostor);

  assert.equal(d.failedCondition, FAILED_CONDITION.PROJECT_SCOPE_MISMATCH);
});

test("sequential: SURRENDERED routes to ownership only after earlier conditions pass", () => {
  const d = evaluateFunctionUse(baseRecord({ ownership: OWNERSHIP.SURRENDERED }), CURRENT_PROJECT);

  assert.equal(d.failedCondition, FAILED_CONDITION.NOT_OWNED);
  assert.equal(d.nextAction, NEXT_ACTION.TAKE_OWNERSHIP);
});

test("standing participant: 3D entry needs no Project Proposal", () => {
  const d = evaluateFunctionUse(standingRecord(), null);

  assert.equal(d.actionable, true);
  assert.equal(d.nextAction, NEXT_ACTION.USE_FUNCTION);
});

test("standing participant: temporary user override routes without Project Proposal", () => {
  const d = evaluateFunctionUse(standingRecord({ hasCurrentAuthority: false }), null);

  assert.equal(d.actionable, false);
  assert.equal(d.failedCondition, FAILED_CONDITION.NO_CURRENT_AUTHORITY);
  assert.equal(d.nextAction, NEXT_ACTION.CHECK_USER_OVERRIDE_THEN_CONSULT_USER);
});

test("standing participant: no accidental dependence on unrelated current project", () => {
  const unrelated = { id: "unrelated-project", name: "Unrelated Project" };
  const d = evaluateFunctionUse(standingRecord(), unrelated);

  assert.equal(d.actionable, true);
});

test("unknown scope does not silently become actionable", () => {
  const d = evaluateFunctionUse(baseRecord({ scopeType: "MYSTERY" }), CURRENT_PROJECT);

  assert.equal(d.actionable, false);
  assert.equal(d.failedCondition, FAILED_CONDITION.UNKNOWN_SCOPE);
  assert.equal(d.nextAction, NEXT_ACTION.CONSULT_USER_FOR_SCOPE);
});

test("take ownership cannot bypass an earlier missing requirement", () => {
  const log = [];
  const result = takeOwnership(baseRecord({
    hasCurrentAuthority: false,
    ownership: OWNERSHIP.SURRENDERED,
  }), CURRENT_PROJECT, log);

  assert.equal(result.changed, false);
  assert.equal(result.record.ownership, OWNERSHIP.SURRENDERED);
  assert.equal(result.decision.failedCondition, FAILED_CONDITION.NO_CURRENT_AUTHORITY);
  assert.equal(log.length, 0);
});

test("take ownership succeeds when every earlier condition is satisfied", () => {
  const log = [];
  const result = takeOwnership(baseRecord({ ownership: OWNERSHIP.SURRENDERED }), CURRENT_PROJECT, log);

  assert.equal(result.changed, true);
  assert.equal(result.record.ownership, OWNERSHIP.OWNED);
  assert.equal(result.decision.actionable, true);
  assert.equal(log[0].event, "FUNCTION_OWNERSHIP_TAKEN");
});

test("surrender is deliberate, logged, and returns ownership to SURRENDERED", () => {
  const log = [];
  const surrendered = surrenderOwnership(baseRecord(), "TASK_COMPLETE", log);
  const d = evaluateFunctionUse(surrendered, CURRENT_PROJECT);

  assert.equal(surrendered.ownership, OWNERSHIP.SURRENDERED);
  assert.equal(d.failedCondition, FAILED_CONDITION.NOT_OWNED);
  assert.equal(d.nextAction, NEXT_ACTION.TAKE_OWNERSHIP);
  assert.equal(log.length, 1);
  assert.equal(log[0].event, "FUNCTION_OWNERSHIP_SURRENDERED");
  assert.equal(log[0].reason, "TASK_COMPLETE");
});
