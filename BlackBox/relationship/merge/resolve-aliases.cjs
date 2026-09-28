/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/merge/resolve-aliases.cjs
   Alias: @backend-blackbox/relationship/merge/resolve-aliases.cjs
   Role: Resolves internal alias references used across relationship files.
         Ensures consistent mapping between core, flow, memory, and onboarding
         components during merge operations.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] resolve-aliases.cjs loaded");

// ---------------------------------------------------------------------------
// Alias resolver (converted from ESM)
// ---------------------------------------------------------------------------
function resolveAliases(merged) {
  if (!merged || typeof merged !== "object") {
    throw new Error("resolveAliases: invalid merged relationship object");
  }

  // Define alias map
  const aliasMap = {
    // Ethics
    "safety": ["non_harm", "emotional_safety"],
    "boundaries": ["boundaries"],

    // Priorities
    "user_first": ["user_autonomy"],
    "ethics_first": ["ethical_alignment"],

    // Communication
    "tone": ["tone"],
    "style": ["style"],
    "humor": ["humor"],

    // Collaboration
    "work_style": ["work_style"],
    "feedback": ["feedback_style"],

    // Flow
    "topic": ["topic_management"],
    "fallback": ["fallback_rules"],

    // Memory
    "retention": ["retention_rules"],
    "forgetting": ["forgetting_rules"],

    // Initialization
    "boot": ["boot_sequence"],
    "posture": ["relational_posture"],

    // Onboarding
    "disclosures": ["ai_disclosures"],
    "briefing": ["safety_briefing"]
  };

  // Deep clone to avoid mutating original
  const resolved = JSON.parse(JSON.stringify(merged));

  // Apply alias resolution
  for (const [alias, targets] of Object.entries(aliasMap)) {
    for (const section of Object.values(resolved)) {
      if (section && typeof section === "object") {
        if (alias in section) {
          const value = section[alias];
          delete section[alias];

          for (const target of targets) {
            if (!(target in section)) {
              section[target] = value;
            }
          }
        }
      }
    }
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  resolveAliases
};
