// WingManBackend/api/providers.cjs
// ------------------------------------------------------------
// Provider Credential API (multi-key + secure storage)
// ------------------------------------------------------------
console.log("[WM-FILE-LOAD] providers.cjs loaded");

const express = require("express");
const axios = require("axios");
const path = require("path");

// Storage + metadata
const credentialStore = require("../storage/credentialStore.cjs");
const providerKeyStore = require("../storage/providerKeyStore.cjs");

// Secure settings (for aiSetup)
const { SettingsRouter } = require("../router/SettingsRouter.cjs");

const router = express.Router();

/* ============================================================
   Utility: safe key prefix (for logging)
============================================================ */
function keyPrefix(apiKey) {
  if (!apiKey) return "<null>";
  const trimmed = String(apiKey).trim();
  return trimmed.slice(0, 8) + (trimmed.length > 8 ? "…" : "");
}

/* ============================================================
   Key scrubbing
============================================================ */

function scrubKey(apiKey) {
  if (!apiKey) return apiKey;

  let cleaned = apiKey.trim();

  // Remove common prefixes (project keys, user keys, org/user IDs)
  cleaned = cleaned.replace(/^sk-proj-[a-zA-Z0-9_-]+:/, "");
  cleaned = cleaned.replace(/^sk-[a-zA-Z0-9_-]+:/, "");
  cleaned = cleaned.replace(/^proj-[a-zA-Z0-9_-]+:/, "");
  cleaned = cleaned.replace(/^org-[a-zA-Z0-9_-]+:/, "");
  cleaned = cleaned.replace(/^user-[a-zA-Z0-9_-]+:/, "");

  // Strip zero-width and whitespace
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, "");
  cleaned = cleaned.replace(/\s+/g, "");

  console.log("[ProvidersAPI] SCRUB — original prefix:", keyPrefix(apiKey), "cleaned prefix:", keyPrefix(cleaned));

  return cleaned;
}

/* ============================================================
   Provider test helper (OpenAI-focused for now)
   Uses Responses API so project keys are valid.
============================================================ */
async function attemptProviderTest(providerId, apiKey, orgId, projectId) {
  console.log(
    `[ProvidersAPI] attemptProviderTest — providerId: ${providerId}, keyLength: ${apiKey?.length}, keyPrefix: ${keyPrefix(apiKey)}`
  );

  if (!apiKey) {
    console.log("[ProvidersAPI] attemptProviderTest FAIL — missing API key");
    return { ok: false, error: "Missing API key" };
  }

  if (providerId !== "openai") {
    console.log(
      `[ProvidersAPI] attemptProviderTest FAIL — validation not implemented for provider '${providerId}'`
    );
    return { ok: false, error: `Validation not yet implemented for provider '${providerId}'.` };
  }

  try {
    const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,

    // REQUIRED FOR sk-proj- KEYS
    "OpenAI-Organization": orgId || undefined,
    "OpenAI-Project": projectId || undefined
  };

    const payload = {
      model: "gpt-4o-mini",
      input: "ping"
    };

    console.log("[ProvidersAPI] attemptProviderTest REQUEST — endpoint: /v1/responses, payload:", payload);

    const response = await axios.post("https://api.openai.com/v1/responses", payload, { headers });

    console.log(
      "[ProvidersAPI] attemptProviderTest SUCCESS — status:",
      response.status,
      "keyPrefix:",
      keyPrefix(apiKey)
    );

    return { ok: true };
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;

    console.log(
      "[ProvidersAPI] attemptProviderTest ERROR —",
      "message:", err.message,
      "status:", status
    );
    console.log("[ProvidersAPI] attemptProviderTest ERROR BODY —", JSON.stringify(data, null, 2));

    return {
      ok: false,
      error: data?.error?.message || err.message
    };
  }
}


/* ============================================================
   Helpers for key lookup
============================================================ */

