// ========================================================================
// WingMan AI Identity Manager — Memory Engine
// Path: C:/WingManBackend/ai/identity/ai.memory.cjs
// ========================================================================

import fs from "fs";

const MEMORY_PATH = "C:/WingManBackend/BlackBox/relationship/state/memory.json";

/* ------------------------------------------------------------
   Load memory
------------------------------------------------------------ */
export function loadMemoryState() {
  try {
    const raw = fs.readFileSync(MEMORY_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------
   Save memory
------------------------------------------------------------ */
export function saveMemoryState(memory) {
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
}
