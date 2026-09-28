// ============================================================
// Backend Tray Index
// Aggregates backend tray modules for Electron backend.
// ============================================================

// Core backend tray modules
import "./tray.persistence.cjs";
import "./tray.loader.cjs";
import "./trays.cjs";

// Partition tray API (backend-side)
import "./partition.trays.cjs";

console.log("[TrayIndex] Backend tray subsystem loaded.");
