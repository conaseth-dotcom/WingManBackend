/* ========================================================================
   WingMan Backend File
   Path: C:/WingMan/projects/Electron/WingManBackend/core/access/access.levels.cjs
   Alias: @backend-core/access/access.levels.cjs
   Role: Defines numeric access levels for WingMan backend operations.
         Used by access.manager.cjs to validate permission thresholds.

   Dependencies:
     - ./access.rules.json

   Architectural Notes:
     - Levels must remain stable and deterministic.
     - Higher numbers represent deeper system privileges.
     - Must not encode user-specific or sensitive data.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] access.levels.cjs loaded");

export const ACCESS_LEVELS = {
  Level1: 1,
  Level2: 2,
  Level3: 3,
  Level4: 4,
  Level5: 5,
  Level6: 6
};
