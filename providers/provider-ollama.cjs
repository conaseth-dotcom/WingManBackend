// /WingManBackend/providers/provider-ollama.cjs
console.log("[WM-FILE-LOAD] provider-ollama.cjs loaded");

/**
 * Unified factory:
 *  - apiKey: unused (Ollama is local)
 *  - orgId, projectId: unused
 */
async function createOllamaProvider(_apiKey = null, _orgId = null, _projectId = null) {
  console.log("[WM-OLLAMA] createOllamaProvider invoked");

  const baseURL = process.env.OLLAMA_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "llama3";

  console.log("[WM-OLLAMA] Using baseURL:", baseURL);
  console.log("[WM-OLLAMA] Using model:", model);

  return {
    name: "ollama",

    /**
     * WingMan → Ollama message bridge
     * Expects messages in WingMan format:
     *   [{ role: "system"|"user"|"assistant", content: "..." }, ...]
     */
    async sendMessages(messages) {
      console.log("[WM-OLLAMA] sendMessages invoked");
      console.log("[WM-OLLAMA] Raw messages received:", messages);

      // Convert WingMan messages → Ollama prompt format
      const prompt = messages
        .map(m => `${m.role}: ${m.content}`)
        .join("\n");

      console.log("[WM-OLLAMA] Prompt constructed:", prompt);

      let response;
      try {
        console.log("[WM-OLLAMA] Calling Ollama /api/generate…");

        response = await fetch(`${baseURL}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            prompt
          })
        });
      } catch (err) {
        console.log("[WM-OLLAMA] ERROR — fetch() failed:", err);
        throw err;
      }

      let data;
      try {
        data = await response.json();
      } catch (err) {
        console.log("[WM-OLLAMA] ERROR — response.json() failed:", err);
        throw err;
      }

      console.log("[WM-OLLAMA] Ollama returned:", data);

      const output =
        data?.response ??
        data?.output ??
        "";

      console.log("[WM-OLLAMA] Final output extracted:", output);

      return output;
    }
  };
}

module.exports = {
  createOllamaProvider
};
