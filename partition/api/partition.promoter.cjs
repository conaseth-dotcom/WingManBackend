/* ========================================================================
   WingMan Backend File
   Path: C:/WingMan/projects/Electron/WingManBackend/partition/api/partition.promoter.cjs
   Alias: @backend-partition/api/partition.promoter.cjs
   Role: Promotion engine for modern WingMan architecture.
         Uses modern partition paths + alias imports.
========================================================================= */

// partition/api → partition/api
import { PartitionReview } from "./partition.review.cjs";
import { PartitionMerge } from "./partition.merge.cjs";
import { PartitionValidator } from "./partition.validator.cjs";

// partition/api → partition/api (UI modules also live here)
import { PartitionDiffView } from "./partition.review.ui.diffview.cjs";

// partition/api → storage.cjs (storage is in partition/api or partition/storage)
import { PartitionStorage } from "./storage.cjs";


/* ------------------------------------------------------------
   Safety rules
   ------------------------------------------------------------ */
const SafetyRules = {
  requireValidation: true,
  requireReviewBeforeMerge: true,
  logAllPromotions: true
};

/* ------------------------------------------------------------
   Pre‑promotion check
   ------------------------------------------------------------ */
export function runPrePromotionCheck() {
  const review = PartitionReview.runFullReview();

  const hasChanges =
    review.aiToShared.added.length ||
    review.aiToShared.removed.length ||
    review.aiToShared.modified.length ||
    review.sharedToUser.added.length ||
    review.sharedToUser.removed.length ||
    review.sharedToUser.modified.length;

  return { ok: hasChanges, hasChanges, review };
}

/* ------------------------------------------------------------
   Promotion preview model
   ------------------------------------------------------------ */
export function getPromotionPreview() {
  return {
    diffs: PartitionDiffView.getDiffViewerModel()
  };
}

/* ------------------------------------------------------------
   Safe‑save enforcement
   ------------------------------------------------------------ */
export function enforceSafeSave() {
  const validation = PartitionValidator.validateAll([]);

  if (!validation.ok) {
    return { ok: false, stage: "validation", errors: validation.errors };
  }

  const pre = runPrePromotionCheck();

  if (!pre.ok) {
    return { ok: false, stage: "pre-promotion", errors: ["No changes to promote."] };
  }

  return { ok: true, stage: "ready", errors: [] };
}

/* ------------------------------------------------------------
   Perform promotion
   ------------------------------------------------------------ */
export function promoteChanges(options = {}) {
  const safety = enforceSafeSave();

  if (!safety.ok) {
    return { ok: false, safety, merge: null };
  }

  const mergeResult = PartitionMerge.runFullMerge(options);

  if (SafetyRules.logAllPromotions) {
    PartitionStorage.saveSessionLog({
      type: "promotion",
      safety,
      mergeResult
    });
  }

  return { ok: true, safety, mergeResult };
}

/* ------------------------------------------------------------
   Public API
   ------------------------------------------------------------ */
export const PartitionPromoter = {
  SafetyRules,
  runPrePromotionCheck,
  getPromotionPreview,
  enforceSafeSave,
  promoteChanges
};
