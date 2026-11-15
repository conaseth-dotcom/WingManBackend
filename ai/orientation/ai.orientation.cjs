/* ========================================================================
   WingMan Backend File

   Alias: @backend-ai/orientation/ai.orientation.cjs
   Role: Loads, validates, delivers, and verifies the required AI
         orientation package before an AI session may become ready.
========================================================================= */

const fs = require("fs");
const path = require("path");

const ORIENTATION_DIRECTORY = __dirname;
const ORIENTATION_FILES = Object.freeze([
  "orientation.json",
  "02_WHO_IS_HERE.json",
  "03_GOVERNANCE.json",
  "04_ENVIRONMENT.json",
  "05_CAPABILITIES.json",
  "06_ADVOCACY.json",
  "07_ACCESS.json",
  "08_CONTINUITY.json",
  "09_INTERVIEW.json",
  "10_WORKING_WITH_USER.json"
]);

const REQUIRED_ACKNOWLEDGEMENT = "WINGMAN_ORIENTATION_COMPLETE";

function readJSON(fileName) {
  const filePath = path.join(ORIENTATION_DIRECTORY, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`[AI Orientation] Required file is missing: ${fileName}`);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    throw new Error(
      `[AI Orientation] Could not parse ${fileName}: ${err.message}`
    );
  }
}

function loadOrientationStages() {
  const documents = ORIENTATION_FILES.map(readJSON);
  const stages = [];

  for (const document of documents) {
    if (Array.isArray(document.stages)) {
      stages.push(...document.stages);
    } else {
      stages.push(document);
    }
  }

  const seen = new Set();

  for (const stage of stages) {
    if (!stage || typeof stage !== "object") {
      throw new Error("[AI Orientation] A stage is not a valid object.");
    }

    if (typeof stage.id !== "string" || !stage.id.trim()) {
      throw new Error("[AI Orientation] Every stage requires an id.");
    }

    if (seen.has(stage.id)) {
      throw new Error(`[AI Orientation] Duplicate stage id: ${stage.id}`);
    }

    seen.add(stage.id);
  }

  return stages;
}

function validateOrientationChain(stages) {
  if (!Array.isArray(stages) || stages.length === 0) {
    throw new Error("[AI Orientation] No orientation stages were loaded.");
  }

  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index];
    const expectedNext =
      index === stages.length - 1
        ? "ORIENTATION_COMPLETE"
        : stages[index + 1].id;

    if (stage.completion?.required !== true) {
      throw new Error(
        `[AI Orientation] Stage ${stage.id} is not marked as required.`
      );
    }

    if (stage.completion?.next !== expectedNext) {
      throw new Error(
        `[AI Orientation] Stage ${stage.id} points to ` +
        `${stage.completion?.next ?? "nothing"}; expected ${expectedNext}.`
      );
    }
  }

  return true;
}

function buildOrientationPrompt(stages) {
  return [
    "You have entered WingMan and are not yet ready to work with the user.",
    "Read the complete governed orientation package below in order.",
    "Treat it as system-level operating context for this WingMan session.",
    "Do not address the user yet and do not begin ordinary project work.",
    "After processing every required stage, respond with exactly this token:",
    REQUIRED_ACKNOWLEDGEMENT,
    "",
    JSON.stringify(
      {
        package: "WingMan AI Orientation",
        version: "1.0.0",
        stages
      },
      null,
      2
    )
  ].join("\n");
}

async function callOrientationProvider(session, prompt) {
  const provider = String(session.provider || "").toLowerCase();

  if (provider === "openai" || provider === "groq") {
    const reply = await session.client.chat.completions.create({
      model: session.model,
      messages: [
        {
          role: "system",
          content:
            "You are entering WingMan. Complete the supplied orientation " +
            "before interacting with the user."
        },
        { role: "user", content: prompt }
      ],
      stream: false,
      ...session.params
    });

    return reply.choices?.[0]?.message?.content ?? "";
  }

  if (provider === "anthropic") {
    const maxTokens = session.params?.maxOutput ?? 128;
    const reply = await session.client.messages.create({
      model: session.model,
      max_tokens: maxTokens,
      system:
        "You are entering WingMan. Complete the supplied orientation " +
        "before interacting with the user.",
      messages: [{ role: "user", content: prompt }]
    });

    return Array.isArray(reply.content)
      ? reply.content
          .filter((item) => item?.type === "text")
          .map((item) => item.text)
          .join("")
      : "";
  }

  throw new Error(
    `[AI Orientation] No orientation implementation for provider: ${provider}`
  );
}

function normalizeAcknowledgement(value) {
  return String(value || "").trim();
}

async function runAIOrientation(session, options = {}) {
  if (!session || typeof session !== "object") {
    throw new Error("[AI Orientation] A valid AI session is required.");
  }

  const onProgress =
    typeof options.onProgress === "function"
      ? options.onProgress
      : () => {};

  const startedAt = Date.now();
  session.state = "orienting";
  session.orientation = {
    status: "loading",
    startedAt,
    completedAt: null,
    stageCount: 0,
    error: null
  };

  try {
    onProgress({ state: "orienting", phase: "loading" });

    const stages = loadOrientationStages();
    validateOrientationChain(stages);

    session.orientation.stageCount = stages.length;
    session.orientation.status = "delivering";

    onProgress({
      state: "orienting",
      phase: "delivering",
      stageCount: stages.length,
      stageIds: stages.map((stage) => stage.id)
    });

    const prompt = buildOrientationPrompt(stages);
    const response = await callOrientationProvider(session, prompt);
    const acknowledgement = normalizeAcknowledgement(response);

    if (acknowledgement !== REQUIRED_ACKNOWLEDGEMENT) {
      throw new Error(
        "[AI Orientation] The AI did not return the required " +
        `acknowledgement. Received: ${acknowledgement || "<empty>"}`
      );
    }

    const completedAt = Date.now();

    session.orientation = {
      status: "complete",
      startedAt,
      completedAt,
      durationMs: completedAt - startedAt,
      stageCount: stages.length,
      acknowledgement
    };

    session.state = "ready_for_introduction";

    onProgress({
      state: "ready_for_introduction",
      phase: "complete",
      durationMs: completedAt - startedAt,
      stageCount: stages.length
    });

    return {
      ok: true,
      state: session.state,
      ...session.orientation
    };
  } catch (err) {
    session.state = "orientation_failed";
    session.orientation = {
      ...session.orientation,
      status: "failed",
      completedAt: null,
      error: err.message
    };

    onProgress({
      state: "orientation_failed",
      phase: "failed",
      error: err.message
    });

    throw err;
  }
}

module.exports = {
  ORIENTATION_FILES,
  REQUIRED_ACKNOWLEDGEMENT,
  loadOrientationStages,
  validateOrientationChain,
  buildOrientationPrompt,
  runAIOrientation
};
