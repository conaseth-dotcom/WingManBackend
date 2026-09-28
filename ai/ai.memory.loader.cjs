// ai.memory.loader.cjs — loads AI memory from WingMan partition

const PartitionPaths = require("C:/WingManBackend/partition/api/partition.paths.cjs");
const PartitionFS = require("C:/WingManBackend/partition/api/partition.fs.cjs");

const MEMORY_FILE = PartitionPaths.getAiRoot() + "/memory.json";

async function loadAIMemory() {
  try {
    await PartitionFS.ensureFolder(PartitionPaths.getAiRoot());

    if (!(await PartitionFS.exists(MEMORY_FILE))) {
      await PartitionFS.writeFile(MEMORY_FILE, JSON.stringify({}));
      return {};
    }

    const raw = await PartitionFS.readFile(MEMORY_FILE);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error("[AIMemory] Failed to load memory:", err);
    return {};
  }
}

async function updateAIMemory(key, value) {
  try {
    const memory = await loadAIMemory();
    memory[key] = value;
    await PartitionFS.writeFile(MEMORY_FILE, JSON.stringify(memory, null, 2));
    return true;
  } catch (err) {
    console.error("[AIMemory] Failed to update memory:", err);
    return false;
  }
}

module.exports = {
  loadAIMemory,
  updateAIMemory
};
