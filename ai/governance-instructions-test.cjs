"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { FUNCTION_STATE } = require("./governance/function.catalog.cjs");
const { createFunctionRuntimeState } = require("./governance/function.runtime-state.cjs");
const {
  OPERATING_PRINCIPLES,
  buildCurrentStateBlock,
  buildGovernanceInstructions,
} = require("./governance/governance.instructions.cjs");

const PROJECT_A = Object.freeze({ id: "project-a", name: "Project A" });
const PROJECT_B = Object.freeze({ id: "project-b", name: "Project B" });

function lineFor(text, functionId) {
  return text.split("\n").find((line) => line.startsWith(`${functionId} |`)) ?? null;
}

test("stable principles are present exactly once in generated instructions", () => {
  const runtime = createFunctionRuntimeState();
  const text = buildGovernanceInstructions(runtime);

  for (const principle of OPERATING_PRINCIPLES) {
    const escaped = principle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = text.match(new RegExp(escaped, "g")) ?? [];
    assert.equal(matches.length, 1, principle);
  }
});

test("initial state reports no active project", () => {
  const runtime = createFunctionRuntimeState();
  const state = buildCurrentStateBlock(runtime);
  assert.match(state, /^CURRENT WINGMAN GOVERNANCE STATE/m);
  assert.match(state, /^ACTIVE_PROJECT=NONE$/m);
});

test("standing function initially reports AVAILABLE, YES, standing scope, SURRENDERED", () => {
  const runtime = createFunctionRuntimeState();
  const line = lineFor(buildCurrentStateBlock(runtime), "enter_3d_environment");

  assert.ok(line);
  assert.match(line, /STATE=AVAILABLE/);
  assert.match(line, /AUTHORITY=YES/);
  assert.match(line, /SCOPE=STANDING_PARTICIPANT/);
  assert.match(line, /OWNERSHIP=SURRENDERED/);
});

test("claiming ownership changes only the ownership presented to the AI", () => {
  const runtime = createFunctionRuntimeState();
  const before = lineFor(buildCurrentStateBlock(runtime), "use_vision");
  runtime.claimOwnership("use_vision");
  const after = lineFor(buildCurrentStateBlock(runtime), "use_vision");

  assert.match(before, /STATE=AVAILABLE/);
  assert.match(before, /AUTHORITY=YES/);
  assert.match(before, /OWNERSHIP=SURRENDERED/);
  assert.match(after, /STATE=AVAILABLE/);
  assert.match(after, /AUTHORITY=YES/);
  assert.match(after, /OWNERSHIP=OWNED/);
});

test("temporary user override is reflected as authority NO and surrendered ownership", () => {
  const runtime = createFunctionRuntimeState();
  runtime.claimOwnership("enter_3d_environment");
  runtime.applyUserAuthorityOverride("enter_3d_environment", false, { reason: "USER_REQUEST" });

  const line = lineFor(buildCurrentStateBlock(runtime), "enter_3d_environment");
  assert.match(line, /STATE=AVAILABLE/);
  assert.match(line, /AUTHORITY=NO/);
  assert.match(line, /OWNERSHIP=SURRENDERED/);
});

test("clearing override restores authority YES without silently restoring ownership", () => {
  const runtime = createFunctionRuntimeState();
  runtime.claimOwnership("enter_3d_environment");
  runtime.applyUserAuthorityOverride("enter_3d_environment", false);
  runtime.clearUserAuthorityOverride("enter_3d_environment");

  const line = lineFor(buildCurrentStateBlock(runtime), "enter_3d_environment");
  assert.match(line, /AUTHORITY=YES/);
  assert.match(line, /OWNERSHIP=SURRENDERED/);
});

test("DISALLOWED history editing is presented as DISALLOWED, NO, SURRENDERED", () => {
  const runtime = createFunctionRuntimeState();
  const line = lineFor(buildCurrentStateBlock(runtime), "edit_history");

  assert.match(line, /STATE=DISALLOWED/);
  assert.match(line, /AUTHORITY=NO/);
  assert.match(line, /OWNERSHIP=SURRENDERED/);
});

test("runtime state change from AVAILABLE to UNAVAILABLE appears in generated state", () => {
  const runtime = createFunctionRuntimeState();
  runtime.setCurrentState("use_vision", FUNCTION_STATE.UNAVAILABLE, "DEVICE_OFFLINE");

  const line = lineFor(buildCurrentStateBlock(runtime), "use_vision");
  assert.match(line, /STATE=UNAVAILABLE/);
});

test("active project changes are rendered using stable project ID", () => {
  const runtime = createFunctionRuntimeState({ activeProject: PROJECT_A });
  let state = buildCurrentStateBlock(runtime);
  assert.match(state, /^ACTIVE_PROJECT=project-a$/m);

  runtime.setActiveProject(PROJECT_B);
  state = buildCurrentStateBlock(runtime);
  assert.match(state, /^ACTIVE_PROJECT=project-b$/m);
  assert.doesNotMatch(state, /^ACTIVE_PROJECT=Project B$/m);
});

test("standing function remains standing-scoped when an unrelated project becomes active", () => {
  const runtime = createFunctionRuntimeState({ activeProject: PROJECT_A });
  const line = lineFor(buildCurrentStateBlock(runtime), "board_ai_drone");

  assert.match(line, /SCOPE=STANDING_PARTICIPANT/);
  assert.doesNotMatch(line, /SCOPE=PROJECT:/);
});

test("generator reports relationship restructuring as available but currently unauthorized", () => {
  const runtime = createFunctionRuntimeState();
  const line = lineFor(buildCurrentStateBlock(runtime), "restructure_relationship_state");

  assert.match(line, /STATE=AVAILABLE/);
  assert.match(line, /AUTHORITY=NO/);
  assert.match(line, /OWNERSHIP=SURRENDERED/);
});

test("generator rejects a non-runtime object instead of inventing state", () => {
  assert.throws(
    () => buildGovernanceInstructions({}),
    /runtime state object is required/
  );
});

test("full generated instruction includes failure persistence and CONSULT USER guidance", () => {
  const runtime = createFunctionRuntimeState();
  const text = buildGovernanceInstructions(runtime);

  assert.match(text, /A failed attempt does not end an active objective/);
  assert.match(text, /CONSULT USER/);
  assert.match(text, /Do not replace an unresolved active objective with a generic offer/);
});
test("generated governance state exposes Partition read and history append authority", () => {
  const runtime = createFunctionRuntimeState();
  const output = buildCurrentStateBlock(runtime);

  assert.match(
    output,
    /read_partition \| STATE=AVAILABLE \| AUTHORITY=YES \| SCOPE=STANDING_PARTICIPANT \| OWNERSHIP=SURRENDERED/
  );

  assert.match(
    output,
    /append_history \| STATE=AVAILABLE \| AUTHORITY=YES \| SCOPE=STANDING_PARTICIPANT \| OWNERSHIP=SURRENDERED/
  );
});