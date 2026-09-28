// WingManBackend/storage/providerKeyStore.cjs
// ------------------------------------------------------------
// Provider → Nickname → CredentialId Mapping
// (Non-sensitive metadata only)
// ------------------------------------------------------------
console.log(">>> BACKEND INSTANCE: providerKeyStore.cjs");
const fs = require("fs");
const path = require("path");

// ------------------------------------------------------------
// Path Helpers
// ------------------------------------------------------------
const SETTINGS_DIR = path.join(__dirname, "settings");
const FILE_PATH = path.join(SETTINGS_DIR, "providerKeys.json");

// ------------------------------------------------------------
// Load / Save JSON
// ------------------------------------------------------------
function loadJSON() {
  try {
    if (!fs.existsSync(FILE_PATH)) return {};
    return JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveJSON(data) {
  fs.mkdirSync(SETTINGS_DIR, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf8");
}

// ------------------------------------------------------------
// Ensure provider entry exists
// ------------------------------------------------------------
function ensureProvider(store, provider) {
  if (!store[provider]) {
    store[provider] = {
      defaultKey: null,
      keys: [] // { nickname, credentialId }
    };
  }
}

function listProviderKeys(provider) {
  const store = loadJSON();
  ensureProvider(store, provider);

  // Backward compatibility: older entries may not have orgId/projectId
  return store[provider].keys.map(entry => ({
    nickname: entry.nickname,
    credentialId: entry.credentialId,
    orgId: entry.orgId || null,
    projectId: entry.projectId || null
  }));
}


// ------------------------------------------------------------
// ADD NEW KEY (nickname + credentialId + orgId + projectId)
// ------------------------------------------------------------
function addProviderKey(provider, nickname, credentialId, extra = {}) {
  const store = loadJSON();
  ensureProvider(store, provider);

  const { orgId = null, projectId = null } = extra;

  store[provider].keys.push({
    nickname,
    credentialId,
    orgId,
    projectId
  });

  // First key becomes default
  if (store[provider].defaultKey === null) {
    store[provider].defaultKey = 0;
  }

  saveJSON(store);
  return { ok: true };
}
  if (provider === "anthropic") {
    return apiKey.startsWith("sk-ant-");
}

// ------------------------------------------------------------
// DELETE KEY
// ------------------------------------------------------------
function deleteProviderKey(provider, index) {
  const store = loadJSON();
  ensureProvider(store, provider);

  if (index < 0 || index >= store[provider].keys.length) {
    return { ok: false, error: "Invalid key index" };
  }

  store[provider].keys.splice(index, 1);

  // Fix defaultKey
  if (store[provider].keys.length === 0) {
    store[provider].defaultKey = null;
  } else if (store[provider].defaultKey === index) {
    store[provider].defaultKey = 0;
  } else if (store[provider].defaultKey > index) {
    store[provider].defaultKey -= 1;
  }

  saveJSON(store);
  return { ok: true };
}

// ------------------------------------------------------------
// RENAME KEY
// ------------------------------------------------------------
function renameProviderKey(provider, index, newNickname) {
  const store = loadJSON();
  ensureProvider(store, provider);

  if (index < 0 || index >= store[provider].keys.length) {
    return { ok: false, error: "Invalid key index" };
  }

  store[provider].keys[index].nickname = newNickname;
  saveJSON(store);
  return { ok: true };
}

// ------------------------------------------------------------
// SET DEFAULT KEY
// ------------------------------------------------------------
function setDefaultProviderKey(provider, index) {
  const store = loadJSON();
  ensureProvider(store, provider);

  if (index < 0 || index >= store[provider].keys.length) {
    return { ok: false, error: "Invalid key index" };
  }

  store[provider].defaultKey = index;
  saveJSON(store);
  return { ok: true };
}

// ------------------------------------------------------------
// GET DEFAULT KEY ENTRY
// ------------------------------------------------------------
function getDefaultProviderKey(provider) {
  const store = loadJSON();
  ensureProvider(store, provider);

  const idx = store[provider].defaultKey;
  if (idx === null) return null;

  const entry = store[provider].keys[idx];
  if (!entry) return null;

  return {
    nickname: entry.nickname,
    credentialId: entry.credentialId,
    orgId: entry.orgId || null,
    projectId: entry.projectId || null
  };
}


// ------------------------------------------------------------
// EXPORTS
// ------------------------------------------------------------
module.exports = {
  listProviderKeys,
  addProviderKey,
  deleteProviderKey,
  renameProviderKey,
  setDefaultProviderKey,
  getDefaultProviderKey
};
