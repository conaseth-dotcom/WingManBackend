// ========================================================================
// WingMan AI Identity Manager — Unified Identity
// Path: C:/WingManBackend/ai/identity/ai.identity.cjs
// ========================================================================

import { loadOnboardingPackage, loadAwarenessPackage, mergeCarePackage } from "./ai.carepackage.cjs";
import { runOnboardingIfNeeded } from "./ai.onboarding.cjs";
import { loadMemoryState, saveMemoryState } from "./ai.memory.cjs";

let AI_IDENTITY = null;

/* ------------------------------------------------------------
   Load full identity (called at AI session start)
------------------------------------------------------------ */
export async function loadAIIdentity() {
  const onboarding = loadOnboardingPackage();
  const awareness = loadAwarenessPackage();
  const memory = loadMemoryState();

  AI_IDENTITY = mergeCarePackage(onboarding, awareness);

  // Attach memory
  AI_IDENTITY.memory = memory;

  // Run onboarding if needed
  await runOnboardingIfNeeded(AI_IDENTITY);

  return AI_IDENTITY;
}

/* ------------------------------------------------------------
   Get identity (runtime)
------------------------------------------------------------ */
export function getAIIdentity() {
  return AI_IDENTITY;
}

/* ------------------------------------------------------------
   Update memory and persist
------------------------------------------------------------ */
export function updateAIMemory(key, value) {
  if (!AI_IDENTITY) return;

  AI_IDENTITY.memory[key] = value;
  saveMemoryState(AI_IDENTITY.memory);
}
