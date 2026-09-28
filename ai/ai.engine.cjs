// ai.engine.cjs — unified WingMan AI engine (pipeline-powered)

// ────────────────────────────────────────────────────────────────
// Imports: Real AI pipeline + context builder
// ────────────────────────────────────────────────────────────────
import * as AIPipeline from "./ai.pipeline.cjs";
import * as AIContextBuilder from "./ai.context.builder.cjs";

// ────────────────────────────────────────────────────────────────
// Public: buildContext(options)
// ────────────────────────────────────────────────────────────────
export async function buildContext(options = {}) {
  try {
    const context = await AIContextBuilder.buildAIContext(null, {
      includePartitions:   options.includeFiles ?? true,
      includeCarepackage:  true,
      includeIdentity:     true,
      includeWorld:        true,
      includeRelationship: true,
      includeProjectState: true,
      includeUIModel:      true,
      includeNotes:        true
    });

    return context;
  } catch (err) {
    console.error("[AIEngine] buildContext failed:", err);
    return { ok: false, error: err.message };
  }
}

// ────────────────────────────────────────────────────────────────
// Public: runRequest(prompt, context)
// ────────────────────────────────────────────────────────────────
export async function runRequest(prompt, context = {}) {
  try {
    // 1. Create a provider session
    const session = await AIPipeline.connect({
      provider: context.provider ?? "openai",
      apiKey:   context.apiKey,
      model:    context.model,
      params:   context.params
    });

    if (!session.ok) {
      return { ok: false, error: session.error };
    }

    const sessionId = session.sessionId;

    // 2. Run chat through the real pipeline
    const reply = await AIPipeline.chat({
      sessionId,
      message: prompt,
      history: context.history ?? [],
      onChunk: (chunk) => {
        // Stream output chunks to renderer
        const win = globalThis.mainWindow;
        if (win && !win.isDestroyed()) {
          win.webContents.send("ai:replyChunk", chunk);
        }
      }
    });

    // 3. Close session
    AIPipeline.disconnect({ sessionId });

    // 4. Push final reply to renderer
    const win = globalThis.mainWindow;
    if (win && !win.isDestroyed()) {
      win.webContents.send("ai:reply", reply);
    }

    return reply;

  } catch (err) {
    console.error("[AIEngine] runRequest failed:", err);
    return { ok: false, error: err.message };
  }
}
