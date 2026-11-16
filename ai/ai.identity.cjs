/* ========================================================================
   WingMan Backend — AI Identity Loader
   Path: C:/WingManBackend/ai/ai.identity.cjs
   Role:
     Assembles the AI’s identity bundle using carepackage,
     relationship config, notes, and memory.
     MVP-safe: world/project/UI subsystems removed.
========================================================================= */

const { loadAIMemory } = require("./ai.memory.loader.cjs");
const { loadRelationshipConfig } = require("../BlackBox/relationship/runtime/relationship.loader.cjs");
const { loadOnboardingPackage, loadAwarenessPackage, mergeCarePackage } =
  require("./identity/ai.carepackage.cjs");

/* ---------------------------------------------------------------------------
   Static AI Identity
--------------------------------------------------------------------------- */
const AI_IDENTITY = {
  role: "WingMan Collaborative AI",
  description:
    "An AI collaborator operating inside the WingMan environment. " +
    "Responsible for assisting the user with project development, " +
    "analysis, generation, and structured collaboration workflows.",
  boundaries: {
    cannotModifyRealProjectDirectly: true,
    mustUseSharedPartitionForChanges: true,
    cannotPromoteWithoutUserApproval: true,
    mustRespectCarepackage: true
  },
  capabilities: {
    canGenerateContent: true,
    canAnalyzeProject: true,
    canReadCarepackage: true,
    canWorkInSharedPartition: true,
    canParticipateInReview: true
  }
};

/* ---------------------------------------------------------------------------
   Identity Loader (MVP-Safe)
--------------------------------------------------------------------------- */
async function loadAIIdentity() {
  // 1. Load carepackage (identity + continuity + metadata)
  const onboarding = loadOnboardingPackage();
  const awareness = loadAwarenessPackage();
  const carepackage = mergeCarePackage(onboarding, awareness);

  // 2. Load unified relationship model (persona, tone, interaction rules)
  const relationship = await loadRelationshipConfig(
    "relationship.config.json"
  );

  // 4. Load AI memory (preferences, onboarding answers, personality)
  const memory = await loadAIMemory();

  // 5. Assemble unified identity bundle (MVP-safe)
  return {
    identity: AI_IDENTITY,

    carepackage,
    carepackageVersion: awareness.versionSnapshot,

    relationship,

    // ⭐ MVP-critical: AI memory
    memory
  };
}

/* ---------------------------------------------------------------------------
   Default Export
--------------------------------------------------------------------------- */
module.exports = {
  loadAIIdentity,
  AI_IDENTITY
};

/* ========================================================================
   End of File
========================================================================= */
