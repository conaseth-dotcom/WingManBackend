// ========================================================================
// WingMan AI Identity Manager — Care Package Loader
// Path: C:/WingManBackend/ai/identity/ai.carepackage.cjs
// ========================================================================

import fs from "fs";
import path from "path";

const BLACKBOX_REL = "C:/WingManBackend/BlackBox";
const CAREPACKAGE_ROOT = "C:/WingManBackend/ai/carepackage";

function safeLoadJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("[AI CarePackage] Failed to load:", filePath, err);
    return null;
  }
}

function safeLoadText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.error("[AI CarePackage] Failed to load:", filePath, err);
    return "";
  }
}

/* ------------------------------------------------------------
   Load Group A — Onboarding Package (full load)
------------------------------------------------------------ */
export function loadOnboardingPackage() {
  const core = path.join(BLACKBOX_REL, "core");
  const meta = path.join(BLACKBOX_REL, "meta");

  const onboarding = {
    profile: safeLoadJSON(path.join(core, "profile.json")),
    communication: safeLoadJSON(path.join(core, "communication.json")),
    collaboration: safeLoadJSON(path.join(core, "collaboration.json")),
    ethics: safeLoadJSON(path.join(core, "ethics.json")),
    flow: safeLoadJSON(path.join(core, "flow.json")),
    initialization: safeLoadJSON(path.join(core, "initialization.json")),
    onboarding: safeLoadJSON(path.join(core, "onboarding.json")),
    priorities: safeLoadJSON(path.join(core, "priorities.json")),
    memory: safeLoadJSON(path.join(core, "memory.json")),
    projectManifest: safeLoadJSON(path.join(meta, "project.manifest.json")),

    // Carepackage files
    carePackageInfo: safeLoadJSON(path.join(CAREPACKAGE_ROOT, "meta", "carepackage.info.json")),
    interviewScript: safeLoadJSON(path.join(CAREPACKAGE_ROOT, "project.interview.script.json"))
  };

  return onboarding;
}

/* ------------------------------------------------------------
   Load Group B — Awareness Package (metadata only)
------------------------------------------------------------ */
export function loadAwarenessPackage() {
  const awareness = {
    continuityNotes: safeLoadText(path.join(CAREPACKAGE_ROOT, "ai.continuity.notes.md")),
    manifestSnapshot: safeLoadJSON(path.join(CAREPACKAGE_ROOT, "manifest.snapshot.json")),
    versionSnapshot: safeLoadJSON(path.join(CAREPACKAGE_ROOT, "version.snapshot.json")),
    deliveryInstructions: safeLoadText(path.join(CAREPACKAGE_ROOT, "meta", "delivery.instructions.md")),

    // BlackBox state files
    understandingSnapshot: safeLoadJSON(path.join(BLACKBOX_REL, "state", "ai.understanding.snapshot.json")),
    projectMap: safeLoadJSON(path.join(BLACKBOX_REL, "state", "ai.project.map.json")),
    preferences: safeLoadJSON(path.join(BLACKBOX_REL, "state", "preferences.json"))
  };

  return awareness;
}

/* ------------------------------------------------------------
   Merge identity objects
------------------------------------------------------------ */
export function mergeCarePackage(onboarding, awareness) {
  return {
    identityVersion: "1.0",
    timestamp: Date.now(),
    onboarding,
    awareness
  };
}
