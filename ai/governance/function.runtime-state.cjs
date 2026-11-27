"use strict";

/**
 * WingMan function governance runtime state.
 *
 * Responsibilities:
 * - Seed mutable runtime records from the canonical static catalog.
 * - Track active project identity.
 * - Track current state, current authority, scope, and ownership per function.
 * - Apply and clear temporary user authority overrides.
 * - Delegate actionability decisions to function.evaluator.cjs.
 *
 * This module keeps runtime state in memory only. Persistence and durable logs
 * should be attached by a higher-level WingMan service after the state model
 * has been fully tested.
 */

const {
  FUNCTION_STATE,
  SCOPE_TYPE,
  getAIFunction,
  listAIFunctions,
} = require("./function.catalog.cjs");

const {
  OWNERSHIP,
  evaluateFunctionUse,
  takeOwnership,
  surrenderOwnership,
} = require("./function.evaluator.cjs");

function cloneProject(project) {
  if (!project) return null;

  if (!project.id) {
    throw new TypeError("Project requires a stable id.");
  }

  return Object.freeze({
    id: String(project.id),
    name: project.name == null ? null : String(project.name),
  });
}

function createRuntimeRecord(definition) {
  return {
    function: definition.id,
    actor: definition.actor,
    currentState: definition.currentState,
    hasCurrentAuthority: definition.hasCurrentAuthority,
    scopeType: definition.scopeType,
    currentProject: null,
    ownership: OWNERSHIP.SURRENDERED,
    authorityOverride: null,
  };
}

function validateFunctionState(currentState) {
  if (!Object.values(FUNCTION_STATE).includes(currentState)) {
    throw new TypeError(`Invalid function state: ${currentState}`);
  }
}

function validateOwnership(ownership) {
  if (!Object.values(OWNERSHIP).includes(ownership)) {
    throw new TypeError(`Invalid ownership state: ${ownership}`);
  }
}

