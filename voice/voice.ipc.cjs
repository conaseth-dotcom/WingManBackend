// voice.ipc.cjs — clean backend IPC for Voice subsystem

import { ipcMain } from "electron";
/*import * as VoiceEngine from "./voice.engine.cjs";

/* Start listening (open microphone stream) 
ipcMain.handle("voice:startListening", async () => {
  return VoiceEngine.startListening();
});

/* Stop listening 
ipcMain.handle("voice:stopListening", async () => {
  return VoiceEngine.stopListening();
});
/* Get current mic/voice status 
ipcMain.handle("voice:getStatus", async () => {
  return VoiceEngine.getStatus();
});

/* Streaming transcript events 
VoiceEngine.onTranscript((data) => {
  // Push transcript chunks to renderer
  globalThis.mainWindow?.webContents.send("voice:transcript", data);
});

/* Microphone status events 
VoiceEngine.onMicStatus((data) => {
  globalThis.mainWindow?.webContents.send("voice:micStatus", data);
});
