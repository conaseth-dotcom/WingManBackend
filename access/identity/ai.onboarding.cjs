// ========================================================================
// WingMan AI Identity Manager — Onboarding Engine
// Path: C:/WingManBackend/ai/identity/ai.onboarding.cjs
// ========================================================================

import fs from "fs";
import path from "path";

const STATE_PATH = "C:/WingManBackend/BlackBox/relationship/runtime/onboarding.state.json";

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch {
    return { completed: false };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

/* ------------------------------------------------------------
   Run onboarding interview if needed
------------------------------------------------------------ */
export async function runOnboardingIfNeeded(identity) {
  const state = loadState();

  if (state.completed) return;

  const script = identity.onboarding.interviewScript;
  if (!script || !Array.isArray(script.questions)) return;

  // This is where WingMan will ask the AI questions
  // and the AI will respond, building memory.
  // For now, we simply mark onboarding as complete.
  // Later, you can integrate this with your AI runtime.

  state.completed = true;
  saveState(state);
}
