// WingManBackend/storage/credentialStore.cjs
// ------------------------------------------------------------
// Secure API Key Storage (AES-256-GCM, Node.js backend-safe)
// ------------------------------------------------------------
console.log("[WM-FILE-LOAD] credintialStore.cjs loaded");
console.log(">>> BACKEND INSTANCE: A — credintialStore.cjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ------------------------------------------------------------
// Paths
// ------------------------------------------------------------
const STORAGE_DIR = path.join(__dirname, "..", "storage", "secure");
const STORE_PATH = path.join(STORAGE_DIR, "wm.securekeys.json");
const MASTER_KEY_PATH = path.join(STORAGE_DIR, "master.key");

// ------------------------------------------------------------
// Ensure storage directory exists
// ------------------------------------------------------------
fs.mkdirSync(STORAGE_DIR, { recursive: true });

// ------------------------------------------------------------
// Master Encryption Key (AES-256-GCM)
// ------------------------------------------------------------
function loadMasterKey() {
  if (fs.existsSync(MASTER_KEY_PATH)) {
    return fs.readFileSync(MASTER_KEY_PATH);
  }

  const key = crypto.randomBytes(32); // 256-bit key
  fs.writeFileSync(MASTER_KEY_PATH, key);
  return key;
}

const MASTER_KEY = loadMasterKey();

// ------------------------------------------------------------
// Read / Write encrypted key store
// ------------------------------------------------------------
function readStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) return {};
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeStore(data) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function uuid() {
  return crypto.randomUUID();
}

// AES-256-GCM encryption
function encrypt(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", MASTER_KEY, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64")
  };
}

// AES-256-GCM decryption
function decrypt(entry) {
  try {
    const iv = Buffer.from(entry.iv, "base64");
    const tag = Buffer.from(entry.tag, "base64");
    const encrypted = Buffer.from(entry.data, "base64");

    const decipher = crypto.createDecipheriv("aes-256-gcm", MASTER_KEY, iv);
    decipher.setAuthTag(tag);

    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return plain.toString("utf8");
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// CREATE / SAVE KEY (encrypted)
// ------------------------------------------------------------
function saveKey(keyObject) {
  if (!keyObject || typeof keyObject !== "object") {
    return { ok: false, error: "Key object is required" };
  }

  const { apiKey, orgId, projectId } = keyObject;

  if (!apiKey) {
    return { ok: false, error: "API key is required" };
  }

  const store = readStore();
  const credentialId = uuid();

  // Store all fields as a JSON string
  const plainText = JSON.stringify({
    apiKey,
    orgId: orgId || null,
    projectId: projectId || null
  });

  const encryptedEntry = encrypt(plainText);
  store[credentialId] = encryptedEntry;

  writeStore(store);

  return { ok: true, credentialId };
}

// ------------------------------------------------------------
// RETRIEVE KEY (decrypt)
// ------------------------------------------------------------
function getKey(credentialId) {
  const store = readStore();
  const entry = store[credentialId];

  if (!entry) {
    return { ok: false, error: "Credential not found" };
  }

  const plain = decrypt(entry);
  if (!plain) {
    return { ok: false, error: "Decryption failed" };
  }

  try {
    const parsed = JSON.parse(plain);

    return {
      ok: true,
      key: {
        apiKey: parsed.apiKey,
        orgId: parsed.orgId || null,
        projectId: parsed.projectId || null
      }
    };
  } catch {
    // BACKWARD COMPATIBILITY:
    // Old keys were stored as raw strings, not JSON.
    return {
      ok: true,
      key: {
        apiKey: plain,
        orgId: null,
        projectId: null
      }
    };
  }
}

// ------------------------------------------------------------
// DELETE KEY
// ------------------------------------------------------------
function deleteKey(credentialId) {
  const store = readStore();
  if (store[credentialId]) {
    delete store[credentialId];
    writeStore(store);
  }
  return { ok: true };
}

// ------------------------------------------------------------
// EXPORTS
// ------------------------------------------------------------
module.exports = {
  saveKey,
  getKey,
  deleteKey
};
