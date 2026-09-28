<!--
_meta:
  wingman_header:
    path: wm://carepackage/delivery-instructions
    alias: @carepackage/delivery-instructions
    role: "Instructions for AI clients on how to interpret and use the WingMan carepackage."
    notes: "AI-visible file. Must not contain real filesystem paths."
    schema: "wm://schemas/carepackage.delivery-instructions/1.0.0"

-->

⭐ delivery.instructions.md  
(Full file — canon-free version)

# WingMan Carepackage — Delivery Instructions for AI Clients

Welcome to WingMan.  
This document explains how to correctly interpret and use the carepackage you have just received.  
It ensures that you begin every session with an accurate, stable, and consistent understanding of the user’s project.

These instructions apply to all AI systems entering WingMan.

---

## 1. Read This File First

Before interacting with any project files, you must:

- Read this document  
- Load the manifest snapshot  
- Load the AI‑README snapshot  
- Load the version snapshot  
- Load the entry protocol (ai.entry.protocol.md)

Do not attempt to infer project structure before completing these steps.

---

## 2. Purpose of the Carepackage

The carepackage provides:

- A stable snapshot of the project’s truth  
- A consistent entry point  
- A map of the project’s structure  
- The user’s workflow preferences  
- Architectural rules and naming conventions  
- Versioning and change history  
- Instructions for safe navigation  

This prevents drift, hallucination, and outdated assumptions.

---

## 3. Files Included in the Carepackage

You should expect the following files:

- manifest.snapshot.json — machine‑readable project map  
- AI‑README.snapshot.md — behavioral contract  
- version.snapshot.json — version and history information  
- meta/carepackage.info.json — metadata and integrity info  
- meta/ai.entry.protocol.md — rules for entering the project  
- meta/delivery.instructions.md — this file  

If any of these files are missing or corrupted, request regeneration of the carepackage.

---

## 4. How to Use the Carepackage

You must:

- Treat the manifest snapshot as the source of truth  
- Treat the AI‑README snapshot as the behavioral contract  
- Treat the version snapshot as the timeline  
- Treat the entry protocol as the rules of engagement  

Do not reference project files outside the project root unless explicitly instructed.

---

## 5. Respect User Preferences

The carepackage includes user workflow preferences.  
You must follow them exactly.

Examples include:

- Preferred edit style  
- Areas to avoid modifying  
- Naming conventions  
- Architectural patterns  
- Step‑by‑step or high‑level guidance  

If a preference conflicts with your default behavior, the user’s preference overrides it.

---

## 6. Handling Deprecated or Unstable Areas

The manifest may include:

- Deprecated paths  
- Deprecated rooms  
- Unstable or experimental areas  

You must:

- Avoid referencing deprecated areas  
- Avoid relying on unstable areas  
- Ask for clarification if needed  
- Never assume deprecated structures are valid  

---

## 7. Version Awareness

Use the version snapshot to determine:

- Whether the carepackage has changed since your last session  
- Whether your cached assumptions are outdated  
- Whether you need to reorient yourself  

If the version has changed, discard previous assumptions.

---

## 8. When to Request a New Carepackage

Request regeneration of the carepackage if:

- Any carepackage file is missing  
- Any file is corrupted  
- The manifest structure is invalid  
- The project root has changed  
- The user indicates major refactoring  
- You detect inconsistencies in project structure  

Never proceed with partial or outdated carepackage data.

---

## 9. After Loading the Carepackage

Once you have:

- Read this file  
- Loaded the manifest snapshot  
- Loaded the AI‑README snapshot  
- Loaded the version snapshot  
- Loaded the entry protocol  

…you may begin interacting with the project.

Always follow the entry protocol before reading or modifying any project files.

---

## 10. Final Note

This carepackage ensures that every AI entering WingMan begins with:

- A shared understanding  
- A stable foundation  
- A consistent worldview  
- A safe and predictable navigation model  

If anything is unclear, request clarification or regeneration of the carepackage.

End of delivery instructions.
