"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

const ENGINE_PATH = path.resolve(__dirname, "ai.engine.cjs");
const PIPELINE_PATH = path.resolve(__dirname, "ai.pipeline.cjs");

function loadEngine() {
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

  delete require.cache[ENGINE_PATH];
  delete require.cache[PIPELINE_PATH];
  let engine;
  try {
    engine = require(ENGINE_PATH);
  } finally {
    Module._load = originalLoad;
  }
  return engine;
}

function connect(engine, overrides = {}) {
  return engine.connect({
    licenseContext: {
      productRef: "test-product",
      tier: "test",
      verifiedAt: "2026-11-25T00:00:00.000Z"
    },
    provider: "openai",
    model: "test-model",
    params: {},
    localContext: {
      partitionId: "partition-test"
    },
    ...overrides
  });
}

function finishIntroduction(engine, sessionId) {
  const begun = engine.beginIntroduction({ sessionId, preferredName: "Constance" });
  assert.equal(begun.ok, true);
  return engine.completeIntroduction({
    sessionId,
    turnId: begun.operation.turnId,
    reply: "Hello, Constance."
  });
}

test("engine exposes no obsolete orientation or persistence facade", () => {
  const engine = loadEngine();
  for (const obsolete of ["advanceOrientation", "submitPersistenceResult", "currentOperation"]) {
    assert.equal(Object.hasOwn(engine, obsolete), false, obsolete);
  }
});

test("engine requires verified license context before creating session", () => {
  const engine = loadEngine();
  const result = engine.connect({
    localContext: { partitionId: "partition-test" }
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /Verified license context is required/);
});

test("engine connects and retains session license", () => {
  const engine = loadEngine();
  const result = connect(engine);
  assert.equal(result.ok, true);
  assert.equal(result.state, "ready_for_introduction");
  assert.equal(result.license.productRef, "test-product");
  const status = engine.status({ sessionId: result.sessionId });
  assert.equal(status.ok, true);
  assert.equal(status.license.productRef, "test-product");
  assert.equal(status.admitted, true);
});

test("engine status exposes governance and admission state", () => {
  const engine = loadEngine();
  const connected = connect(engine);
  const status = engine.status({ sessionId: connected.sessionId });
  assert.equal(status.admission.readyForIntroduction, true);
  assert.ok(status.governance);
  assert.equal(status.governance.activeProject, null);
  assert.ok(Array.isArray(status.governance.functions));
});

test("engine forwards introduction and chat through new pipeline", () => {
  const engine = loadEngine();
  const connected = connect(engine);
  const introduction = finishIntroduction(engine, connected.sessionId);
  assert.equal(introduction.state, "ready");
  const chat = engine.beginChat({ sessionId: connected.sessionId, message: "Hello again" });
  assert.equal(chat.ok, true);
  assert.equal(chat.operation.type, "chat_turn");
  const completed = engine.completeChat({
    sessionId: connected.sessionId,
    turnId: chat.operation.turnId,
    reply: "Hello again, Constance."
  });
  assert.equal(completed.ok, true);
  assert.equal(completed.state, "ready");
});

test("engine refuses empty chat before pipeline call", () => {
  const engine = loadEngine();
  const connected = connect(engine);
  finishIntroduction(engine, connected.sessionId);
  const result = engine.beginChat({ sessionId: connected.sessionId, message: "   " });
  assert.equal(result.ok, false);
  assert.match(result.error, /non-empty user message/);
});

test("engine forwards governed standing spatial action", () => {
  const engine = loadEngine();
  const connected = connect(engine);
  finishIntroduction(engine, connected.sessionId);
  const spatial = engine.beginSpatialAction({
    sessionId: connected.sessionId,
    action: "enter_3d",
    initiatedBy: "ai"
  });
  assert.equal(spatial.ok, true);
  assert.equal(spatial.operation.type, "spatial_action");
});

test("engine forwards active project by stable ID", () => {
  const engine = loadEngine();
  const connected = connect(engine);
  const changed = engine.setActiveProject({
    sessionId: connected.sessionId,
    project: { id: "project-456", name: "Project Name" }
  });
  assert.equal(changed.ok, true);
  assert.equal(changed.activeProject.id, "project-456");
  const status = engine.status({ sessionId: connected.sessionId });
  assert.equal(status.activeProject.id, "project-456");
});

test("engine validates session ID", () => {
  const engine = loadEngine();
  const status = engine.status({ sessionId: "   " });
  assert.equal(status.ok, false);
  assert.match(status.error, /valid AI sessionId/);
});

test("disconnect removes both pipeline session and engine license association", () => {
  const engine = loadEngine();
  const connected = connect(engine);
  const closed = engine.disconnect({ sessionId: connected.sessionId });
  assert.equal(closed.ok, true);
  assert.equal(closed.state, "disconnected");
  const status = engine.status({ sessionId: connected.sessionId });
  assert.equal(status.ok, true);
  assert.equal(status.active, false);
  assert.equal(status.admitted, false);
  assert.equal(status.state, "disconnected");
  assert.equal(status.license, undefined);
});
