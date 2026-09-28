// ai.keys.cjs — Modern Multi-Key Storage (CommonJS)

const { safeStorage, app } = require("electron");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ------------------------------------------------------------
// Path Helpers
// ------------------------------------------------------------
function keysFilePath() {
  return path.join(app.getPath("userData"), "wm.keys.json");
}

// ------------------------------------------------------------
// Read / Write Store
// ------------------------------------------------------------
function readStore() {
  try {
    const p = keysFilePath();
    if (!fs.existsSync(p)) return {};
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return {};
  }
}

function writeStore(data) {
  const p = keysFilePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function uuid() {
  return crypto.randomUUID();
}

function ensureProvider(store, provider) {
  if (!store[provider]) store[provider] = [];
}

// ------------------------------------------------------------
// LIST KEYS
// ------------------------------------------------------------
function listKeys(provider) {
  const store = readStore();
  ensureProvider(store, provider);
  return store[provider];
}

// ------------------------------------------------------------
// SAVE NAMED KEY
// ------------------------------------------------------------
function saveNamedKey(provider, name, plainKey) {
  if (!provider || !plainKey)
    return { ok: false, error: "provider and key are required" };

  if (!safeStorage.isEncryptionAvailable())
    return { ok: false, error: "OS-level encryption unavailable" };

  const encrypted = safeStorage.encryptString(plainKey).toString("base64");
  const store = readStore();
  ensureProvider(store, provider);

  const id = uuid();

  store[provider].push({
    id,
    name: name || "(unnamed key)",
    encrypted,
    isDefault: store[provider].length === 0 // first key becomes default
  });

  writeStore(store);
  return { ok: true, id };
}

// ------------------------------------------------------------
// DELETE KEY
// ------------------------------------------------------------
function deleteKey(provider, keyId) {
  const store = readStore();
  ensureProvider(store, provider);

  store[provider] = store[provider].filter(k => k.id !== keyId);

  // If default was deleted, promote first key
  if (!store[provider].some(k => k.isDefault) && store[provider].length > 0) {
    store[provider][0].isDefault = true;
  }

  writeStore(store);
  return { ok: true };
}

// ------------------------------------------------------------
// RENAME KEY
// ------------------------------------------------------------
function renameKey(provider, keyId, newName) {
  const store = readStore();
  ensureProvider(store, provider);

  const key = store[provider].find(k => k.id === keyId);
  if (!key) return { ok: false, error: "Key not found" };

  key.name = newName;
  writeStore(store);
  return { ok: true };
}

// ------------------------------------------------------------
// GET KEY (decrypt)
// ------------------------------------------------------------
function getKey(provider, keyId) {
  const store = readStore();
  ensureProvider(store, provider);

  const key = store[provider].find(k => k.id === keyId);
  if (!key) return { ok: false, error: "Key not found" };

  try {
    const plain = safeStorage.decryptString(Buffer.from(key.encrypted, "base64"));
    return { ok: true, key: plain };
  } catch (err) {
    return { ok: false, error: "Decryption failed" };
  }
}

// ------------------------------------------------------------
// SET DEFAULT KEY
// ------------------------------------------------------------
function setDefaultKey(provider, keyId) {
  const store = readStore();
  ensureProvider(store, provider);

  store[provider].forEach(k => (k.isDefault = false));

  const key = store[provider].find(k => k.id === keyId);
  if (!key) return { ok: false, error: "Key not found" };

  key.isDefault = true;
  writeStore(store);
  return { ok: true };
}

// ------------------------------------------------------------
// GET DEFAULT KEY
// ------------------------------------------------------------
function getDefaultKey(provider) {
  const store = readStore();
  ensureProvider(store, provider);

  const key = store[provider].find(k => k.isDefault);
  return key || null;
}

// ------------------------------------------------------------
// EXPORTS
// ------------------------------------------------------------
module.exports = {
  listKeys,
  saveNamedKey,
  deleteKey,
  renameKey,
  getKey,
  setDefaultKey,
  getDefaultKey
};
