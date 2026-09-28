const fs = require("fs");
const path = require("path");

const VOICE_ROOT = "C:/WingManBackend/voices";

function listVoices() {
  const categories = fs.readdirSync(VOICE_ROOT);

  const voices = [];

  for (const category of categories) {
    const categoryPath = path.join(VOICE_ROOT, category);

    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const items = fs.readdirSync(categoryPath);

    for (const item of items) {
      const itemPath = path.join(categoryPath, item);

      if (fs.statSync(itemPath).isDirectory()) {
        voices.push(`${category}:${item}`);
      }
    }
  }

  return voices;
}

module.exports = { listVoices };
