/* ========================================================================
   WingMan Backend File
   Path: C:\WingManBackend\BlackBox\message\message-router.cjs
   Alias: @backend-blackbox/message/message-router.cjs
   Role: Central message routing engine for BlackBox. Receives messages from
         gateway, autonomy, AI client, and relationship subsystems, then
         dispatches them to the correct handlers.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] message-router.cjs loaded");

// ---------------------------------------------------------------------------
// CommonJS imports (converted from ESM)
// ---------------------------------------------------------------------------
const { relationshipContext } =
  require("../relationship/runtime/relationship.context.cjs");

const { BlackBoxGate } =
  require("../blackbox.gateway.cjs");

const { buildWingManPrompt } =
  require("../ai/prompt.builder.cjs");

const { callWingManModel } =
  require("../ai/ai.client.cjs");
const { loadPermissions } = require("../core/settings/permissions.cjs");

/* ------------------------------------------------------------
   MessageRouter Class
------------------------------------------------------------ */
class MessageRouter {
  constructor(appController) {
    this.app = appController;
  }

  async route(message) {
    if (!message || typeof message !== "string") {
      throw new Error("MessageRouter: message must be a string");
    }

    if (!relationshipContext.isLoaded()) {
      throw new Error("MessageRouter: relationship model not loaded");
    }

    const relationship = relationshipContext.getModel();
    const runtime = relationship.runtime;

    /* ------------------------------------------------------------
       PHASE 0: Greeting Logic
    ------------------------------------------------------------ */
    const userMood = runtime.detectMoodFromMessage(message);
    const wingmanMood = runtime.updateWingManMood(userMood);
    const holiday = runtime.getDailyHoliday?.() ?? null;
    const onboardingDone = runtime.hasCompletedOnboarding?.() ?? false;

    const profile = runtime.getProfile?.() ?? {};
    const name = profile.name ?? null;
    const cats = profile.cats ?? null;

    let systemGreeting = null;

    if (!onboardingDone) {
      systemGreeting =
        "Hello! It's nice to be back in WingMan. Before we get started on anything, how about we get to know each other a bit first?";
    } else {
      const baseVariants = [
        name ? `Hey ${name}, good to see you again.` : `Hey there, welcome back.`,
        cats ? `How are the kitties doing today?` : null,
        `What’s on your mind today?`,
        `Ready to dive back in?`,
        `Let’s pick up where we left off.`
      ].filter(Boolean);

      const moodVariants = {
        frustrated: [
          "You sound a bit frustrated — want to ease into things together?",
          "Rough start? I'm here. We can take this step by step."
        ],
        low: [
          "You seem a little quiet today. Want to keep things relaxed?",
          "We can take it slow today if you’d like."
        ],
        quiet: [
          "Hey. You sound mellow — want to warm up together?",
          "We can keep things easy today."
        ],
        cautious: [
          "No rush — we can feel things out together.",
          "We’ll take this at your pace."
        ],
        bright: [
          "You’re bringing good energy today — I love it.",
          "You sound ready to roll!"
        ],
        neutral: []
      };

      const combined = [
        ...baseVariants,
        ...(moodVariants[userMood] ?? [])
      ];

      systemGreeting = combined[Math.floor(Math.random() * combined.length)];
    }

    if (holiday) {
      systemGreeting += ` ${holiday}`;
    }

    /* ------------------------------------------------------------
       PHASE 1: Pre-processing
    ------------------------------------------------------------ */
    const tone = runtime.getTone?.();
    const workStyle = runtime.getWorkStyle?.();
    const safetyMode = relationship.meta?.safety_mode;

    console.log("[WingMan] Routing message with:", {
      tone,
      workStyle,
      safetyMode,
      userMood,
      wingmanMood,
      holiday
    });

    /* ------------------------------------------------------------
       PHASE 2: Relationship-aware AI pipeline
    ------------------------------------------------------------ */
    const { systemPrompt, userMessage, meta } = buildWingManPrompt({
      message,
      greeting: systemGreeting,
      tone,
      workStyle,
      safetyMode,
      userMood,
      wingmanMood
    });

    const aiReply = await callWingManModel({
      systemPrompt,
      userMessage
    });

    /* ------------------------------------------------------------
       PHASE 3: Return structured response
    ------------------------------------------------------------ */
    return {
      reply: aiReply,
      meta: {
        ...meta,
        userMood,
        wingmanMood,
        holiday
      }
    };
  }
}

// ---------------------------------------------------------------------------
// Export (CommonJS)
// ---------------------------------------------------------------------------
module.exports = {
  MessageRouter
};
