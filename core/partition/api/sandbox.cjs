/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/WingManBackend/core/partition/api/sandbox.cjs
   Alias: @backend-core/partition/api/sandbox.cjs
   Role: Provides sandboxed access utilities for the WingManPartition.
         Ensures safe, isolated operations within the D: partition.

   Dependencies:
     - ../../state.cjs
     - ../../access/access.manager.cjs

   Architectural Notes:
     - Must enforce strict read/write boundaries.
     - Must never expose WingMan application files to AI write access.
     - All operations must remain deterministic and sandbox-contained.
========================================================================= */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  getTray,
  mountTray,
  refreshTray
} from "./trays.cjs";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to partition.config.json
const PARTITION_CONFIG_PATH = path.resolve(
  __dirname,
  "../config/partition.config.json"
);

/**
 * Load partition.config.json to find the AI partition root.
 */
function loadPartitionConfig() {
  const raw = fs.readFileSync(PARTITION_CONFIG_PATH, "utf8");
  return JSON.parse(raw);
}

/**
 * Ensure a directory exists.
 */
function ensureDir(p) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

/**
 * Copy a file or directory recursively.
 */
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    ensureDir(dest);
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(
        path.join(src, entry),
        path.join(dest, entry)
      );
    }
  } else {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
}

// ---------------------------------------------------------------------------
// Sandbox Registry (in-memory for now)
// ---------------------------------------------------------------------------

const SANDBOX_PROJECTS = {};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a sandbox project by copying files from a tray.
 */
export function createSandboxFromTray(projectName, trayId) {
  const tray = getTray(trayId);
  if (!tray) throw new Error(`Tray not found: ${trayId}`);

  // Ensure tray is mounted and items are fresh
  mountTray(trayId);
  refreshTray(trayId);

  const config = loadPartitionConfig();
  const aiRoot = path.normalize(config.partitions.ai.rootPath);

  // Sandbox folder path
  const sandboxId = `sandbox:${projectName}`;
  const sandboxPath = path.join(aiRoot, "sandboxes", projectName);

  ensureDir(sandboxPath);

  // Copy files from tray root into sandbox
  for (const item of tray.items) {
    const src = item.path;
    const dest = path.join(sandboxPath, item.name);
    copyRecursive(src, dest);
  }

  // Register metadata
  SANDBOX_PROJECTS[sandboxId] = {
    id: sandboxId,
    name: projectName,
    sourceTray: trayId,
    path: sandboxPath,
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    checkpoints: []
  };

  return SANDBOX_PROJECTS[sandboxId];
}

/**
 * Delete a sandbox project (filesystem + registry).
 */
export function deleteSandbox(sandboxId) {
  const sb = SANDBOX_PROJECTS[sandboxId];
  if (!sb) return false;

  // Delete folder recursively
  if (fs.existsSync(sb.path)) {
    fs.rmSync(sb.path, { recursive: true, force: true });
  }

  delete SANDBOX_PROJECTS[sandboxId];
  return true;
}

/**
 * List all sandbox projects.
 */
export function listSandboxProjects() {
  return Object.values(SANDBOX_PROJECTS);
}

/**
 * Get a sandbox project by id.
 */
export function getSandboxProject(sandboxId) {
  return SANDBOX_PROJECTS[sandboxId] || null;
}

/**
 * Update sandbox metadata.
 */
export function updateSandbox(sandboxId, updates) {
  const sb = SANDBOX_PROJECTS[sandboxId];
  if (!sb) throw new Error(`Sandbox not found: ${sandboxId}`);

  Object.assign(sb, updates, {
    lastUpdatedAt: new Date().toISOString()
  });

  return sb;
}

/**
 * BlackBox-required: return sandbox stats
 */
export function getSandboxStats(sandboxId) {
  const sb = SANDBOX_PROJECTS[sandboxId];
  if (!sb) return null;

  const exists = fs.existsSync(sb.path);
  const files = exists ? fs.readdirSync(sb.path) : [];

  return {
    id: sb.id,
    name: sb.name,
    createdAt: sb.createdAt,
    lastUpdatedAt: sb.lastUpdatedAt,
    fileCount: files.length,
    checkpointCount: sb.checkpoints.length
  };
}

/**
 * BlackBox-required: record a checkpoint
 */
export function recordSandboxCheckpoint(sandboxId, data = {}) {
  const sb = SANDBOX_PROJECTS[sandboxId];
  if (!sb) throw new Error(`Sandbox not found: ${sandboxId}`);

  const checkpoint = {
    timestamp: new Date().toISOString(),
    ...data
  };

  sb.checkpoints.push(checkpoint);
  sb.lastUpdatedAt = checkpoint.timestamp;

  return checkpoint;
}
