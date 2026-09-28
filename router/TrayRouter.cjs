// C:\WingManBackend\WingManBackend\router\TrayRouter.cjs

import { TrayConductor } from "../conductor/TrayConductor.cjs";
import { PartitionFS } from "../partition/api/partition.fs.cjs";

// Create one conductor instance for the whole backend.
const conductor = new TrayConductor();

/* ------------------------------------------------------------
   TrayRouter — Public API exposed to Electron Main
------------------------------------------------------------ */
export const TrayRouter = {
  conductor, // <-- EXPOSED NOW

  route(action, payload) {
    console.log("[TrayRouter] route:", action, payload);

    switch (action) {
      case "addToTray":
        console.log("[TrayRouter] addToTray → calling TrayConductor.add()");
        return conductor.add(payload);

      case "openInRadialMap":
        console.log("[TrayRouter] openInRadialMap → calling PartitionFS.readFolderTree()");
        return PartitionFS.readFolderTree(payload.path);

      case "removeTray":
        console.log("[TrayRouter] removeTray requested.");
        return { ok: false, reason: "remove-not-implemented" };

      case "verifyTray":
        console.log("[TrayRouter] verifyTray requested.");
        return { ok: false, reason: "verify-not-implemented" };

      default:
        console.error("[TrayRouter] Unknown tray action:", action);
        throw new Error(`Unknown tray action: ${action}`);
    }
  },
};
