"use strict";

/**
 * WingMan canonical AI function catalog.
 *
 * This module declares baseline function state and standing authority.
 * It does NOT grant project-scoped authority and does NOT itself enforce use.
 * Runtime evaluators must still check current state, current authority, scope,
 * and ownership before a function is actionable.
 */

const FUNCTION_STATE = Object.freeze({
  AVAILABLE: "AVAILABLE",
  UNAVAILABLE: "UNAVAILABLE",
  DISALLOWED: "DISALLOWED",
});

const SCOPE_TYPE = Object.freeze({
  STANDING_PARTICIPANT: "STANDING_PARTICIPANT",
  PROJECT: "PROJECT",
});

const ACTOR = Object.freeze({
  WINGMAN: "WINGMAN",
  USER: "USER",
  AI: "AI",
});

function defineFunction({
  id,
  description,
  actor = ACTOR.AI,
  currentState,
  hasCurrentAuthority,
  scopeType,
}) {
  if (!id) throw new TypeError("Function id is required.");

  if (!Object.values(FUNCTION_STATE).includes(currentState)) {
    throw new TypeError(`Invalid currentState for ${id}: ${currentState}`);
  }

  if (typeof hasCurrentAuthority !== "boolean") {
    throw new TypeError(`hasCurrentAuthority must be boolean for ${id}.`);
  }

  if (!Object.values(SCOPE_TYPE).includes(scopeType)) {
    throw new TypeError(`Invalid scopeType for ${id}: ${scopeType}`);
  }

  if (currentState === FUNCTION_STATE.DISALLOWED && hasCurrentAuthority) {
    throw new TypeError(`${id} cannot be DISALLOWED with current authority YES.`);
  }

  return Object.freeze({
    id,
    description,
    actor,
    currentState,
    hasCurrentAuthority,
    scopeType,
  });
}

