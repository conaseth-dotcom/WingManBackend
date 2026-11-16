/* ========================================================================
   WingMan Backend File

   Alias: @backend-ai/ai.memory.loader.cjs
   Role: Load and update AI memory inside the initialized WingMan Partition.

   Important:
     - Partition paths are resolved lazily, after PartitionPaths.init().
     - No repository or host path is hardcoded here.
     - Uses the current PartitionFS result-object API.
========================================================================= */

'use strict';

const path = require('path');
const PartitionPaths = require('../partition/api/partition.paths.cjs');
const PartitionFS = require('../partition/api/partition.fs.cjs');

function getMemoryPaths() {
  const aiRoot = PartitionPaths.getAiRoot();
  return {
    aiRoot,
    memoryFile: path.join(aiRoot, 'memory.json')
  };
}

async function loadAIMemory() {
  try {
    const { aiRoot, memoryFile } = getMemoryPaths();
    const ensured = await PartitionFS.ensureFolder(aiRoot);

    if (ensured?.ok === false) {
      throw new Error(ensured.error || 'Could not ensure the AI memory folder.');
    }

    const result = await PartitionFS.readFile(memoryFile);

    // Lazy mode intentionally returns no file data. Treat that as no loaded
    // memory rather than manufacturing persistence that did not occur.
    if (result?.ok === true && result.data == null) {
      return {};
    }

    if (!result || result.ok !== true) {
      // A missing memory file represents an empty initial memory state.
      if (result?.error === 'File does not exist') {
        return {};
      }
      throw new Error(result?.error || 'Could not read AI memory.');
    }

    const raw = Buffer.isBuffer(result.data)
      ? result.data.toString('utf8')
      : String(result.data || '');

    if (!raw.trim()) return {};

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch (err) {
    console.error('[AIMemory] Failed to load memory:', err);
    return {};
  }
}

async function updateAIMemory(key, value) {
  try {
    if (typeof key !== 'string' || !key.trim()) {
      throw new Error('A non-empty memory key is required.');
    }

    const { aiRoot, memoryFile } = getMemoryPaths();
    const ensured = await PartitionFS.ensureFolder(aiRoot);

    if (ensured?.ok === false) {
      throw new Error(ensured.error || 'Could not ensure the AI memory folder.');
    }

    const memory = await loadAIMemory();
    memory[key] = value;

    const written = await PartitionFS.writeFile(
      memoryFile,
      JSON.stringify(memory, null, 2)
    );

    if (!written || written.ok !== true) {
      throw new Error(written?.error || 'Could not write AI memory.');
    }

    return true;
  } catch (err) {
    console.error('[AIMemory] Failed to update memory:', err);
    return false;
  }
}

module.exports = {
  loadAIMemory,
  updateAIMemory
};
