onboarding.readme.md
WingMan Onboarding Pipeline — Full System Map & Debugging Guide
🌐 Overview
The onboarding pipeline is responsible for:

Accepting user‑provided API credentials

Validating them

Testing them against the provider

Storing them securely

Updating provider metadata

Loading the provider implementation

Exposing the provider to the rest of WingMan

This document shows:

The full pipeline diagram

The affected folders

The responsible modules

The hidden system namespaces

The console.log checkpoints

The cleanup rules

The refactor plan

This is the authoritative map.
If a file isn’t referenced here, it’s either dead or needs justification.

🗺️ Pipeline Diagram (High-Level)
Code
competed
📁 Folder Structure (Proposed Clean Hierarchy)
Code
/backend/
  /onboarding/
    OnboardingPipeline.cjs
    providerKeyStore.cjs
    providerRegistry.cjs

  /providers/
    provider-openai.cjs
    provider-anthropic.cjs

  /runtime/
    aiRuntime.cjs

/partition/
  /user-visible/
    (AI can see this)

  /system-hidden/
    /vault/
      wm.securekeys.json
    /provider-meta/
      wm.providerMeta.json
    /config/
      providerRegistry.json
      onboardingConfig.json
    /logs/
      onboarding.log
Anything outside these folders must justify its existence.

🔍 Console.log Checkpoints (Mandatory)
These logs make the entire pipeline observable.

1. Invite AI → OnboardingPipeline entry
Code
[ONBOARD] Received onboarding request:
  provider: ${provider}
  nickname: ${nickname}
2. Provider registry lookup
Code
[ONBOARD] Provider registry loaded. Using provider: ${provider}
3. Key validation
Code
[VALIDATE] Checking key format for provider: ${provider}
[VALIDATE] Key format result: ${true|false}
4. Test connection
Code
[TEST] Sending test request to provider: ${provider}
[TEST] Response status: ${status}
[TEST] Connection result: ${success|failure}
5. Secure vault write
Code
[VAULT] Writing encrypted key for provider: ${provider}
[VAULT] CredentialId: ${credentialId}
6. Provider metadata update
Code
[META] Updating provider metadata for provider: ${provider}
[META] Keys before: ${countBefore}
[META] Keys after: ${countAfter}
7. Provider implementation load
Code
[PROVIDER] Loading provider implementation: ${provider}
8. Final onboarding result
Code
[ONBOARD] Onboarding complete for provider: ${provider}
🧹 Cleanup Rules (Critical for Production)
1. No duplicate credentialIds
If nickname already exists → update instead of append.

2. Compact metadata on every write
Rewrite wm.providerMeta.json cleanly.

3. Remove dead entries
If a key fails validation or testConnection → delete immediately.

4. Never expose system-hidden paths to AI
Only /user-visible/ is mapped into the AI’s virtual filesystem.

5. Document every new file
Top-of-file header:

md
// Role: What subsystem this file belongs to
// Owner: Which orchestrator imports it
// Scope: user-visible | system-hidden
// Notes: Why this file exists
🧠 Developer Notes (The “Why” Section)
Onboarding must be one pipeline, not scattered logic.

Provider metadata must be clean, not append-only.

Secure vault must be isolated, not visible to AI.

Providers must be modular, not entangled.

Partition must be mapped, not guessed.

Logs must be centralized, not sprinkled.

This README is the map.
If a file isn’t referenced here, it’s either dead or needs justification.