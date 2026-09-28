// C:\WingManBackend\core\rooms\rooms.loader.cjs
// Loader defines and ensures the rooms root directory.

const fs = require("fs");
const path = require("path");

// Absolute path to the rooms root directory.
const ROOMS_ROOT = path.join(process.cwd(), "WingManRooms");

// Ensures the rooms root directory exists.
if (!fs.existsSync(ROOMS_ROOT)) {
    fs.mkdirSync(ROOMS_ROOT, { recursive: true });
}

module.exports = { ROOMS_ROOT };
