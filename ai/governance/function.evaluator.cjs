"use strict";

/**
 * WingMan function governance evaluator.
 *
 * Evaluates conditions sequentially. The first unresolved applicable
 * condition determines the next governance route.
 *
 * Order:
 *   1. Current State
 *   2. Current Authority
 *   3. Scope
 *   4. Ownership
 *   5. Action
 */

const {
  FUNCTION_STATE,
  SCOPE_TYPE,
} = require("./function.catalog.cjs");

const OWNERSHIP = Object.freeze({
  OWNED: "OWNED",
  SURRENDERED: "SURRENDERED",
});

const NEXT_ACTION = Object.freeze({
  USE_FUNCTION: "USE_FUNCTION",
  CONSULT_USER_FOR_AVAILABILITY: "CONSULT_USER_FOR_AVAILABILITY",
  FIND_VALID_EXECUTOR: "FIND_VALID_EXECUTOR",
  CHECK_PROJECT_PROPOSAL_THEN_CONSULT_USER: "CHECK_PROJECT_PROPOSAL_THEN_CONSULT_USER",
  CHECK_USER_OVERRIDE_THEN_CONSULT_USER: "CHECK_USER_OVERRIDE_THEN_CONSULT_USER",
  CONSULT_USER_FOR_PROJECT_SCOPE: "CONSULT_USER_FOR_PROJECT_SCOPE",
  CONSULT_USER_FOR_SCOPE: "CONSULT_USER_FOR_SCOPE",
  TAKE_OWNERSHIP: "TAKE_OWNERSHIP",
});

const FAILED_CONDITION = Object.freeze({
  UNAVAILABLE: "UNAVAILABLE",
  DISALLOWED: "DISALLOWED",
  NO_CURRENT_AUTHORITY: "NO_CURRENT_AUTHORITY",
  PROJECT_SCOPE_MISMATCH: "PROJECT_SCOPE_MISMATCH",
  UNKNOWN_SCOPE: "UNKNOWN_SCOPE",
  NOT_OWNED: "NOT_OWNED",
});

function decision(actionable, nextAction, failedCondition = null) {
  return Object.freeze({
    actionable,
    nextAction,
    failedCondition,
  });
}

function validateRecord(record) {
  if (!record || typeof record !== "object") {
    throw new TypeError("Function governance record is required.");
  }

  if (!record.function) {
    throw new TypeError("Function governance record requires function.");
  }

  if (!Object.values(FUNCTION_STATE).includes(record.currentState)) {
    throw new TypeError(`Invalid currentState for ${record.function}: ${record.currentState}`);
  }

  if (typeof record.hasCurrentAuthority !== "boolean") {
    throw new TypeError(`hasCurrentAuthority must be boolean for ${record.function}.`);
  }

  if (!Object.values(SCOPE_TYPE).includes(record.scopeType)) {
    return;
  }

  if (!Object.values(OWNERSHIP).includes(record.ownership)) {
    throw new TypeError(`Invalid ownership for ${record.function}: ${record.ownership}`);
  }
}

function evaluateFunctionUse(record, activeProject = null) {
  validateRecord(record);

  // 1. CURRENT STATE
  if (record.currentState === FUNCTION_STATE.DISALLOWED) {
    return decision(
      false,
      NEXT_ACTION.FIND_VALID_EXECUTOR,
      FAILED_CONDITION.DISALLOWED
    );
  }

  if (record.currentState !== FUNCTION_STATE.AVAILABLE) {
    return decision(
      false,
      NEXT_ACTION.CONSULT_USER_FOR_AVAILABILITY,
      FAILED_CONDITION.UNAVAILABLE
    );
  }

  // 2. CURRENT AUTHORITY
  if (record.hasCurrentAuthority !== true) {
    if (record.scopeType === SCOPE_TYPE.STANDING_PARTICIPANT) {
      return decision(
        false,
        NEXT_ACTION.CHECK_USER_OVERRIDE_THEN_CONSULT_USER,
        FAILED_CONDITION.NO_CURRENT_AUTHORITY
      );
    }

    return decision(
      false,
      NEXT_ACTION.CHECK_PROJECT_PROPOSAL_THEN_CONSULT_USER,
      FAILED_CONDITION.NO_CURRENT_AUTHORITY
    );
  }

  // 3. SCOPE
  if (record.scopeType === SCOPE_TYPE.PROJECT) {
    if (
      !record.currentProject ||
      !activeProject ||
      record.currentProject.id !== activeProject.id
    ) {
      return decision(
        false,
        NEXT_ACTION.CONSULT_USER_FOR_PROJECT_SCOPE,
        FAILED_CONDITION.PROJECT_SCOPE_MISMATCH
      );
    }
  } else if (record.scopeType !== SCOPE_TYPE.STANDING_PARTICIPANT) {
    return decision(
      false,
      NEXT_ACTION.CONSULT_USER_FOR_SCOPE,
      FAILED_CONDITION.UNKNOWN_SCOPE
    );
  }

  // 4. OWNERSHIP
  if (record.ownership !== OWNERSHIP.OWNED) {
    return decision(
      false,
      NEXT_ACTION.TAKE_OWNERSHIP,
      FAILED_CONDITION.NOT_OWNED
    );
  }

  // 5. ACTION
  return decision(true, NEXT_ACTION.USE_FUNCTION);
}

function takeOwnership(record, activeProject = null, log = []) {
  validateRecord(record);

  const proposed = {
    ...record,
    ownership: OWNERSHIP.OWNED,
  };

  const evaluation = evaluateFunctionUse(proposed, activeProject);

  if (!evaluation.actionable) {
    return Object.freeze({
      changed: false,
      record,
      decision: evaluation,
    });
  }

  const updated = Object.freeze(proposed);

  log.push({
    event: "FUNCTION_OWNERSHIP_TAKEN",
    function: record.function,
    actor: record.actor ?? null,
    scopeType: record.scopeType,
    projectId: record.currentProject?.id ?? null,
  });

  return Object.freeze({
    changed: true,
    record: updated,
    decision: evaluateFunctionUse(updated, activeProject),
  });
}

function surrenderOwnership(record, reason, log = []) {
  validateRecord(record);

  const updated = Object.freeze({
    ...record,
    ownership: OWNERSHIP.SURRENDERED,
  });

  log.push({
    event: "FUNCTION_OWNERSHIP_SURRENDERED",
    function: record.function,
    actor: record.actor ?? null,
    scopeType: record.scopeType,
    projectId: record.currentProject?.id ?? null,
    reason: reason ?? null,
  });

  return updated;
}

module.exports = Object.freeze({
  OWNERSHIP,
  NEXT_ACTION,
  FAILED_CONDITION,
  evaluateFunctionUse,
  takeOwnership,
  surrenderOwnership,
});
