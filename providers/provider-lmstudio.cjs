// /WingManBackend/providers/provider-lmstudio.cjs
console.log("[WM-FILE-LOAD] provider-lmstudio.cjs loaded");

/**
 * Unified factory:
 *  - apiKey: unused (LM Studio is local)
 *  - orgId, projectId: unused
 */
async function createLMStudioProvider(_apiKey = null, _orgId = null, _projectId = null) {
  console.log("[WM-LMSTUDIO] createLMStudioProvider invoked");

  const baseURL = process.env.LMSTUDIO_URL || "http://localhost:1234/v1";
  const model = process.env.LMSTUDIO_MODEL || "default";

  console.log("[WM-LMSTUDIO] Using baseURL:", baseURL);
  console.log("[WM-LMSTUDIO] Using model:", model);

  return {
    name: "lmstudio",

    /**
     * WingMan → LM Studio message bridge
     * Expects messages in WingMan format:
     *   [{ role: "system"|"user"|"assistant", content: "..." }, ...]
     */
    async sendMessages(messages) {
      console.log("[WM-LMSTUDIO] sendMessages invoked");
      console.log("[WM-LMSTUDIO] Raw messages received:", messages);

      // Convert WingMan messages → LM Studio/OpenAI format
      const converted = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      console.log("[WM-LMSTUDIO] Converted messages:", converted);

      let response;
      try {
        console.log("[WM-LMSTUDIO] Calling LM Studio /chat/completions…");

        response = await fetch(`${baseURL}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: converted
          })
        });
      } catch (err) {
        console.log("[WM-LMSTUDIO] ERROR — fetch() failed:", err);
        throw err;
      }

      let data;
      try {
        data = await response.json();
      } catch (err) {
        console.log("[WM-LMSTUDIO] ERROR — response.json() failed:", err);
        throw err;
      }

      console.log("[WM-LMSTUDIO] LM Studio returned:", data);

      const output =
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.message?.text ??
        "";

      console.log("[WM-LMSTUDIO] Final output extracted:", output);

      return output;
    }
  };
}

module.exports = {
  createLMStudioProvider
};
