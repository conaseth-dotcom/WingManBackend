⭐ WingMan Backend — Updated Architecture Overview
This folder contains the real, unified backend for WingMan.
It is the backend that Electron’s main process calls through IPC, and the backend that preload exposes to the renderer via window.WingManPartitionAPI.

It is:

Pure Node.cjs (ESM)

Loaded by Electron main

Accessed by the renderer only through IPC

Independent from Vite bundling

Independent from React

The authoritative source of truth for all partition operations

This backend performs real filesystem work:

Resolving partition paths

Creating folders

Copying files and folders (streaming, recursive)

Writing and reading metadata

Logging backend activity

Recording backend errors

Inspecting tray contents

Providing diagnostics for debugging

The renderer/UI never touches the filesystem directly.
All real disk operations happen here.

⭐ Why This Backend Exists
WingMan stores real user content inside a structured partition:

Code
D:/WingManPartition/
    system/
        logs/
        errors/
    trays/
        tray-1/
            itemA/
                metadata.json
            itemB/
                metadata.json
    ai/
    user/
This backend is responsible for:

Creating and maintaining this structure

Copying dropped folders/files into tray directories

Writing metadata.json for each tray item

Reading metadata during tray sync

Logging backend operations

Recording structured error reports

Scanning folders before copy (copy preview)

Emitting progress events during long transfers

The UI only requests operations.
The backend performs them.

⭐ Folder Structure (Current, Correct)
Code
C:\WingManBackend\WingManBackend\partition
│
├── api/
│   ├── partition.fs.cjs              ← Real filesystem engine (ESM)
│   ├── partition.paths.cjs           ← Central path resolver
│   ├── partition.trays.cjs           ← Tray pipeline (copy + metadata)
│   ├── partition.copyPreview.cjs     ← Folder scan before copy
│   ├── partition.errors.cjs          ← Structured backend error logging
│   ├── partition.logger.cjs          ← Unified backend logger
│   ├── partition.trayInspector.cjs   ← Modern tray inspector
│   ├── partition.ai.cjs              ← AI partition utilities
│   ├── partition.merge.cjs           ← Merge utilities
│   ├── partition.promoter.cjs        ← Promotion utilities
│   ├── partition.review.cjs          ← Review utilities
│   ├── partition.session.cjs         ← Session utilities
│   ├── partition.sync.cjs            ← Sync utilities
│   ├── partition.validator.cjs       ← Validation utilities
│   └── index.cjs                     ← Backend module aggregator
│
└── config/
    └── partition.config.json        ← Defines partitionRoot
All modules inside api/ use:

ESM imports

PartitionPaths

PartitionFS

PartitionLogger

PartitionErrors

No ghost backend modules remain.

⭐ Module-by-Module Summary (Updated)
📂 partition.config.json
Defines the partition root:

json
{
  "partitionRoot": "D:/WingManPartition"
}
All backend modules derive their paths from this file.

📂 partition.paths.cjs
Centralized path resolver.

Provides:

partitionRoot

getTrayFolder(trayId)

resolvePath(relative)

system/logs and system/errors paths

Ensures no hardcoded paths appear anywhere else.

📂 partition.fs.cjs
Real filesystem engine.

Provides:

ensureFolder(path)

writeFile(path, data, { append })

readFile(path)

listFolder(path)

copyRecursive(src, dest, progressCallback) ← streaming, recursive

This module performs real disk operations safely.

📂 partition.trays.cjs
The heart of the tray pipeline.

Handles:

Adding items to trays

Copying dropped folders/files

Writing metadata.json

Syncing tray contents

Emitting progress events

Functions:

addToTray(trayId, payload, progressCallback)

syncTray(trayId)

listTrayItems(trayId)

📂 partition.copyPreview.cjs
Scans a folder before copying.

Returns:

file count

folder count

total size

Useful for estimating copy duration.

📂 partition.errors.cjs
Structured backend error logging.

Writes errors to:

Code
D:/WingManPartition/system/errors/backend-errors.json
Also logs through PartitionLogger.

📂 partition.logger.cjs
Unified backend logger.

Writes logs to:

Code
D:/WingManPartition/system/logs/<channel>.log
Used by all backend modules.

📂 partition.trayInspector.cjs
Modern tray inspector.

Reads:

Code
/trays/<trayId>/<itemName>/metadata.json
Reports:

item count

missing metadata

malformed metadata

orphan folders

Useful for debugging tray persistence.

⭐ How These Modules Work Together
Tray Add Operation
Renderer requests partition:addToTray

Electron main calls backend

partition.paths.cjs resolves tray folder

partition.fs.cjs ensures folders exist

partition.fs.cjs performs streaming recursive copy

partition.trays.cjs writes metadata

partition.logger.cjs logs success

partition.errors.cjs logs failures

Tray Sync Operation
Renderer requests partition:syncTray

Backend scans tray folder

Metadata is read

Item list is returned to UI

Copy Preview
Renderer requests preview

Backend scans folder

Returns file count, folder count, total size

Tray Inspection
Developer requests inspection

Backend reads metadata

Returns structured diagnostic report

⭐ Environment Requirements (Updated)
✔ Runs in pure Node.cjs
✔ Loaded by Electron main
✔ Accessed by renderer through IPC
✔ Must NOT be bundled by Vite
✔ Must NOT be imported directly by React
✔ Must NOT run inside the browser sandbox

This backend is designed to be:

stable

predictable

async where appropriate

safe for large file operations

fully independent from renderer code

⭐ Why This README Exists
To prevent future confusion between:

❌ The deleted ghost backend
C:\WingManBackend\partition  
(legacy, incorrect)

and

✔ The real backend
C:\WingManBackend\WingManBackend\partition  
(correct, modern, unified)

This README ensures:

future developers understand the architecture

future Copilot sessions understand the separation

the real backend stays clean and independent

no accidental re‑introduction of renderer‑embedded backend code

⭐ Final Notes
The real backend is now:

unified

modern

ESM‑based

IPC‑driven

partition‑aware

safe

correct

The ghost backend has been fully removed.
Your architecture is finally clean.