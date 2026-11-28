"use strict";

/**
 * WingMan Partition resource-access evaluator.
 *
 * This module does not decide whether a WingMan function is actionable.
 * Function governance is evaluated separately by function.evaluator.cjs.
 *
 * This module answers a narrower question:
 * Given a visible Partition resource and an already-evaluated operation,
 * what access level applies to that resource?
 *
 * Principles:
 * - User-hidden resources are inaccessible.
 * - Visible ordinary Partition resources are read-only by default.
 * - RW requires an actionable modifying function and matching project scope.
 * - Resource-specific protections override ordinary project RW.
 */

const ACCESS_LEVEL = Object.freeze({
  DENY: "DENY",
  RO: "RO",
  RW: "RW",
});

const RESOURCE_KIND = Object.freeze({
  ORDINARY: "ORDINARY",
  HISTORY: "HISTORY",
});

const OPERATION = Object.freeze({
  READ: "READ",
  APPEND: "APPEND",
  CREATE: "CREATE",
  WRITE: "WRITE",
  EDIT: "EDIT",
  DELETE: "DELETE",
});

const MODIFYING_OPERATIONS = new Set([
  OPERATION.APPEND,
  OPERATION.CREATE,
  OPERATION.WRITE,
  OPERATION.EDIT,
  OPERATION.DELETE,
]);

function normalizeProjectId(value) {
  if (value == null) return null;
  if (typeof value === "object") {
    return value.id == null ? null : String(value.id);
  }
  return String(value);
}

function validateInput(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("Resource access input is required.");
  }

  if (!Object.values(OPERATION).includes(input.operation)) {
    throw new TypeError(`Invalid resource operation: ${input.operation}`);
  }

  if (
    input.resourceKind != null &&
    !Object.values(RESOURCE_KIND).includes(input.resourceKind)
  ) {
    throw new TypeError(`Invalid resource kind: ${input.resourceKind}`);
  }

  if (
    input.modifyingFunctionActionable != null &&
    typeof input.modifyingFunctionActionable !== "boolean"
  ) {
    throw new TypeError("modifyingFunctionActionable must be boolean when provided.");
  }
}

function decision(access, reason) {
  return Object.freeze({ access, reason });
}

function evaluateHistoryAccess(operation) {
  if (operation === OPERATION.READ) {
    return decision(ACCESS_LEVEL.RO, "HISTORY_READ_ALLOWED");
  }

  if (operation === OPERATION.APPEND) {
    return decision(ACCESS_LEVEL.RW, "HISTORY_APPEND_ALLOWED");
  }

  return decision(ACCESS_LEVEL.DENY, "HISTORY_MUTATION_PROTECTED");
}

function evaluateResourceAccess(input) {
  validateInput(input);

  const {
    operation,
    hiddenByUser = false,
    resourceKind = RESOURCE_KIND.ORDINARY,
    modifyingFunctionActionable = false,
  } = input;

  // 1. USER VISIBILITY OVERRIDE
  if (hiddenByUser === true) {
    return decision(ACCESS_LEVEL.DENY, "USER_HIDDEN");
  }

  // 2. RESOURCE-SPECIFIC PROTECTION
  if (resourceKind === RESOURCE_KIND.HISTORY) {
    return evaluateHistoryAccess(operation);
  }

  // 3. STANDING READ VISIBILITY
  if (operation === OPERATION.READ) {
    return decision(ACCESS_LEVEL.RO, "VISIBLE_READ_ONLY");
  }

  // 4. MODIFICATION FUNCTION
  if (!MODIFYING_OPERATIONS.has(operation)) {
    return decision(ACCESS_LEVEL.DENY, "UNSUPPORTED_OPERATION");
  }

  if (modifyingFunctionActionable !== true) {
    return decision(ACCESS_LEVEL.RO, "MODIFICATION_NOT_ACTIONABLE");
  }

  // 5. ACTIVE PROJECT SCOPE
  const activeProjectId = normalizeProjectId(input.activeProject);
  const resourceProjectId = normalizeProjectId(input.resourceProject);

  if (!activeProjectId || !resourceProjectId || activeProjectId !== resourceProjectId) {
    return decision(ACCESS_LEVEL.RO, "PROJECT_SCOPE_MISMATCH");
  }

  // 6. PROJECT-SCOPED RW
  return decision(ACCESS_LEVEL.RW, "PROJECT_MODIFICATION_ALLOWED");
}

module.exports = Object.freeze({
  ACCESS_LEVEL,
  RESOURCE_KIND,
  OPERATION,
  evaluateResourceAccess,
});