function resolveKeyEntry(providerId, index, nickname) {
  console.log(
    `[ProvidersAPI] resolveKeyEntry — providerId: ${providerId}, index: ${index}, nickname: ${nickname}`
  );

  const keys = providerKeyStore.listProviderKeys(providerId);
  console.log("[ProvidersAPI] resolveKeyEntry — available keys:", keys.length);

  if (typeof index === "number") {
    if (index < 0 || index >= keys.length) {
      console.log("[ProvidersAPI] resolveKeyEntry FAIL — invalid index");
      return { ok: false, error: "Invalid key index" };
    }
    console.log("[ProvidersAPI] resolveKeyEntry SUCCESS — resolved by index");
    return { ok: true, entry: keys[index], index };
  }

  if (typeof nickname === "string") {
    const idx = keys.findIndex(k => k.nickname === nickname);
    if (idx === -1) {
      console.log("[ProvidersAPI] resolveKeyEntry FAIL — nickname not found");
      return { ok: false, error: "Nickname not found for provider" };
    }
    console.log("[ProvidersAPI] resolveKeyEntry SUCCESS — resolved by nickname");
    return { ok: true, entry: keys[idx], index: idx };
  }

  console.log("[ProvidersAPI] resolveKeyEntry FAIL — neither index nor nickname provided");
  return { ok: false, error: "Either index or nickname is required" };
}

/* ============================================================
   POST /api/providers/saveCredential
============================================================ */
router.post("/saveCredential", (req, res) => {
  const { providerId, nickname, apiKey, orgId, projectId } = req.body;

  console.log(
    `[ProvidersAPI] SAVE — providerId: ${providerId}, nickname: ${nickname}, rawKeyLength: ${apiKey?.length}, rawPrefix: ${keyPrefix(apiKey)}`
  );

  if (!providerId || !nickname || !apiKey) {
    console.log("[ProvidersAPI] SAVE FAIL — missing fields");
    return res.json({ ok: false, error: "providerId, nickname, and apiKey are required" });
  }

  const cleanedKey = scrubKey(apiKey);
  const scrubbed = cleanedKey !== apiKey;

  console.log(
    "[ProvidersAPI] SAVE — cleanedKeyLength:",
    cleanedKey.length,
    "cleanedPrefix:",
    keyPrefix(cleanedKey),
    "scrubbed:",
    scrubbed
  );

  // Save full key object (apiKey + orgId + projectId)
  const saveResult = credentialStore.saveKey({
    apiKey: cleanedKey,
    orgId: orgId || null,
    projectId: projectId || null
  });

  if (!saveResult.ok) {
    console.log(`[ProvidersAPI] SAVE FAIL — secure storage error: ${saveResult.error}`);
    return res.json({ ok: false, error: saveResult.error || "Failed to save key" });
  }

  const { credentialId } = saveResult;
  console.log("[ProvidersAPI] SAVE — credentialId:", credentialId);

  // Save metadata (nickname + credentialId + orgId + projectId)
  const metaResult = providerKeyStore.addProviderKey(
    providerId,
    nickname,
    credentialId,
    { orgId, projectId }
  );

  if (!metaResult.ok) {
    console.log(`[ProvidersAPI] SAVE FAIL — metadata error: ${metaResult.error}`);
    credentialStore.deleteKey(credentialId);
    return res.json({ ok: false, error: metaResult.error || "Failed to register provider key" });
  }

  console.log(
    `[ProvidersAPI] SAVE SUCCESS — providerId: ${providerId}, nickname: ${nickname}, credentialId: ${credentialId}`
  );

  return res.json({
    ok: true,
    scrubbed,
    providerId,
    nickname,
    credentialId
  });
});

/* ============================================================
   GET /api/providers/list
============================================================ */

router.get("/list", (req, res) => {
  const providerId = req.query.providerId;

  console.log(`[ProvidersAPI] LIST — providerId: ${providerId}`);

  if (!providerId) {
    console.log("[ProvidersAPI] LIST FAIL — missing providerId");
    return res.json({ ok: false, error: "providerId is required" });
  }

  const keys = providerKeyStore.listProviderKeys(providerId);
  const defaultEntry = providerKeyStore.getDefaultProviderKey(providerId);

  console.log(
    `[ProvidersAPI] LIST SUCCESS — providerId: ${providerId}, keyCount: ${keys.length}, defaultNickname: ${defaultEntry?.nickname ?? null}`
  );

  return res.json({
    ok: true,
    providerId,
    keys,
    defaultNickname: defaultEntry?.nickname ?? null
  });
});

