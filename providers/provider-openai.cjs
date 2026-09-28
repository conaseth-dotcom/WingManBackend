// /WingManBackend/providers/provider-openai.cjs
console.log("[WM-FILE-LOAD] provider-openai.cjs loaded");

const OpenAI = require("openai");

async function createOpenAIProvider(apiKey, orgId = null, projectId = null) {
  console.log("[WM-OPENAI] createOpenAIProvider invoked");

  if (!apiKey) {
    console.log("[WM-OPENAI] ERROR — Missing API key");
    throw new Error("Missing API key for OpenAI.");
  }

  console.log("[WM-OPENAI] Initializing OpenAI client with:");
  console.log("  apiKey:", apiKey ? "(provided)" : "(missing)");
  console.log("  orgId:", orgId || "(none)");
  console.log("  projectId:", projectId || "(none)");

  const client = new OpenAI({
    apiKey,
    organization: orgId || undefined,
    project: projectId || undefined
  });

  return {
    name: "openai",

    async sendMessages(messages) {
      console.log("[WM-OPENAI] sendMessages invoked");
      console.log("[WM-OPENAI] Raw messages received:", messages);

      // Convert old message format to new "input" format
      const input = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      console.log("[WM-OPENAI] Converted input for Responses API:", input);

      console.log("[WM-OPENAI] Calling Responses API — client.responses.create()");
      let response;
      try {
        response = await client.responses.create({
          model: "gpt-4o-mini",
          input
        });
      } catch (err) {
        console.log("[WM-OPENAI] ERROR — Responses API call failed:", err);
        throw err;
      }

      console.log("[WM-OPENAI] Responses API returned:", response);

      // Responses API returns output differently
      const output = response.output_text || response.output?.[0]?.content || "";
      console.log("[WM-OPENAI] Final output extracted:", output);

      return output;
    }
  };
}

module.exports = {
  createOpenAIProvider
};
