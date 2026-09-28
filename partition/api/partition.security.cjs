// C:\WingManBackend\partition\security\partition.security.cjs

/**
 * AI Permission Enforcement
 * -------------------------
 * This module enforces AI access rules based on tray.json metadata.
 *
 * AI permissions:
 *   - "hidden"   → AI cannot see or access the tray/project at all
 *   - "read"     → AI can read metadata and file contents
 *   - "write"    → AI can read/write/delete files and metadata
 *
 * Hidden flag:
 *   - "hidden": true → UI-only hiding (renderer hides the tray)
 */

export function enforceAIPermissions(meta, action) {
  const aiPerm = meta?.permissions?.ai || "read";

  // Completely hidden from AI
  if (aiPerm === "hidden") {
    return { ok: false, reason: "ai-hidden" };
  }

  // Read-only enforcement
  if (aiPerm === "read") {
    if (action === "write" || action === "delete" || action === "modify") {
      return { ok: false, reason: "ai-readonly" };
    }
  }

  // Write allowed
  return { ok: true };
}