router.get("/resolve", (req, res) => {
  const { providerId, nickname } = req.query;

  if (!providerId || !nickname) {
    return res.json({ ok: false, error: "providerId and nickname are required" });
  }

  const resolved = resolveKeyEntry(providerId, null, nickname);
  if (!resolved.ok) {
    return res.json({ ok: false, error: resolved.error });
  }

  const { entry } = resolved;
  const keyResult = credentialStore.getKey(entry.credentialId);

  if (!keyResult.ok) {
    return res.json({ ok: false, error: keyResult.error });
  }

  const { apiKey, orgId, projectId } = keyResult.key;

  return res.json({
    ok: true,
    providerId,
    nickname,
    apiKey,
    orgId,
    projectId
  });
});

/* ============================================================
   POST /api/providers/testConnection
============================================================ */

router.post("/testConnection", async (req, res) => {
  const { providerId, index, nickname } = req.body;

  console.log(
    `[ProvidersAPI] VALIDATION START — providerId: ${providerId}, index: ${index}, nickname: ${nickname}`
  );

  if (!providerId) {
    console.log("[ProvidersAPI] VALIDATION FAIL — missing providerId");
    return res.json({ ok: false, error: "providerId is required" });
  }

  const resolved = resolveKeyEntry(providerId, index, nickname);
  if (!resolved.ok) {
    console.log(`[ProvidersAPI] VALIDATION FAIL — key lookup error: ${resolved.error}`);
    return res.json({ ok: false, error: resolved.error });
  }

  const { entry, index: resolvedIndex } = resolved;
  console.log(
    "[ProvidersAPI] VALIDATION — resolved entry:",
    { nickname: entry.nickname, credentialId: entry.credentialId, index: resolvedIndex }
  );

  const keyResult = credentialStore.getKey(entry.credentialId);
  if (!keyResult.ok) {
    console.log(`[ProvidersAPI] VALIDATION FAIL — secure storage error: ${keyResult.error}`);
    return res.json({ ok: false, error: keyResult.error || "Failed to retrieve key" });
  }

  const { apiKey, orgId, projectId } = keyResult.key;
  const originalKey = apiKey;

  console.log(
    `[ProvidersAPI] VALIDATION — testing raw key for providerId: ${providerId}, keyPrefix: ${keyPrefix(originalKey)}`
  );

  const first = await attemptProviderTest(providerId, originalKey, orgId, projectId);
  if (first.ok) {
    console.log(
      `[ProvidersAPI] VALIDATION SUCCESS — raw key accepted for providerId: ${providerId}, keyPrefix: ${keyPrefix(originalKey)}`
    );

    SettingsRouter.route("save-all", {
      aiSetup: {
        provider: providerId,
        nickname: entry.nickname,
        aiReady: true
      }
    });

    return res.json({
      ok: true,
      scrubbed: false,
      providerId,
      index: resolvedIndex,
      nickname: entry.nickname,
      message: "Key validated successfully."
    });
  }

  console.log(
    `[ProvidersAPI] VALIDATION — raw key rejected: ${first.error}, keyPrefix: ${keyPrefix(originalKey)}`
  );

  const cleanedKey = scrubKey(originalKey);

  if (cleanedKey === originalKey) {
    console.log("[ProvidersAPI] VALIDATION FAIL — scrubbing did not change key");
    return res.json({
      ok: false,
      scrubbed: false,
      providerId,
      index: resolvedIndex,
      nickname: entry.nickname,
      error: first.error || "Provider rejected the API key."
    });
  }

  console.log(
    `[ProvidersAPI] VALIDATION — testing scrubbed key for providerId: ${providerId}, cleanedPrefix: ${keyPrefix(cleanedKey)}`
  );

  const second = await attemptProviderTest(providerId, cleanedKey, orgId, projectId);

  if (second.ok) {
    console.log(
      `[ProvidersAPI] VALIDATION SUCCESS — scrubbed key accepted for providerId: ${providerId}, cleanedPrefix: ${keyPrefix(cleanedKey)}`
    );

    SettingsRouter.route("save-all", {
      aiSetup: {
        provider: providerId,
        nickname: entry.nickname,
        aiReady: true
      }
    });

    return res.json({
      ok: true,
      scrubbed: true,
      providerId,
      index: resolvedIndex,
      nickname: entry.nickname,
      message: "Key scrubbed and validated successfully."
    });
  }

  console.log(
    `[ProvidersAPI] VALIDATION FAIL — scrubbed key rejected: ${second.error}, cleanedPrefix: ${keyPrefix(cleanedKey)}`
  );

  return res.json({
    ok: false,
    scrubbed: true,
    providerId,
    index: resolvedIndex,
    nickname: entry.nickname,
    error: second.error || "Provider rejected the cleaned API key."
  });
});

