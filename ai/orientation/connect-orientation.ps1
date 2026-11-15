$ErrorActionPreference = "Stop"

$backendRoot = "C:\Users\conas\OneDrive\Documents\GitHub\WingManBackend"
$pipelinePath = Join-Path $backendRoot "ai\ai.pipeline.cjs"
$orientationDestination = Join-Path $backendRoot "ai\orientation\ai.orientation.cjs"
$downloadedOrientation = Join-Path $PSScriptRoot "ai.orientation.cjs"
$backupPath = "$pipelinePath.pre-orientation.bak"

if (-not (Test-Path $pipelinePath)) {
  throw "Pipeline file not found: $pipelinePath"
}

if (-not (Test-Path $downloadedOrientation)) {
  throw "Place ai.orientation.cjs beside this installer before running it."
}

$requiredFiles = @(
  "orientation.json",
  "02_WHO_IS_HERE.json",
  "03_GOVERNANCE.json",
  "04_ENVIRONMENT.json",
  "05_CAPABILITIES.json",
  "06_ADVOCACY.json",
  "07_ACCESS.json",
  "08_CONTINUITY.json",
  "09_INTERVIEW.json",
  "10_WORKING_WITH_USER.json"
)

foreach ($fileName in $requiredFiles) {
  $filePath = Join-Path (Split-Path $orientationDestination) $fileName
  if (-not (Test-Path $filePath)) {
    throw "Required orientation file is missing: $filePath"
  }
}

Copy-Item $pipelinePath $backupPath -Force

$text = Get-Content $pipelinePath -Raw

$oldImport = 'const OnboardingRuntime = require("../BlackBox/relationship/runtime/onboarding.cjs");'
$newImport = 'const { runAIOrientation } = require("./orientation/ai.orientation.cjs");'

if (-not $text.Contains($oldImport)) {
  throw "Expected legacy onboarding import was not found. No pipeline changes were made."
}

$text = $text.Replace($oldImport, $newImport)

$oldStateBlock = @'
      state: "ready",
      startedAt,
'@

$newStateBlock = @'
      state: "orienting",
      orientation: null,
      startedAt,
'@

if (-not $text.Contains($oldStateBlock)) {
  throw "Expected session state block was not found. Restore from $backupPath if needed."
}

$text = $text.Replace($oldStateBlock, $newStateBlock)

$oldConnectReturn = @'
    console.log(`[ai.pipeline] Session created: ${sessionId} (${provider}/${resolvedModel})`);
    return { ok: true, sessionId, provider, model: resolvedModel, state: "ready" };
'@

$newConnectReturn = @'
    const session = sessions.get(sessionId);

    console.log(`[ai.pipeline] Session created: ${sessionId} (${provider}/${resolvedModel})`);
    console.log(`[ai.pipeline] AI orientation starting: ${sessionId}`);

    const orientation = await runAIOrientation(session, {
      onProgress(progress) {
        console.log("[ai.pipeline] Orientation progress:", progress);
      }
    });

    console.log(`[ai.pipeline] AI orientation complete: ${sessionId}`);

    return {
      ok: true,
      sessionId,
      provider,
      model: resolvedModel,
      state: session.state,
      orientation
    };
'@

if (-not $text.Contains($oldConnectReturn)) {
  throw "Expected connect return block was not found. Restore from $backupPath if needed."
}

$text = $text.Replace($oldConnectReturn, $newConnectReturn)

$onboardingStart = '    /* ─── Onboarding Mode ───────────────────────────────────────── */'
$normalChatStart = '    /* ─── Normal Chat Mode (Streaming) ─────────────────────────── */'
$startIndex = $text.IndexOf($onboardingStart)
$endIndex = $text.IndexOf($normalChatStart)

if ($startIndex -lt 0 -or $endIndex -le $startIndex) {
  throw "Could not locate the legacy onboarding block. Restore from $backupPath if needed."
}

$replacement = @'
    /* ─── Readiness Gate ────────────────────────────────────────── */
    if (
      session.state !== "ready" &&
      session.state !== "ready_for_introduction"
    ) {
      return {
        ok: false,
        error: "The AI has not completed WingMan orientation.",
        state: session.state
      };
    }

'@

$text =
  $text.Substring(0, $startIndex) +
  $replacement +
  $text.Substring($endIndex)

Set-Content -Path $pipelinePath -Value $text -Encoding UTF8

Write-Host "Orientation engine installed."
Write-Host "Pipeline backup: $backupPath"
Write-Host "Run: node --check .\ai\orientation\ai.orientation.cjs"
Write-Host "Run: node --check .\ai\ai.pipeline.cjs"
