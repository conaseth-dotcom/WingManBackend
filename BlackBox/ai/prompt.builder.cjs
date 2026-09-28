/* ========================================================================
   WingMan Backend File

   Alias: @backend-blackbox/ai/prompt.builder.cjs
   Role: Builds structured prompts for BlackBox AI actions. Merges autonomy
         state, relationship context, and message history into a unified
         prompt object for AI execution.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] prompt.builder.cjs loaded");

// ---------------------------------------------------------------------------
// CommonJS imports (converted from ESM)
// ---------------------------------------------------------------------------

// Relationship context
const { relationshipContext } =
  require("../relationship/runtime/relationship.context.cjs");

// JSON imports (CommonJS-safe)
const projectMap =
  require("../relationship/state/ai.project.map.json");

const understandingSnapshot =
  require("../relationship/state/ai.understanding.snapshot.json");

const preferences =
  require("../relationship/state/preferences.json");

const uiCommands =
  require("../ui/ui.commands.cjs");

const uiIntent =
  require("../ui/ui.intent.cjs");

const taskContract =
  require("../autonomy/task.contract.json");

// ---------------------------------------------------------------------------
// Prompt Builder
// ---------------------------------------------------------------------------
function buildWingManPrompt({
  message,
  greeting,
  tone,
  workStyle,
  safetyMode,
  userMood,
  wingmanMood
}) {
  if (!relationshipContext.isLoaded()) {
    throw new Error("buildWingManPrompt: relationship model not loaded");
  }

  const relationship = relationshipContext.getModel();
  const runtime = relationship.runtime;

  // Fallbacks if tone/workStyle/safetyMode weren't passed in
  const resolvedTone = tone ?? runtime.getTone?.();
  const resolvedWorkStyle = workStyle ?? runtime.getWorkStyle?.();
  const resolvedSafety =
    safetyMode ?? relationship.meta?.safety_mode ?? "standard";

  // ------------------------------------------------------------
  // Mood shaping
  // ------------------------------------------------------------
  let moodLine = null;

  if (wingmanMood) {
    moodLine = `WingMan mood: ${wingmanMood}`;
  }

  if (userMood) {
    moodLine = moodLine
      ? `${moodLine} | User mood: ${userMood}`
      : `User mood: ${userMood}`;
  }

  // ------------------------------------------------------------
  // Build system prompt
  // ------------------------------------------------------------
  const systemLines = [
    `You are ${relationship.identity.name}, ${relationship.identity.role}`,
    `Tone: ${resolvedTone} | Work style: ${resolvedWorkStyle} | Safety mode: ${resolvedSafety}`,
    `Onboarding message: ${relationship.onboarding.message}`,
    `You are operating inside WingMan, a shared human–AI workspace.`,
    `Follow the relationship model's intent, tone, and safety posture.`,
    `Be concrete, collaborative, and honest.`,
    `Project map loaded: ${projectMap.summary}`,
    `Understanding snapshot: ${understandingSnapshot.status}`,
    `User preferences: ${JSON.stringify(preferences)}`,
    `UI commands available: ${Object.keys(uiCommands).join(", ")}`,
    `UI intents available: ${Object.keys(uiIntent).join(", ")}`,
    `Task contract: ${taskContract.description}`
  ];

  // Insert greeting if provided
  if (greeting && typeof greeting === "string") {
    systemLines.push(`Greeting to user: ${greeting}`);
  }

  // Insert mood metadata if present
  if (moodLine) {
    systemLines.push(moodLine);
  }

  const systemPrompt = systemLines.join("\n");

  return {
    systemPrompt,
    userMessage: message,
    meta: {
      tone: resolvedTone,
      workStyle: resolvedWorkStyle,
      safetyMode: resolvedSafety,
      userMood,
      wingmanMood
    }
  };
}

// ---------------------------------------------------------------------------
// Export (CommonJS)
// ---------------------------------------------------------------------------
module.exports = {
  buildWingManPrompt
};