/* ============================================================
   POST /api/providers/setDefault
============================================================ */

router.post("/setDefault", (req, res) => {
  const { providerId, index } = req.body;

  console.log(`[ProvidersAPI] SET DEFAULT — providerId: ${providerId}, index: ${index}`);

  if (!providerId || typeof index !== "number") {
    console.log("[ProvidersAPI] SET DEFAULT FAIL — missing fields");
    return res.json({ ok: false, error: "providerId and numeric index are required" });
  }

  const result = providerKeyStore.setDefaultProviderKey(providerId, index);
  if (!result.ok) {
    console.log(`[ProvidersAPI] SET DEFAULT FAIL — ${result.error}`);
    return res.json({ ok: false, error: result.error || "Failed to set default key" });
  }

  console.log(`[ProvidersAPI] SET DEFAULT SUCCESS — providerId: ${providerId}, index: ${index}`);

  return res.json({ ok: true, providerId, index });
});

/* ============================================================
   POST /api/providers/deleteCredential
============================================================ */

router.post("/deleteCredential", (req, res) => {
  const { providerId, index } = req.body;

  console.log(`[ProvidersAPI] DELETE — providerId: ${providerId}, index: ${index}`);

  if (!providerId || typeof index !== "number") {
    console.log("[ProvidersAPI] DELETE FAIL — missing fields");
    return res.json({ ok: false, error: "providerId and numeric index are required" });
  }

  const keys = providerKeyStore.listProviderKeys(providerId);
  if (index < 0 || index >= keys.length) {
    console.log("[ProvidersAPI] DELETE FAIL — invalid index");
    return res.json({ ok: false, error: "Invalid key index" });
  }

  const entry = keys[index];

  const metaResult = providerKeyStore.deleteProviderKey(providerId, index);
  if (!metaResult.ok) {
    console.log(`[ProvidersAPI] DELETE FAIL — metadata error: ${metaResult.error}`);
    return res.json({ ok: false, error: metaResult.error || "Failed to delete provider key" });
  }

  credentialStore.deleteKey(entry.credentialId);

  console.log(
    `[ProvidersAPI] DELETE SUCCESS — providerId: ${providerId}, index: ${index}, credentialId: ${entry.credentialId}`
  );

  return res.json({ ok: true, providerId, index });
});

/* ============================================================
   POST /api/providers/renameCredential
============================================================ */

router.post("/renameCredential", (req, res) => {
  const { providerId, index, newNickname } = req.body;

  console.log(
    `[ProvidersAPI] RENAME — providerId: ${providerId}, index: ${index}, newNickname: ${newNickname}`
  );

  if (!providerId || typeof index !== "number" || !newNickname) {
    console.log("[ProvidersAPI] RENAME FAIL — missing fields");
    return res.json({ ok: false, error: "providerId, numeric index, and newNickname are required" });
  }

  const result = providerKeyStore.renameProviderKey(providerId, index, newNickname);
  if (!result.ok) {
    console.log(`[ProvidersAPI] RENAME FAIL — ${result.error}`);
    return res.json({ ok: false, error: result.error || "Failed to rename provider key" });
  }

  console.log(
    `[ProvidersAPI] RENAME SUCCESS — providerId: ${providerId}, index: ${index}, newNickname: ${newNickname}`
  );

  return res.json({ ok: true, providerId, index, nickname: newNickname });
});

module.exports = router;
