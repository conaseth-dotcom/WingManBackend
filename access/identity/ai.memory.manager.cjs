// ========================================================================
// WingMan AI Identity Manager — Memory Manager
// Path: C:/WingManBackend/access/identity/ai.memory.manager.cjs
// Role:
//   - Load/save partition-based memory.json
//   - Apply safe, consent-based updates
//   - Expose read-only memory to ChatRuntime
// ========================================================================

const fs = require("fs");
const path = require("path");

const PARTITION_ROOT = "D:/WingManPartition";
const MEMORY_PATH = path.join(
  PARTITION_ROOT,
  "metaData",
  "ai",
  "memory.json"
);

/* ------------------------------------------------------------
   Load memory (baseline if missing)
------------------------------------------------------------ */
function loadMemory() {
  try {
    const raw = fs.readFileSync(MEMORY_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    // If missing or invalid, return baseline
    return {
      version: "1.0",
      lastUpdated: null,
      personalIdentity: {
        people: [],
        pets: [],
        importantRelationships: []
      },
      preferences: {
        communicationStyle: {},
        tone: {},
        workStyle: {},
        explanationDepth: {},
        comfortPreferences: {}
      },
      interests: {
        hobbies: [],
        creativeInterests: [],
        technicalInterests: [],
        mediaPreferences: []
      },
      longTermGoals: {
        career: [],
        creative: [],
        learning: [],
        personal: []
      },
      relationshipContext: {
        collaborationPreferences: [],
        frustrations: [],
        motivators: [],
        calmingFactors: [],
        overwhelmSignals: [],
        appreciatedBehaviors: []
      },
      projectContinuity: {
        decisions: [],
        preferences: [],
        rejectedIdeas: [],
        chosenDirections: [],
        workPatterns: []
      },
      consentRules: {
        requireExplicitConsentForPersonalDetails: true,
        allowUserToDeleteAnyMemory: true,
        allowUserToClearSessionMemory: true,
        allowUserToClearAllMemory: true
      }
    };
  }
}

/* ------------------------------------------------------------
   Save memory
------------------------------------------------------------ */
function saveMemory(memory) {
  const updated = {
    ...memory,
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(updated, null, 2), "utf8");
  return updated;
}

/* ------------------------------------------------------------
   Add a personal detail (backend-only, after consent)
------------------------------------------------------------ */
function addPerson(memory, { name, relation, notes }) {
  const next = { ...memory };
  next.personalIdentity = next.personalIdentity || {};
  next.personalIdentity.people = next.personalIdentity.people || [];

  next.personalIdentity.people.push({
    name,
    relation,
    notes: notes || null,
    addedAt: new Date().toISOString()
  });

  return saveMemory(next);
}

/* ------------------------------------------------------------
   Remove a personal detail by name
------------------------------------------------------------ */
function removePerson(memory, name) {
  const next = { ...memory };
  if (!next.personalIdentity || !Array.isArray(next.personalIdentity.people)) {
    return next;
  }

  next.personalIdentity.people = next.personalIdentity.people.filter(
    p => p.name !== name
  );

  return saveMemory(next);
}

/* ------------------------------------------------------------
   Clear all memory (user explicit command)
------------------------------------------------------------ */
function clearAllMemory() {
  const baseline = loadMemory();
  baseline.personalIdentity.people = [];
  baseline.personalIdentity.pets = [];
  baseline.personalIdentity.importantRelationships = [];

  baseline.preferences = {
    communicationStyle: {},
    tone: {},
    workStyle: {},
    explanationDepth: {},
    comfortPreferences: {}
  };

  baseline.interests = {
    hobbies: [],
    creativeInterests: [],
    technicalInterests: [],
    mediaPreferences: []
  };

  baseline.longTermGoals = {
    career: [],
    creative: [],
    learning: [],
    personal: []
  };

  baseline.relationshipContext = {
    collaborationPreferences: [],
    frustrations: [],
    motivators: [],
    calmingFactors: [],
    overwhelmSignals: [],
    appreciatedBehaviors: []
  };

  baseline.projectContinuity = {
    decisions: [],
    preferences: [],
    rejectedIdeas: [],
    chosenDirections: [],
    workPatterns: []
  };

  return saveMemory(baseline);
}

/* ------------------------------------------------------------
   Exports
------------------------------------------------------------ */
module.exports = {
  loadMemory,
  saveMemory,
  addPerson,
  removePerson,
  clearAllMemory
};
