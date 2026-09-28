ipcMain.handle("ai:chat", async (_event, { sessionId, message, history = [] } = {}) => {
  try {
    let fullReply = "";

    const result = await AIPipeline.chat({
      sessionId,
      message,
      history,
      onChunk: (chunk) => {
        fullReply += chunk;
        mainWindow?.webContents.send("ai:replyChunk", chunk);
      }
    });

    const payload = {
      ok: result.ok,
      fullReply: result.fullReply ?? fullReply,
      latencyMs: result.latencyMs ?? 0
    };

    mainWindow?.webContents.send("ai:reply", payload);
    return payload;
  } catch (err) {
    console.error("[AI IPC] chat error:", err);
    const payload = { ok: false, error: err.message };
    mainWindow?.webContents.send("ai:reply", payload);
    return payload;
  }
});
