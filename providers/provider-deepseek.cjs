// /WingManBackend/providers/provider-deepseek.cjs
console.log("[WM-FILE-LOAD] provider-deepseek.cjs loaded");

const OpenAI = require("openai");

/**
 * Unified factory:
 *  - apiKey: required
 *  - orgId, projectId: accepted for signature consistency, but unused by DeepSeek
 */
async function createDeepSeekProvider(apiKey, _orgId = null, _projectId = null) {
  console.log("[WM-DEEPSEEK] createDeepSeekProvider invoked");

  if (!apiKey) {
    console.log("[WM-DEEPSEEK] ERROR — Missing API key");
    throw new Error("Missing API key for DeepSeek.");
  }

  console.log("[WM-DEEPSEEK] Initializing DeepSeek client with apiKey (provided)");

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com"
  });

  return {
    name: "deepseek",

    /**
     * WingMan → DeepSeek message bridge
     * Expects messages in WingMan format:
     *   [{ role: "system"|"user"|"assistant", content: "..." }, ...]
     */
    async sendMessages(messages) {
      console.log("[WM-DEEPSEEK] sendMessages invoked");
      console.log("[WM-DEEPSEEK] Raw messages received:", messages);

      // Convert WingMan messages → DeepSeek/OpenAI format
      const converted = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      console.log("[WM-DEEPSEEK] Converted messages for DeepSeek:", converted);

      let completion;
      try {
        console.log("[WM-DEEPSEEK] Calling client.chat.completions.create()…");
        completion = await client.chat.completions.create({
          model: "deepseek-chat",
          messages: converted
        });
      } catch (err) {
        console.log("[WM-DEEPSEEK] ERROR — completions.create() failed:", err);
        throw err;
      }

      console.log("[WM-DEEPSEEK] completions.create() returned:", completion);

      const output =
        completion?.choices?.[0]?.message?.content ??
        completion?.choices?.[0]?.message?.text ??
        "";

      console.log("[WM-DEEPSEEK] Final output extracted:", output);

      return output;
    }
  };
}

module.exports = {
  createDeepSeekProvider
};
