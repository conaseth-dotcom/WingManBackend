"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ACCESS_LEVEL,
  RESOURCE_KIND,
  OPERATION,
  evaluateResourceAccess,
} = require("./governance/resource.access.cjs");

const PROJECT_A = Object.freeze({ id: "project-a", name: "Project A" });
const PROJECT_B = Object.freeze({ id: "project-b", name: "Project B" });

test("visible ordinary Partition resource defaults to RO", () => {
  const result = evaluateResourceAccess({
    operation: OPERATION.READ,
  });

  assert.deepEqual(result, {
    access: ACCESS_LEVEL.RO,
    reason: "VISIBLE_READ_ONLY",
  });
});

test("user-hidden resource is denied even for read", () => {
  const result = evaluateResourceAccess({
    operation: OPERATION.READ,
    hiddenByUser: true,
  });

  assert.deepEqual(result, {
    access: ACCESS_LEVEL.DENY,
    reason: "USER_HIDDEN",
  });
});

test("authorized project modification promotes matching ordinary resource to RW", () => {
  const result = evaluateResourceAccess({
    operation: OPERATION.EDIT,
    modifyingFunctionActionable: true,
    activeProject: PROJECT_A,
    resourceProject: PROJECT_A,
  });

  assert.deepEqual(result, {
    access: ACCESS_LEVEL.RW,
    reason: "PROJECT_MODIFICATION_ALLOWED",
  });
});

test("project mismatch keeps ordinary resource RO", () => {
  const result = evaluateResourceAccess({
    operation: OPERATION.WRITE,
    modifyingFunctionActionable: true,
    activeProject: PROJECT_A,
    resourceProject: PROJECT_B,
  });

  assert.deepEqual(result, {
    access: ACCESS_LEVEL.RO,
    reason: "PROJECT_SCOPE_MISMATCH",
  });
});

test("missing project identity keeps ordinary resource RO", () => {
  const result = evaluateResourceAccess({
    operation: OPERATION.CREATE,
    modifyingFunctionActionable: true,
    activeProject: PROJECT_A,
    resourceProject: null,
  });

  assert.deepEqual(result, {
    access: ACCESS_LEVEL.RO,
    reason: "PROJECT_SCOPE_MISMATCH",
  });
});

test("non-actionable modifying function never promotes visible resource beyond RO", () => {
  const result = evaluateResourceAccess({
    operation: OPERATION.DELETE,
    modifyingFunctionActionable: false,
    activeProject: PROJECT_A,
    resourceProject: PROJECT_A,
  });

  assert.deepEqual(result, {
    access: ACCESS_LEVEL.RO,
    reason: "MODIFICATION_NOT_ACTIONABLE",
  });
});

test("history read is allowed as RO", () => {
  const result = evaluateResourceAccess({
    operation: OPERATION.READ,
    resourceKind: RESOURCE_KIND.HISTORY,
  });

  assert.deepEqual(result, {
    access: ACCESS_LEVEL.RO,
    reason: "HISTORY_READ_ALLOWED",
  });
});

test("history append is allowed without granting edit authority", () => {
  const result = evaluateResourceAccess({
    operation: OPERATION.APPEND,
    resourceKind: RESOURCE_KIND.HISTORY,
  });

  assert.deepEqual(result, {
    access: ACCESS_LEVEL.RW,
    reason: "HISTORY_APPEND_ALLOWED",
  });
});

test("history edit and delete are denied", () => {
  for (const operation of [OPERATION.EDIT, OPERATION.DELETE]) {
    const result = evaluateResourceAccess({
      operation,
      resourceKind: RESOURCE_KIND.HISTORY,
    });

    assert.deepEqual(result, {
      access: ACCESS_LEVEL.DENY,
      reason: "HISTORY_MUTATION_PROTECTED",
    });
  }
});

test("history protection overrides otherwise valid project RW", () => {
  const result = evaluateResourceAccess({
    operation: OPERATION.EDIT,
    resourceKind: RESOURCE_KIND.HISTORY,
    modifyingFunctionActionable: true,
    activeProject: PROJECT_A,
    resourceProject: PROJECT_A,
  });

  assert.deepEqual(result, {
    access: ACCESS_LEVEL.DENY,
    reason: "HISTORY_MUTATION_PROTECTED",
  });
});

test("user-hidden rule overrides history append authority", () => {
  const result = evaluateResourceAccess({
    operation: OPERATION.APPEND,
    resourceKind: RESOURCE_KIND.HISTORY,
    hiddenByUser: true,
  });

  assert.deepEqual(result, {
    access: ACCESS_LEVEL.DENY,
    reason: "USER_HIDDEN",
  });
});
