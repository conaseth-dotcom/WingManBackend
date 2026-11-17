$ErrorActionPreference = 'Stop'

$pipelinePath = Join-Path $PSScriptRoot 'ai\ai.pipeline.cjs'
$backupPath = "$pipelinePath.before-persistence-result"

if (-not (Test-Path -LiteralPath $pipelinePath)) {
    throw "ai.pipeline.cjs was not found at: $pipelinePath"
}

$content = Get-Content -LiteralPath $pipelinePath -Raw

if ($content -match 'function\s+submitPersistenceResult\s*\(') {
    throw 'submitPersistenceResult() already exists. No changes were made.'
}

$landmark = "`nfunction currentOperation({ sessionId } = {}) {"
if (-not $content.Contains($landmark)) {
    throw 'Insertion landmark was not found. No changes were made.'
}

$function = @'

function submitPersistenceResult({ sessionId, persistenceType, result } = {}) {
  const lookup = getRequiredSession(sessionId);
  if (!lookup.ok) return lookup;

  const { session, sessionId: normalizedSessionId } = lookup;
  const pending = session.pendingPersistence;
  const normalizedType = typeof persistenceType === 'string'
    ? persistenceType.trim()
    : '';

  if (!pending) {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: 'No orientation persistence operation is pending.'
    };
  }

  if (!normalizedType || normalizedType !== pending.type) {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: 'The persistence result does not match the pending operation.'
    };
  }

  if (!result || result.ok !== true || result.verified !== true) {
    const error = result?.error || 'Local persistence was not verified.';
    session.state = 'persistence_failed';
    pending.error = error;

    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      persistenceType: normalizedType,
      error
    };
  }

  session.pendingPersistence = null;
  session.state = 'orienting';

  const operation = getCurrentOrientationOperation(session);
  const orientationComplete =
    session.state === 'orientation_complete' && !operation;

  if (!orientationComplete) {
    return {
      ok: true,
      active: false,
      admitted: false,
      complete: false,
      sessionId: normalizedSessionId,
      provider: session.provider,
      model: session.model,
      partitionId: session.partitionId,
      boardingMode: session.boardingMode,
      state: session.state,
      persistenceType: normalizedType,
      verified: true,
      path: result.path || null,
      orientation: publicOrientation(session),
      operation
    };
  }

  const activePartition = activatePartition(session);

  return {
    ok: true,
    active: true,
    admitted: true,
    complete: true,
    sessionId: normalizedSessionId,
    provider: session.provider,
    model: session.model,
    partitionId: session.partitionId,
    boardingMode: session.boardingMode,
    state: session.state,
    persistenceType: normalizedType,
    verified: true,
    path: result.path || null,
    orientation: publicOrientation(session),
    activePartition: {
      ...activePartition,
      operations: [...activePartition.operations]
    },
    operation: null
  };
}
'@

$updated = $content.Replace($landmark, "$function$landmark")

$oldExport = @'
module.exports = {
  connect,
  advanceOrientation,
  currentOperation,
'@

$newExport = @'
module.exports = {
  connect,
  advanceOrientation,
  submitPersistenceResult,
  currentOperation,
'@

if (-not $updated.Contains($oldExport)) {
    throw 'Export landmark was not found. No changes were made.'
}

$updated = $updated.Replace($oldExport, $newExport)

Copy-Item -LiteralPath $pipelinePath -Destination $backupPath -Force
[System.IO.File]::WriteAllText($pipelinePath, $updated, [System.Text.UTF8Encoding]::new($false))

& node --check $pipelinePath
if ($LASTEXITCODE -ne 0) {
    Copy-Item -LiteralPath $backupPath -Destination $pipelinePath -Force
    throw 'node --check failed. The original file was restored.'
}

& node -e "const p=require('./ai/ai.pipeline.cjs'); if(typeof p.submitPersistenceResult!=='function') process.exit(2); console.log('submitPersistenceResult:', typeof p.submitPersistenceResult);"
if ($LASTEXITCODE -ne 0) {
    Copy-Item -LiteralPath $backupPath -Destination $pipelinePath -Force
    throw 'Export verification failed. The original file was restored.'
}

Write-Host 'ai.pipeline.cjs patched and verified.' -ForegroundColor Green
Write-Host "Backup: $backupPath"
