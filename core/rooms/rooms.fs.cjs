// C:\WingManBackend\core\rooms\rooms.fs.cjs

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Filesystem adapter for room JSON.
 * Provides minimal read/write utilities required by rooms.loader.full.cjs
 * and rooms.to.partition.cjs.
 */

function getRoomDir(root, roomName) {
  return path.join(root, 'core', 'rooms', 'rooms', roomName);
}

function roomExists(root, roomName) {
  return fs.existsSync(getRoomDir(root, roomName));
}

function readRoomJson(root, roomName, fileName) {
  const filePath = path.join(getRoomDir(root, roomName), fileName);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error(`[WM-ROOMS] Failed to read JSON: ${filePath}`, e);
    return null;
  }
}

function writeRoomJson(targetDir, fileName, data) {
  const filePath = path.join(targetDir, fileName);

  try {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error(`[WM-ROOMS] Failed to write JSON: ${filePath}`, e);
    return false;
  }
}

module.exports = {
  getRoomDir,
  roomExists,
  readRoomJson,
  writeRoomJson
};
