"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

const PIPELINE_PATH = path.resolve(__dirname, "ai.pipeline.cjs");

function loadPipeline() {
  const gatewaySuffix = path.normalize("partition/api/active-partition.gateway.cjs");
  const originalLoad = Module._load;

  const gateway = {
    activate({ sessionId }) {
      return {
        ok: true,
        sessionId,
        capability: "ACTIVE_PARTITION",
        state: "available",
        operations: ["read", "write"]
      };
    },
    deactivate({ sessionId }) {
      return { ok: true, sessionId, state: "inactive" };
    }
  };

  Module._load = function patchedLoad(request, parent, isMain) {
    try {
      const resolved = Module._resolveFilename(request, parent, isMain);
      if (path.normalize(resolved).endsWith(gatewaySuffix)) return gateway;
    } catch (_) {}
    return originalLoad.apply(this, arguments);
  };

  delete require.cache[PIPELINE_PATH];
  let pipeline;
  try {
    pipeline = require(PIPELINE_PATH);
  } finally {
    Module._load = originalLoad;
  }
  return pipeline;
}

function connectReadyForIntroduction(pipeline, overrides = {}) {
  return pipeline.connect({
    provider: "openai",
    model: "test-model",
    params: {},
    localContext: {
      partitionId: "partition-test",
      ...overrides
    }
  });
}

function completeIntroduction(pipeline, sessionId) {
  const begun = pipeline.beginIntroduction({ sessionId, preferredName: "Constance" });
  assert.equal(begun.ok, true);
  return pipeline.completeIntroduction({
    sessionId,
    turnId: begun.operation.turnId,
    reply: "Hello, Constance."
  });
}

test("pipeline exports no old orientation or persistence API", () => {
  const pipeline = loadPipeline();
  for (const obsolete of [
    "advanceOrientation",
    "submitPersistenceResult",
    "currentOperation",
    "PERSIST_BOARDING_SNAPSHOT",
    "PERSIST_ORIENTATION_NOTES",
    "PERSIST_PLATFORM_CONTINUITY",
    "PERSISTENCE_PHASES"
  ]) {
    assert.equal(Object.hasOwn(pipeline, obsolete), false, obsolete);
  }
});

test("connect admits directly to ready_for_introduction", () => {
  const pipeline = loadPipeline();
  const result = connectReadyForIntroduction(pipeline);
  assert.equal(result.ok, true);
  assert.equal(result.admitted, true);
  assert.equal(result.active, true);
  assert.equal(result.state, "ready_for_introduction");
  assert.equal(result.partitionId, "partition-test");
  assert.ok(result.activePartition);
  assert.match(result.governanceInstructions, /WINGMAN OPERATING PRINCIPLES/);
  assert.equal(typeof result.admissionDurationMs, "number");
});

test("connect requires Partition identity", () => {
  const pipeline = loadPipeline();
  const result = pipeline.connect({ localContext: {} });
  assert.equal(result.ok, false);
  assert.match(result.error, /active Partition/);
});

test("introduction receives current governance instructions", () => {
  const pipeline = loadPipeline();
  const connected = connectReadyForIntroduction(pipeline);
  const begun = pipeline.beginIntroduction({ sessionId: connected.sessionId, preferredName: "Constance" });
  assert.equal(begun.ok, true);
  const system = begun.operation.messages[0].content;
  assert.match(system, /WINGMAN OPERATING PRINCIPLES/);
  assert.match(system, /enter_3d_environment \| STATE=AVAILABLE \| AUTHORITY=YES/);
  assert.match(system, /Introduce yourself naturally and briefly/);
});

test("successful introduction makes session ready", () => {
  const pipeline = loadPipeline();
  const connected = connectReadyForIntroduction(pipeline);
  const completed = completeIntroduction(pipeline, connected.sessionId);
  assert.equal(completed.ok, true);
  assert.equal(completed.state, "ready");
  assert.equal(completed.introduction, "Hello, Constance.");
});

test("chat is blocked until introduction completes", () => {
  const pipeline = loadPipeline();
  const connected = connectReadyForIntroduction(pipeline);
  const result = pipeline.beginChat({ sessionId: connected.sessionId, message: "Hello" });
  assert.equal(result.ok, false);
  assert.match(result.error, /has not completed its introduction/);
});

test("chat receives current governance state on every turn", () => {
  const pipeline = loadPipeline();
  const connected = connectReadyForIntroduction(pipeline);
  completeIntroduction(pipeline, connected.sessionId);
  const chat = pipeline.beginChat({ sessionId: connected.sessionId, message: "What can you do?" });
  assert.equal(chat.ok, true);
  const system = chat.operation.messages[0].content;
  assert.match(system, /CURRENT WINGMAN GOVERNANCE STATE/);
  assert.match(system, /edit_history \| STATE=DISALLOWED \| AUTHORITY=NO/);
});

test("chat completion validates offered actions", () => {
  const pipeline = loadPipeline();
  const connected = connectReadyForIntroduction(pipeline);
  completeIntroduction(pipeline, connected.sessionId);
  const begun = pipeline.beginChat({
    sessionId: connected.sessionId,
    message: "Test action",
    availableActions: [{ name: "allowed_action", description: "Allowed", parameters: {} }]
  });
  const bad = pipeline.completeChat({
    sessionId: connected.sessionId,
    turnId: begun.operation.turnId,
    reply: "",
    actionChoice: { name: "not_offered", parameters: {} }
  });
  assert.equal(bad.ok, false);
  assert.match(bad.error, /not offered/);
});

test("standing 3D function deliberately takes ownership when used", () => {
  const pipeline = loadPipeline();
  const connected = connectReadyForIntroduction(pipeline);
  completeIntroduction(pipeline, connected.sessionId);
  const spatial = pipeline.beginSpatialAction({
    sessionId: connected.sessionId,
    action: pipeline.SPATIAL_ACTIONS.ENTER_3D,
    initiatedBy: "ai"
  });
  assert.equal(spatial.ok, true);
  const session = pipeline.getSession(connected.sessionId);
  const fn = session.governance.functions.find((item) => item.function === "enter_3d_environment");
  assert.equal(fn.ownership, "OWNED");
});

test("active project uses stable ID in governance instructions", () => {
  const pipeline = loadPipeline();
  const connected = connectReadyForIntroduction(pipeline);
  const result = pipeline.setActiveProject({
    sessionId: connected.sessionId,
    project: { id: "project-123", name: "Same Name Is Not Identity" }
  });
  assert.equal(result.ok, true);
  assert.equal(result.activeProject.id, "project-123");
  assert.match(result.governanceInstructions, /ACTIVE_PROJECT=project-123/);
});

test("provider-turn failure returns introduction session to introduction readiness", () => {
  const pipeline = loadPipeline();
  const connected = connectReadyForIntroduction(pipeline);
  const begun = pipeline.beginIntroduction({ sessionId: connected.sessionId });
  const failed = pipeline.failPendingTurn({
    sessionId: connected.sessionId,
    turnId: begun.operation.turnId,
    error: "provider unavailable"
  });
  assert.equal(failed.ok, true);
  assert.equal(failed.state, "ready_for_introduction");
});

test("disconnect removes the session", () => {
  const pipeline = loadPipeline();
  const connected = connectReadyForIntroduction(pipeline);
  const closed = pipeline.disconnect({ sessionId: connected.sessionId });
  assert.equal(closed.ok, true);
  assert.equal(closed.state, "disconnected");
  assert.equal(pipeline.getSession(connected.sessionId), null);
});
