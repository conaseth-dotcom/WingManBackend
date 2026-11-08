// WingManBackend/api/voiceProfile.cjs
// Narrow backend API for user-owned Voice Wizard profile data.

'use strict';

const express = require("express");
const fs = require("fs");
const path = require("path");

const PartitionPaths = require("../partition/api/partition.paths.cjs");

const router = express.Router();

// ------------------------------------------------------------
// Ensure the user voice directory exists
// ------------------------------------------------------------
function ensureVoiceDirectory() {
  const voiceRoot = PartitionPaths.getUserVoiceRoot();

  if (!fs.existsSync(voiceRoot)) {
    fs.mkdirSync(voiceRoot, { recursive: true });
  }

  return voiceRoot;
}

function loadProfileFile() {
  const profilePath = PartitionPaths.getUserVoiceProfilePath();

  if (!fs.existsSync(profilePath)) {
    return {};
  }

  const raw = fs.readFileSync(profilePath, "utf8");
  return JSON.parse(raw);
}

function saveProfileFile(profile) {
  const profilePath = PartitionPaths.getUserVoiceProfilePath();
  const temporaryPath = `${profilePath}.tmp`;

  fs.writeFileSync(
    temporaryPath,
    JSON.stringify(profile, null, 2),
    "utf8"
  );

  fs.renameSync(temporaryPath, profilePath);
}

// ------------------------------------------------------------
// GET /api/voice-profile
// Load the user's current Voice Wizard profile.
// ------------------------------------------------------------
router.get("/", (_req, res) => {
  try {
    ensureVoiceDirectory();

   const profile = loadProfileFile();

    return res.json({
      ok: true,
      profile: profile || {}
    });
  } catch (err) {
    console.error("[VoiceProfileAPI] Load failed:", err);

    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

// ------------------------------------------------------------
// PUT /api/voice-profile
// Save the complete user Voice Wizard profile.
// ------------------------------------------------------------
router.put("/", (req, res) => {
  try {
    const profile = req.body;

    if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
      return res.status(400).json({
        ok: false,
        error: "Voice profile must be a JSON object."
      });
    }

    ensureVoiceDirectory();

    saveProfileFile(profile);
    return res.json({
      ok: true
    });
  } catch (err) {
    console.error("[VoiceProfileAPI] Save failed:", err);

    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

module.exports = router;