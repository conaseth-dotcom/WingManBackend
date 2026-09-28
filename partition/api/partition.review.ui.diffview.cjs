// core/partition/api/partition.review.ui.diffview.cjs
// WingMan Line-Level Diff Viewer Formatter — Phase 4 Implementation

import fs from "fs";
import path from "path";

import partitionConfig from "../config/partition.config.json" assert { type: "json" };
import { normalizePath } from "../paths/paths.cjs";
import { PartitionReview } from "./partition.review.cjs";

// Partition roots (updated to use partitionConfig directly)
const USER_ROOT   = normalizePath(partitionConfig.paths.user);
const SHARED_ROOT = normalizePath(partitionConfig.paths.shared);
const AI_ROOT     = normalizePath(partitionConfig.paths.ai);

/**
 * Read file safely (returns empty string if missing)
 */
function readFileSafe(filePath) {
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
}

/**
 * Produce a unified diff between two text blocks
 */
function diffLines(oldText, newText) {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  const diffs = [];
  let i = 0, j = 0;

  while (i < oldLines.length || j < newLines.length) {
    const oldLine = oldLines[i];
    const newLine = newLines[j];

    if (oldLine === newLine) {
      diffs.push({ type: "context", old: oldLine, new: newLine });
      i++; j++;
    } else if (oldLine !== undefined && newLine === undefined) {
      diffs.push({ type: "removed", old: oldLine, new: "" });
      i++;
    } else if (oldLine === undefined && newLine !== undefined) {
      diffs.push({ type: "added", old: "", new: newLine });
      j++;
    } else {
      diffs.push({ type: "removed", old: oldLine, new: "" });
      diffs.push({ type: "added", old: "", new: newLine });
      i++; j++;
    }
  }

  return diffs;
}

/**
 * Build a diff block for a single file
 */
function buildFileDiff(sourceRoot, targetRoot, relPath) {
  const sourceFile = path.join(sourceRoot, relPath);
  const targetFile = path.join(targetRoot, relPath);

  const oldText = readFileSafe(sourceFile);
  const newText = readFileSafe(targetFile);

  return {
    file: relPath,
    diffs: diffLines(oldText, newText)
  };
}

/**
 * Build diff blocks for a whole partition comparison
 */
function buildPartitionDiffs(sourceRoot, targetRoot, diffResult) {
  const blocks = [];

  for (const rel of diffResult.added) {
    blocks.push({
      file: rel,
      status: "added",
      diffs: diffLines("", readFileSafe(path.join(sourceRoot, rel)))
    });
  }

  for (const rel of diffResult.removed) {
    blocks.push({
      file: rel,
      status: "removed",
      diffs: diffLines(readFileSafe(path.join(targetRoot, rel)), "")
    });
  }

  for (const rel of diffResult.modified) {
    blocks.push({
      file: rel,
      status: "modified",
      ...buildFileDiff(sourceRoot, targetRoot, rel)
    });
  }

  return blocks;
}

/**
 * Produce a full diff-view model for the WingMan UI
 */

export function getDiffViewerModel() {
  const review = PartitionReview.runFullReview();

  return {
    aiToShared: buildPartitionDiffs(AI_ROOT, SHARED_ROOT, review.aiToShared),
    sharedToUser: buildPartitionDiffs(SHARED_ROOT, USER_ROOT, review.sharedToUser)
  };
}

export const PartitionDiffView = {
  getDiffViewerModel
};
