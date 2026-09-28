/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/ai/ai.loader.cjs
   Role:
     Load AI notes stored inside the WingMan partition.
     Backend-safe (no window, no preload APIs).
========================================================================= */

import { PartitionPaths } from "file:///C:/WingManBackend/partition/api/partition.paths.cjs";
import * as PartitionFS from "file:///C:/WingManBackend/partition/api/partition.fs.cjs";

/**
 * Load all AI notes from:
 * D:/WingManPartition/ai/notes/
 */
export async function loadAiNotes() {
  try {
    const notesFolder = PartitionPaths.getAiRoot() + "/notes";

    // Ensure folder exists
    await PartitionFS.ensureFolder(notesFolder);

    const entries = await PartitionFS.listFolder(notesFolder);
    const items = [];

    for (const entry of entries) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        const filePath = `${notesFolder}/${entry.name}`;
        const raw = await PartitionFS.readFile(filePath);

        if (raw) {
          try {
            items.push(JSON.parse(raw));
          } catch (err) {
            console.error("[AiLoader] Failed to parse JSON:", filePath, err);
          }
        }
      }
    }

    console.log(`[AiLoader] Loaded ${items.length} AI notes`);
    return items;

  } catch (err) {
    console.error("[AiLoader] Failed to load AI notes:", err);
    return [];
  }
}
