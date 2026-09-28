/* ========================================================================
   WingMan Backend File
   Alias: @backend-ai/ai.context.builder.cjs
   Role: Builds AI execution context by merging identity, runtime state,
         world model, relationship model, UI model, notes, and sandbox
         configuration into a unified context object.
========================================================================= */

const fs = require("fs");
const path = require("path");

const { buildMemorySummaryPrompt } = require("./ai.memory.personality.cjs");
const { createAISandbox } = require("../sandbox/ai.sandbox.cjs");

/* ---------------------------------------------------------------------------
   Load Carepackage Files (Static AI Orientation Data)
--------------------------------------------------------------------------- */
function loadCarepackage() {
  const base = "C:/WingManBackend/ai/carepackage";

  const safeRead = (p, json = false) => {
    try {
      const data = fs.readFileSync(p, "utf8");
      return json ? JSON.parse(data) : data;
    } catch {
      return json ? {} : "";
    }
  };

  return {
    manifest: safeRead(path.join(base, "manifest.snapshot.json"), true),
    version: safeRead(path.join(base, "version.snapshot.json"), true),
    continuityNotes: safeRead(path.join(base, "ai.continuity.notes.md")),
    deliveryInstructions: safeRead(path.join(base, "meta/delivery.instructions.md")),
    info: safeRead(path.join(base, "meta/carepackage.info.json"), true),
    interviewScript: safeRead(path.join(base, "project.interview.script.json"), true)
  };
}

/* ---------------------------------------------------------------------------
   Context Builder (Upgraded)
--------------------------------------------------------------------------- */
async function buildAIContext(session, options = {}) {
  if (!session) {
    throw new Error("[AIContextBuilder] Session object is required.");
  }

  const {
    includePartitions = true,
    includeIdentity = true,
    includeWorld = true,
    includeRelationship = true,
    includeUIModel = true,
    includeNotes = true,
    includeCarepackage = true
  } = options;

  // 1. Build sandbox (contains runtime)
  const sandbox = await createAISandbox(session);
  const runtime = sandbox.runtime;

  // 2. Load carepackage (static AI orientation)
  const carepackage = includeCarepackage ? loadCarepackage() : undefined;

  // 3. Assemble unified context
  const context = {
    identity: includeIdentity ? runtime.identity : undefined,
    carepackage,

    world: includeWorld ? runtime.world : undefined,

    relationship: includeRelationship ? runtime.relationship : undefined,
    relationshipRuntime: includeRelationship ? runtime.relationshipRuntime : undefined,

    onboarding: includeRelationship
      ? {
          completed: runtime.relationshipRuntime.hasCompletedOnboarding(),
          disclosures: runtime.relationshipRuntime.getOnboardingDisclosures?.() ?? []
        }
      : undefined,

    relationalBehavior: includeRelationship
      ? {
          tone: runtime.relationshipRuntime.getTone(),
          pace: runtime.relationshipRuntime.getWorkStyle(),
          proactivity: runtime.relationship?.communication?.proactivity,
          collaborationStyle: runtime.relationship?.collaboration?.style,
          safetyMode: runtime.relationship?.meta?.safety_mode ?? "standard",
          boundaries: runtime.relationship?.communication?.boundaries ?? [],
          personalContext: runtime.relationship?.personal ?? {}
        }
      : undefined,

    mood: includeRelationship
      ? runtime.relationshipRuntime.detectMoodFromMessage(session.lastUserMessage ?? "")
      : undefined,

    holiday: includeRelationship
      ? runtime.relationshipRuntime.getDailyHoliday?.() ?? null
      : undefined,

    uiModel: includeUIModel ? runtime.uiModel : undefined,

    notes: includeNotes ? runtime.notes : undefined,
    scratch: includeNotes ? runtime.scratch : undefined,

    memorySummary: undefined,

    session: {
      id: session.id,
      startedAt: session.startedAt,
      configVersion: session.configVersion
    },

    partitions: includePartitions
      ? {
          user: sandbox.getUserPartitionRoot(),
          shared: sandbox.getSharedPartitionRoot()
        }
      : undefined,

    boundaries: runtime.boundaries,
    capabilities: runtime.capabilities
  };

  /* ---------------------------------------------------------------
     Personality-aware Memory Summarization
  --------------------------------------------------------------- */
  if (includeNotes && runtime.notes) {
    try {
      const identity = runtime.identity;

      const memoryItems = {
        notes: runtime.notes,
        scratch: runtime.scratch,
        onboarding: runtime.relationshipRuntime?.getOnboardingDisclosures?.() ?? {},
        preferences: identity?.memory ?? {}
      };

      const prompt = buildMemorySummaryPrompt(identity, memoryItems);

      const summaryReply = await session.client.chat.completions.create({
        model: session.model,
        messages: [
          { role: "system", content: "WingMan Memory Summarization" },
          { role: "user", content: prompt }
        ],
        stream: false
      });

      const summary = summaryReply.choices?.[0]?.message?.content ?? "";
      context.memorySummary = summary;
    } catch (err) {
      console.error("[AIContextBuilder] Memory summarization failed:", err);
      context.memorySummary = "(Memory summary unavailable)";
    }
  }

  return context;
}

/* ---------------------------------------------------------------------------
   Prompt-Ready Summary (Upgraded)
--------------------------------------------------------------------------- */
async function buildAIContextSummary(session, options = {}) {
  const ctx = await buildAIContext(session, options);
  const lines = [];

  if (ctx.relationship) {
    lines.push(`Persona: ${ctx.relationship.persona ?? "N/A"}`);
  }

  if (ctx.relationalBehavior) {
    lines.push(`Tone: ${ctx.relationalBehavior.tone}`);
    lines.push(`Pace: ${ctx.relationalBehavior.pace}`);
    lines.push(`Proactivity: ${ctx.relationalBehavior.proactivity}`);
    lines.push(`Collaboration Style: ${ctx.relationalBehavior.collaborationStyle}`);
    lines.push(`Safety Mode: ${ctx.relationalBehavior.safetyMode}`);
    lines.push(`Boundaries: ${JSON.stringify(ctx.relationalBehavior.boundaries)}`);
    lines.push(`Personal Context: ${JSON.stringify(ctx.relationalBehavior.personalContext)}`);
  }

  if (ctx.onboarding) {
    lines.push(`Onboarding Completed: ${ctx.onboarding.completed}`);
  }

  if (ctx.world) {
    lines.push(`World Rooms: ${ctx.world.rooms?.length ?? 0}`);
  }

  if (ctx.uiModel) {
    lines.push(`UI Commands: ${ctx.uiModel.commands?.length ?? 0}`);
  }

  if (ctx.partitions) {
    lines.push(`User Partition Root: ${ctx.partitions.user}`);
    lines.push(`Shared Partition Root: ${ctx.partitions.shared}`);
  }

  lines.push("Boundaries:");
  for (const [key, value] of Object.entries(ctx.boundaries || {})) {
    lines.push(` - ${key}: ${value ? "ENABLED" : "DISABLED"}`);
  }

  if (ctx.memorySummary) {
    lines.push("Memory Summary:");
    lines.push(ctx.memorySummary);
  }

  return lines.join("\n");
}

module.exports = { buildAIContext, buildAIContextSummary };
