// /WingManBackend/providers/provider-gemini.cjs
console.log("[WM-FILE-LOAD] provider-gemini.cjs loaded");

const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Unified factory:
 *  - apiKey: required
 *  - orgId, projectId: accepted for signature consistency, but unused by Gemini
 */
async function createGeminiProvider(apiKey, _orgId = null, _projectId = null) {
  console.log("[WM-GEMINI] createGeminiProvider invoked");

  if (!apiKey) {
    console.log("[WM-GEMINI] ERROR — Missing API key");
    throw new Error("Missing API key for Gemini.");
  }

  console.log("[WM-GEMINI] Initializing GoogleGenerativeAI client with apiKey (provided)");

  const client = new GoogleGenerativeAI(apiKey);

  // NOTE: model name should eventually come from provider metadata,
  // but for now we keep a sane default.
  const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

  return {
    name: "gemini",

    /**
     * WingMan → Gemini message bridge
     * Expects messages in WingMan format:
     *   [{ role: "system"|"user"|"assistant", content: "..." }, ...]
     */
    async sendMessages(messages) {
      console.log("[WM-GEMINI] sendMessages invoked");
      console.log("[WM-GEMINI] Raw messages received:", messages);

      // Convert WingMan messages into a single prompt string for now.
      // Later, this can be upgraded to structured content if needed.
      const prompt = messages
        .map(m => `${m.role}: ${m.content}`)
        .join("\n");

      console.log("[WM-GEMINI] Prompt constructed for Gemini:", prompt);

      let result;
      try {
        console.log("[WM-GEMINI] Calling model.generateContent()…");
        result = await model.generateContent(prompt);
      } catch (err) {
        console.log("[WM-GEMINI] ERROR — generateContent() call failed:", err);
        throw err;
      }

      console.log("[WM-GEMINI] generateContent() returned:", result);

      // Gemini SDK typically exposes text via response.text()
      const output =
        (result && result.response && typeof result.response.text === "function")
          ? result.response.text()
          : "";

      console.log("[WM-GEMINI] Final output extracted:", output);

      return output;
    }
  };
}

module.exports = {
  createGeminiProvider
};
