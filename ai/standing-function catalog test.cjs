"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  FUNCTION_STATE,
  SCOPE_TYPE,
  getAIFunction,
  listAIFunctions,
} = require("./governance/function.catalog.cjs");

function mayTakeOwnership(name) {
  const fn = getAIFunction(name);
  return Boolean(
    fn &&
    fn.currentState === FUNCTION_STATE.AVAILABLE &&
    fn.hasCurrentAuthority === true
  );
}

function applyTemporaryUserOverride(name, hasCurrentAuthority) {
  const fn = getAIFunction(name);
  if (!fn) return null;

  return {
    ...fn,
    hasCurrentAuthority,
  };
}

test("production catalog: expected standing function set is loaded", () => {
  assert.equal(listAIFunctions().length, 17);
});

test("catalog: core embodied participant functions begin available and authorized", () => {
  for (const name of [
    "enter_3d_environment",
    "move_in_3d_environment",
    "board_ai_drone",
    "use_vision",
  ]) {
    const fn = getAIFunction(name);
    assert.equal(fn.currentState, FUNCTION_STATE.AVAILABLE, name);
    assert.equal(fn.hasCurrentAuthority, true, name);
    assert.equal(fn.scopeType, SCOPE_TYPE.STANDING_PARTICIPANT, name);
  }
});

test("history: read is standing authority", () => {
  assert.equal(mayTakeOwnership("read_history"), true);
});

test("history: edit and delete are disallowed", () => {
  for (const name of ["edit_history", "delete_history"]) {
    const fn = getAIFunction(name);
    assert.equal(fn.currentState, FUNCTION_STATE.DISALLOWED, name);
    assert.equal(fn.hasCurrentAuthority, false, name);
    assert.equal(mayTakeOwnership(name), false, name);
  }
});

test("scratchpad: AI has standing working authority across its lifecycle", () => {
  for (const name of [
    "read_ai_scratchpad",
    "add_ai_scratchpad",
    "revise_ai_scratchpad",
    "reorganize_ai_scratchpad",
    "compile_ai_scratchpad",
    "delete_ai_scratchpad",
  ]) {
    assert.equal(mayTakeOwnership(name), true, name);
  }
});

test("relationship: read, add, and ordinary maintenance are standing authority", () => {
  for (const name of [
    "read_relationship_state",
    "add_relationship_state",
    "maintain_relationship_state",
  ]) {
    assert.equal(mayTakeOwnership(name), true, name);
  }
});

test("relationship: major restructuring is available but lacks standing authority", () => {
  const fn = getAIFunction("restructure_relationship_state");
  assert.equal(fn.currentState, FUNCTION_STATE.AVAILABLE);
  assert.equal(fn.hasCurrentAuthority, false);
  assert.equal(mayTakeOwnership("restructure_relationship_state"), false);
});

test("isolation: scratchpad authority does not grant relationship restructuring authority", () => {
  assert.equal(mayTakeOwnership("reorganize_ai_scratchpad"), true);
  assert.equal(mayTakeOwnership("restructure_relationship_state"), false);
});

test("temporary override: 3D authority may be turned off without changing availability", () => {
  const overridden = applyTemporaryUserOverride("enter_3d_environment", false);
  assert.equal(overridden.currentState, FUNCTION_STATE.AVAILABLE);
  assert.equal(overridden.hasCurrentAuthority, false);
});

test("temporary override: one standing function does not silently alter another", () => {
  const overridden = applyTemporaryUserOverride("enter_3d_environment", false);
  const vision = getAIFunction("use_vision");

  assert.equal(overridden.hasCurrentAuthority, false);
  assert.equal(vision.hasCurrentAuthority, true);
});

test("catalog: unknown function receives no standing authority", () => {
  assert.equal(getAIFunction("invented_function"), null);
  assert.equal(mayTakeOwnership("invented_function"), false);
});
