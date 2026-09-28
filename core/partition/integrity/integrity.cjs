// C:\WingManBackend\core\partition\integrity.cjs
const fs = require("fs");
const path = require("path");

const PARTITION_ROOT = "D:/WingManPartition/metaData";
const GOLDEN_ROOT = "<WingMan backend>/core/partition/defaults";

const REQUIRED_FILES = [
    {
        id: "ai.continuity.notes",
        filename: "ai.continuity.notes.md",
        targetDir: "ai",
        goldenFile: "ai.continuity.notes.md"
    },
    {
        id: "system.identity",
        filename: "system.identity.json",
        targetDir: "system",
        goldenFile: "system.identity.json"
    },
    {
        id: "settings.user",
        filename: "settings.user.json",
        targetDir: "settings",
        goldenFile: "settings.user.json"
    },
    {
        id: "runtime.session",
        filename: "runtime.session.json",
        targetDir: "runtime",
        goldenFile: "runtime.session.json"
    },
    {
        id: "shared.context",
        filename: "shared.context.json",
        targetDir: "shared",
        goldenFile: "shared.context.json"
    }
];

function checkPartitionIntegrity() {
    for (const file of REQUIRED_FILES) {
        const targetPath = path.join(
            PARTITION_ROOT,
            file.targetDir,
            file.filename
        );

        if (!fs.existsSync(targetPath)) {
            restoreFromGoldenCopy(file);
            continue;
        }

        if (isCorrupted(targetPath)) {
            restoreFromGoldenCopy(file);
            continue;
        }
    }
}

function restoreFromGoldenCopy(file) {
    const source = path.join(GOLDEN_ROOT, file.goldenFile);
    const target = path.join(
        PARTITION_ROOT,
        file.targetDir,
        file.filename
    );

    fs.copyFileSync(source, target);
}

function isCorrupted(filePath) {
    try {
        const content = fs.readFileSync(filePath, "utf8");

        if (filePath.endsWith(".json")) {
            try {
                JSON.parse(content);
                return false;
            } catch {
                return true;
            }
        }

        if (filePath.endsWith(".md")) {
            if (!content.trim()) return true;
            if (!content.includes("AI Continuity Notes")) return true;
            return false;
        }

        return false;
    } catch {
        return true;
    }
}

 module.exports = {
    checkPartitionIntegrity
};
   