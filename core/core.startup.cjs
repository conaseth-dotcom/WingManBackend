/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/WingManBackend/core/core.startup.cjs
   Alias: @backend-core/core.startup.cjs
   Role: Bootstraps the WingMan backend runtime. Initializes core subsystems,
         loads configuration, prepares BlackBox, and triggers the startup
         greeting pipeline.
========================================================================= */

import { loadTrayItems } from "@engine-core/tray.loader.cjs";
import * as AIEngine from "../ai/ai.engine.cjs";

console.log("[WingManOS] Startup: initializing…");

export async function WingManStartup() {
  try {
    console.log("[WingManOS] Startup: loading persistent data…");

    /* ------------------------------------------------------------
       Tray items
       ------------------------------------------------------------ */
    const tray1Items = await loadTrayItems("tray-1");
    window.TraySystem?.loadItems?.(tray1Items);
    console.log(`[WingManOS] Loaded ${tray1Items.length} tray items`);

    /* ------------------------------------------------------------
       AI context
       ------------------------------------------------------------ */
    const aiContext = await AIEngine.buildContext({
      includeFiles: false,
      identity: null
    });

    const aiNotes = aiContext.custom?.aiNotes || [];
    window.AISystem?.loadNotes?.(aiNotes);

    console.log(`[WingManOS] Loaded ${aiNotes.length} AI notes`);

    /* ------------------------------------------------------------
       Ready
       ------------------------------------------------------------ */
    console.log("[WingManOS] Startup complete.");
    window.WingManOnStartupComplete?.();

    // AI should start only after backend is fully ready
    window.WingManStartAI?.();

  } catch (err) {
    console.error("[WingManOS] Startup failed:", err);
  }
}

window.WingManOnReactReady = function () {
  console.log("[WingManOS] React ready — running startup sequence…");
  WingManStartup();
};
