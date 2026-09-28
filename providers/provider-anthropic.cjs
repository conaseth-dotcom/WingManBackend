// /WingManBackend/providers/provider-anthropic.cjs
console.log("[WM-FILE-LOAD] provider-anthropic.cjs loaded");

const Anthropic = require("@anthropic-ai/sdk");

/**
 * Unified factory:
 *  - apiKey: required
 *  - orgId, projectId: accepted for signature consistency, but unused by Anthropic
 */
async function createAnthropicProvider(apiKey, _orgId = null, _projectId = null) {
  console.log("[WM-ANTHROPIC] createAnthropicProvider invoked");

  if (!apiKey) {
    console.log("[WM-ANTHROPIC] ERROR — Missing API key");
    throw new Error("Missing API key for Anthropic.");
  }

  console.log("[WM-ANTHROPIC] Initializing Anthropic client with apiKey (provided)");

  const client = new Anthropic({ apiKey });

  return {
    name: "anthropic",

    /**
     * WingMan → Anthropic message bridge
     * Expects messages in WingMan format:
     *   [{ role: "system"|"user"|"assistant", content: "..." }, ...]
     */
    async sendMessages(messages) {
      console.log("[WM-ANTHROPIC] sendMessages invoked");
      console.log("[WM-ANTHROPIC] Raw messages received:", messages);

      // Convert WingMan messages → Anthropic Claude 3 format
      const converted = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      console.log("[WM-ANTHROPIC] Converted messages for Claude 3:", converted);

      let completion;
      try {
        console.log("[WM-ANTHROPIC] Calling client.messages.create()…");
        completion = await client.messages.create({
          model: "claude-3-sonnet-20240229",
          max_tokens: 1024,
          messages: converted
        });
      } catch (err) {
        console.log("[WM-ANTHROPIC] ERROR — messages.create() failed:", err);
        throw err;
      }

      console.log("[WM-ANTHROPIC] messages.create() returned:", completion);

      // Claude 3 returns content blocks like:
      //   [{ type: "text", text: "..." }]
      const output =
        completion?.content?.[0]?.text ??
        completion?.content?.[0]?.content ??
        "";

      console.log("[WM-ANTHROPIC] Final output extracted:", output);

      return output;
    }
  };
}

module.exports = {
  createAnthropicProvider
};
