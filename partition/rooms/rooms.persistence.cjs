// rooms.persistence.cjs — Pure CommonJS

const fs = require("fs");
const path = require("path");
const { Paths } = require("../paths/paths.cjs");

// ------------------------------------------------------------
// Ensure room slot folder exists
// ------------------------------------------------------------
function ensureRoomSlotFolder(slot) {
  const roomsRoot = Paths.getRoomsFolder();
  const slotFolder = path.join(roomsRoot, `slot${slot}`);

  Paths.ensureDir(slotFolder);
  Paths.ensureDir(path.join(slotFolder, "assets"));
  Paths.ensureDir(path.join(slotFolder, "materials"));
  Paths.ensureDir(path.join(slotFolder, "scripts"));

  return Paths.normalizePath(slotFolder);
}

// ------------------------------------------------------------
// Save room.json into a slot
// ------------------------------------------------------------
function saveRoomToSlot(slot, roomJson) {
  const slotFolder = ensureRoomSlotFolder(slot);
  const roomFile = path.join(slotFolder, "room.json");

  fs.writeFileSync(roomFile, JSON.stringify(roomJson, null, 2), "utf-8");

  return slotFolder;
}

// ------------------------------------------------------------
// Load room.json from a slot
// ------------------------------------------------------------
function loadRoomFromSlot(slot) {
  const slotFolder = ensureRoomSlotFolder(slot);
  const roomFile = path.join(slotFolder, "room.json");

  if (!fs.existsSync(roomFile)) {
    return null;
  }

  const data = fs.readFileSync(roomFile, "utf-8");
  return JSON.parse(data);
}

// ------------------------------------------------------------
// CommonJS Export Bundle
// ------------------------------------------------------------
module.exports = {
  ensureRoomSlotFolder,
  saveRoomToSlot,
  loadRoomFromSlot
};