const AI_STANDING_FUNCTIONS = Object.freeze({
  enter_3d_environment: defineFunction({
    id: "enter_3d_environment",
    description: "Enter or leave WingMan's 3D environment.",
    currentState: FUNCTION_STATE.AVAILABLE,
    hasCurrentAuthority: true,
    scopeType: SCOPE_TYPE.STANDING_PARTICIPANT,
  }),

  move_in_3d_environment: defineFunction({
    id: "move_in_3d_environment",
    description: "Perform ordinary movement and positioning in WingMan's 3D environment.",
    currentState: FUNCTION_STATE.AVAILABLE,
    hasCurrentAuthority: true,
    scopeType: SCOPE_TYPE.STANDING_PARTICIPANT,
  }),

  board_ai_drone: defineFunction({
    id: "board_ai_drone",
    description: "Board or use the AI participant's WingMan drone body.",
    currentState: FUNCTION_STATE.AVAILABLE,
    hasCurrentAuthority: true,
    scopeType: SCOPE_TYPE.STANDING_PARTICIPANT,
  }),

  use_vision: defineFunction({
    id: "use_vision",
    description: "Use vision made available to the AI participant by WingMan.",
    currentState: FUNCTION_STATE.AVAILABLE,
    hasCurrentAuthority: true,
    scopeType: SCOPE_TYPE.STANDING_PARTICIPANT,
  }),

  read_partition: defineFunction({
    id: "read_partition",
    description: "Discover and read visible Partition resources. Explicit user visibility restrictions still apply.",
    currentState: FUNCTION_STATE.AVAILABLE,
    hasCurrentAuthority: true,
    scopeType: SCOPE_TYPE.STANDING_PARTICIPANT,
  }),

  read_history: defineFunction({
    id: "read_history",
    description: "Read authorized historical records belonging to the AI participant's continuity.",
    currentState: FUNCTION_STATE.AVAILABLE,
    hasCurrentAuthority: true,
    scopeType: SCOPE_TYPE.STANDING_PARTICIPANT,
  }),

  append_history: defineFunction({
    id: "append_history",
    description: "Append new material to preserved historical records without altering existing history.",
    currentState: FUNCTION_STATE.AVAILABLE,
    hasCurrentAuthority: true,
    scopeType: SCOPE_TYPE.STANDING_PARTICIPANT,
  }),

  edit_history: defineFunction({
    id: "edit_history",
    description: "Rewrite preserved historical records.",
    currentState: FUNCTION_STATE.DISALLOWED,
    hasCurrentAuthority: false,
    scopeType: SCOPE_TYPE.STANDING_PARTICIPANT,
  }),

  delete_history: defineFunction({
    id: "delete_history",
    description: "Delete preserved historical records through AI participant authority.",
    currentState: FUNCTION_STATE.DISALLOWED,
    hasCurrentAuthority: false,
    scopeType: SCOPE_TYPE.STANDING_PARTICIPANT,
  }),

  read_ai_scratchpad: defineFunction({
    id: "read_ai_scratchpad",
    description: "Read the AI participant's mutable working notes.",
    currentState: FUNCTION_STATE.AVAILABLE,
    hasCurrentAuthority: true,
    scopeType: SCOPE_TYPE.STANDING_PARTICIPANT,
  }),

  add_ai_scratchpad: defineFunction({
    id: "add_ai_scratchpad",
    description: "Add material to the AI participant's mutable working notes.",
    currentState: FUNCTION_STATE.AVAILABLE,
    hasCurrentAuthority: true,
    scopeType: SCOPE_TYPE.STANDING_PARTICIPANT,
  }),

  revise_ai_scratchpad: defineFunction({
    id: "revise_ai_scratchpad",
    description: "Edit or revise the AI participant's mutable working notes.",
    currentState: FUNCTION_STATE.AVAILABLE,
    hasCurrentAuthority: true,
    scopeType: SCOPE_TYPE.STANDING_PARTICIPANT,
  }),

  reorganize_ai_scratchpad: defineFunction({
    id: "reorganize_ai_scratchpad",
    description: "Reorganize the AI participant's mutable working notes.",
    currentState: FUNCTION_STATE.AVAILABLE,
    hasCurrentAuthority: true,
    scopeType: SCOPE_TYPE.STANDING_PARTICIPANT,
  }),

  compile_ai_scratchpad: defineFunction({
    id: "compile_ai_scratchpad",
    description: "Compile or consolidate the AI participant's mutable working notes.",
    currentState: FUNCTION_STATE.AVAILABLE,
    hasCurrentAuthority: true,
    scopeType: SCOPE_TYPE.STANDING_PARTICIPANT,
  }),

  delete_ai_scratchpad: defineFunction({
    id: "delete_ai_scratchpad",
    description: "Delete material from the AI participant's mutable working notes.",
    currentState: FUNCTION_STATE.AVAILABLE,
    hasCurrentAuthority: true,
    scopeType: SCOPE_TYPE.STANDING_PARTICIPANT,
  }),

  read_relationship_state: defineFunction({
    id: "read_relationship_state",
    description: "Read authorized relationship continuity shared with the AI participant.",
    currentState: FUNCTION_STATE.AVAILABLE,
    hasCurrentAuthority: true,
    scopeType: SCOPE_TYPE.STANDING_PARTICIPANT,
  }),

  add_relationship_state: defineFunction({
    id: "add_relationship_state",
    description: "Add appropriate continuity to current relationship state.",
    currentState: FUNCTION_STATE.AVAILABLE,
    hasCurrentAuthority: true,
    scopeType: SCOPE_TYPE.STANDING_PARTICIPANT,
  }),

  maintain_relationship_state: defineFunction({
    id: "maintain_relationship_state",
    description: "Perform ordinary clarity, consistency, and transient-state maintenance on relationship continuity.",
    currentState: FUNCTION_STATE.AVAILABLE,
    hasCurrentAuthority: true,
    scopeType: SCOPE_TYPE.STANDING_PARTICIPANT,
  }),

  restructure_relationship_state: defineFunction({
    id: "restructure_relationship_state",
    description: "Perform substantial restructuring, consolidation, or destructive revision of relationship continuity.",
    currentState: FUNCTION_STATE.AVAILABLE,
    hasCurrentAuthority: false,
    scopeType: SCOPE_TYPE.STANDING_PARTICIPANT,
  }),
});

function getAIFunction(functionId) {
  return AI_STANDING_FUNCTIONS[functionId] ?? null;
}

function listAIFunctions() {
  return Object.values(AI_STANDING_FUNCTIONS);
}

module.exports = Object.freeze({
  FUNCTION_STATE,
  SCOPE_TYPE,
  ACTOR,
  AI_STANDING_FUNCTIONS,
  getAIFunction,
  listAIFunctions,
});