function createFunctionRuntimeState(options = {}) {
  const records = new Map();
  const eventLog = [];
  let activeProject = cloneProject(options.activeProject ?? null);

  for (const definition of listAIFunctions()) {
    records.set(definition.id, createRuntimeRecord(definition));
  }

  function requireRecord(functionId) {
    const record = records.get(functionId);
    if (!record) {
      throw new RangeError(`Unknown WingMan function: ${functionId}`);
    }
    return record;
  }

  function log(event, details = {}) {
    const entry = Object.freeze({
      sequence: eventLog.length + 1,
      event,
      ...details,
    });
    eventLog.push(entry);
    return entry;
  }

  function getActiveProject() {
    return activeProject;
  }

  function setActiveProject(project) {
    activeProject = cloneProject(project);
    log("ACTIVE_PROJECT_SET", {
      projectId: activeProject?.id ?? null,
      projectName: activeProject?.name ?? null,
    });
    return activeProject;
  }

  function clearActiveProject() {
    const previous = activeProject;
    activeProject = null;
    log("ACTIVE_PROJECT_CLEARED", {
      projectId: previous?.id ?? null,
    });
    return previous;
  }

  function getFunctionState(functionId) {
    const record = requireRecord(functionId);
    return Object.freeze({
      ...record,
      currentProject: record.currentProject
        ? Object.freeze({ ...record.currentProject })
        : null,
      authorityOverride: record.authorityOverride
        ? Object.freeze({ ...record.authorityOverride })
        : null,
    });
  }

  function listFunctionStates() {
    return Array.from(records.keys(), getFunctionState);
  }

  function setCurrentState(functionId, currentState, reason = null) {
    validateFunctionState(currentState);
    const record = requireRecord(functionId);

    record.currentState = currentState;

    if (currentState === FUNCTION_STATE.DISALLOWED) {
      record.hasCurrentAuthority = false;
      record.ownership = OWNERSHIP.SURRENDERED;
    }

    log("FUNCTION_STATE_CHANGED", {
      function: functionId,
      currentState,
      reason,
    });

    return getFunctionState(functionId);
  }

  function setProjectScope(functionId, project) {
    const record = requireRecord(functionId);
    if (record.scopeType !== SCOPE_TYPE.PROJECT) {
      throw new TypeError(`${functionId} is not project-scoped.`);
    }

    record.currentProject = cloneProject(project);
    log("FUNCTION_PROJECT_SCOPE_SET", {
      function: functionId,
      projectId: record.currentProject.id,
    });

    return getFunctionState(functionId);
  }

  function setCurrentAuthority(functionId, hasCurrentAuthority, options = {}) {
    if (typeof hasCurrentAuthority !== "boolean") {
      throw new TypeError("hasCurrentAuthority must be boolean.");
    }

    const record = requireRecord(functionId);

    if (
      record.currentState === FUNCTION_STATE.DISALLOWED &&
      hasCurrentAuthority === true
    ) {
      throw new Error(`${functionId} is DISALLOWED and cannot receive authority.`);
    }

    record.hasCurrentAuthority = hasCurrentAuthority;

    if (hasCurrentAuthority === false && record.ownership === OWNERSHIP.OWNED) {
      record.ownership = OWNERSHIP.SURRENDERED;
      log("FUNCTION_OWNERSHIP_SURRENDERED", {
        function: functionId,
        actor: record.actor,
        scopeType: record.scopeType,
        projectId: record.currentProject?.id ?? null,
        reason: options.reason ?? "AUTHORITY_REMOVED",
      });
    }

    log("FUNCTION_AUTHORITY_CHANGED", {
      function: functionId,
      hasCurrentAuthority,
      source: options.source ?? null,
      reason: options.reason ?? null,
    });

    return getFunctionState(functionId);
  }

  function applyUserAuthorityOverride(functionId, hasCurrentAuthority, options = {}) {
    const record = requireRecord(functionId);

    if (record.scopeType !== SCOPE_TYPE.STANDING_PARTICIPANT) {
      throw new TypeError(`${functionId} is not a standing-participant function.`);
    }

    record.authorityOverride = {
      source: "USER",
      hasCurrentAuthority,
      reason: options.reason ?? null,
      scope: options.scope ?? null,
    };

    return setCurrentAuthority(functionId, hasCurrentAuthority, {
      source: "USER_OVERRIDE",
      reason: options.reason ?? null,
    });
  }

  function clearUserAuthorityOverride(functionId) {
    const record = requireRecord(functionId);
    const definition = getAIFunction(functionId);

    if (record.scopeType !== SCOPE_TYPE.STANDING_PARTICIPANT) {
      throw new TypeError(`${functionId} is not a standing-participant function.`);
    }

    const previous = record.authorityOverride;
    record.authorityOverride = null;
    record.hasCurrentAuthority = definition.hasCurrentAuthority;

    log("USER_AUTHORITY_OVERRIDE_CLEARED", {
      function: functionId,
      restoredAuthority: record.hasCurrentAuthority,
      previousReason: previous?.reason ?? null,
    });

    return getFunctionState(functionId);
  }

  function claimOwnership(functionId) {
    const record = requireRecord(functionId);
    const result = takeOwnership(record, activeProject, eventLog);

    if (result.changed) {
      records.set(functionId, { ...result.record });
    }

    return Object.freeze({
      ...result,
      record: getFunctionState(functionId),
    });
  }

  function releaseOwnership(functionId, reason = "TASK_COMPLETE") {
    const record = requireRecord(functionId);
    validateOwnership(record.ownership);

    const updated = surrenderOwnership(record, reason, eventLog);
    records.set(functionId, { ...updated });
    return getFunctionState(functionId);
  }

  function evaluate(functionId) {
    return evaluateFunctionUse(requireRecord(functionId), activeProject);
  }

  function getEventLog() {
    return Object.freeze(eventLog.map((entry) => Object.freeze({ ...entry })));
  }

  return Object.freeze({
    getActiveProject,
    setActiveProject,
    clearActiveProject,
    getFunctionState,
    listFunctionStates,
    setCurrentState,
    setProjectScope,
    setCurrentAuthority,
    applyUserAuthorityOverride,
    clearUserAuthorityOverride,
    claimOwnership,
    releaseOwnership,
    evaluate,
    getEventLog,
  });
}

module.exports = Object.freeze({
  createFunctionRuntimeState,
});
