"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { FUNCTION_STATE } = require("./governance/function.catalog.cjs");
const { OWNERSHIP, FAILED_CONDITION, NEXT_ACTION } = require("./governance/function.evaluator.cjs");
const { createFunctionRuntimeState } = require("./governance/function.runtime-state.cjs");

const PROJECT_A = Object.freeze({ id: "project-a", name: "Project A" });
const PROJECT_B = Object.freeze({ id: "project-b", name: "Project B" });

test("runtime seeds known standing functions as surrendered", () => {
  const runtime = createFunctionRuntimeState();
  const state = runtime.getFunctionState("enter_3d_environment");
  assert.equal(state.currentState, FUNCTION_STATE.AVAILABLE);
  assert.equal(state.hasCurrentAuthority, true);
  assert.equal(state.ownership, OWNERSHIP.SURRENDERED);
});

test("standing function can be claimed when available and authorized", () => {
  const runtime = createFunctionRuntimeState();
  const result = runtime.claimOwnership("enter_3d_environment");
  assert.equal(result.changed, true);
  assert.equal(runtime.getFunctionState("enter_3d_environment").ownership, OWNERSHIP.OWNED);
  assert.equal(runtime.evaluate("enter_3d_environment").actionable, true);
});

test("temporary user override removes authority and automatically surrenders ownership", () => {
  const runtime = createFunctionRuntimeState();
  runtime.claimOwnership("enter_3d_environment");
  runtime.applyUserAuthorityOverride("enter_3d_environment", false, { reason: "USER_REQUEST" });
  const state = runtime.getFunctionState("enter_3d_environment");
  assert.equal(state.currentState, FUNCTION_STATE.AVAILABLE);
  assert.equal(state.hasCurrentAuthority, false);
  assert.equal(state.ownership, OWNERSHIP.SURRENDERED);
  assert.equal(runtime.evaluate("enter_3d_environment").failedCondition, FAILED_CONDITION.NO_CURRENT_AUTHORITY);
});

test("clearing standing override restores baseline authority but not ownership", () => {
  const runtime = createFunctionRuntimeState();
  runtime.claimOwnership("enter_3d_environment");
  runtime.applyUserAuthorityOverride("enter_3d_environment", false, { reason: "USER_REQUEST" });
  runtime.clearUserAuthorityOverride("enter_3d_environment");
  const state = runtime.getFunctionState("enter_3d_environment");
  assert.equal(state.hasCurrentAuthority, true);
  assert.equal(state.ownership, OWNERSHIP.SURRENDERED);
  assert.equal(runtime.evaluate("enter_3d_environment").nextAction, NEXT_ACTION.TAKE_OWNERSHIP);
});

test("override of 3D entry does not alter vision authority", () => {
  const runtime = createFunctionRuntimeState();
  runtime.applyUserAuthorityOverride("enter_3d_environment", false);
  assert.equal(runtime.getFunctionState("enter_3d_environment").hasCurrentAuthority, false);
  assert.equal(runtime.getFunctionState("use_vision").hasCurrentAuthority, true);
});

test("DISALLOWED history editing cannot be granted authority", () => {
  const runtime = createFunctionRuntimeState();
  assert.throws(
    () => runtime.setCurrentAuthority("edit_history", true),
    /DISALLOWED/
  );
});

test("DISALLOWED state forces authority NO and ownership SURRENDERED", () => {
  const runtime = createFunctionRuntimeState();
  runtime.claimOwnership("read_history");
  runtime.setCurrentState("read_history", FUNCTION_STATE.DISALLOWED, "TEST");
  const state = runtime.getFunctionState("read_history");
  assert.equal(state.hasCurrentAuthority, false);
  assert.equal(state.ownership, OWNERSHIP.SURRENDERED);
});

test("unknown function cannot silently acquire runtime state", () => {
  const runtime = createFunctionRuntimeState();
  assert.throws(
    () => runtime.getFunctionState("invented_function"),
    /Unknown WingMan function/
  );
});

test("stable project identity requires an ID", () => {
  const runtime = createFunctionRuntimeState();
  assert.throws(
    () => runtime.setActiveProject({ name: "No ID Project" }),
    /stable id/
  );
});

test("release ownership deliberately returns function to SURRENDERED and logs it", () => {
  const runtime = createFunctionRuntimeState();
  runtime.claimOwnership("use_vision");
  runtime.releaseOwnership("use_vision", "TASK_COMPLETE");
  assert.equal(runtime.getFunctionState("use_vision").ownership, OWNERSHIP.SURRENDERED);
  const events = runtime.getEventLog();
  assert.ok(events.some((event) => event.event === "FUNCTION_OWNERSHIP_SURRENDERED" && event.reason === "TASK_COMPLETE"));
});

// The production catalog currently contains standing functions only.
// These transition tests still verify project switching at the runtime layer by
// exercising active-project identity itself; project-scoped function records
// will be tested as soon as project functions are added to the catalog.
test("active project can switch by stable ID without changing standing-function scope", () => {
  const runtime = createFunctionRuntimeState({ activeProject: PROJECT_A });
  assert.equal(runtime.getActiveProject().id, PROJECT_A.id);
  runtime.setActiveProject(PROJECT_B);
  assert.equal(runtime.getActiveProject().id, PROJECT_B.id);

  runtime.claimOwnership("enter_3d_environment");
  assert.equal(runtime.evaluate("enter_3d_environment").actionable, true);
});

test("clearing active project does not disable standing-participant functions", () => {
  const runtime = createFunctionRuntimeState({ activeProject: PROJECT_A });
  runtime.clearActiveProject();
  runtime.claimOwnership("use_vision");
  assert.equal(runtime.getActiveProject(), null);
  assert.equal(runtime.evaluate("use_vision").actionable, true);
});
