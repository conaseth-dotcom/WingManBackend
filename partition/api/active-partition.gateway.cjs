/* ========================================================================
   WingMan Backend - Active Partition Gateway (V2)
   Path: partition/api/active-partition.gateway.cjs

   Role:
     Maintain the backend-side logical ACTIVE_PARTITION capability for an
     authorized AI session using only the stable Partition identity supplied
     by local WingMan.

   Authority boundary:
     - Backend owns capability policy and session admission state.
     - Local WingMan owns physical Partition paths and filesystem operations.
     - This gateway never discovers, resolves, reads, writes, moves, deletes,
       or otherwise accesses host filesystem paths.
     - External retrieval/import/export uses a separately governed intake
       boundary.
========================================================================= */
'use strict';

const CAPABILITY = 'ACTIVE_PARTITION';
const V2_OPERATIONS = Object.freeze(['status']);
const activeSessions = new Map();

function failure(code, error, details = undefined) {
  return {
    ok: false,
    capability: CAPABILITY,
    code,
    error,
    ...(details === undefined ? {} : { details })
  };
}

function normalizeSessionId(sessionId) {
  return typeof sessionId === 'string' ? sessionId.trim() : '';
}

function normalizePartitionId(partitionId) {
  return typeof partitionId === 'string' ? partitionId.trim() : '';
}

function activate({ sessionId, partitionId } = {}) {
  const normalizedSessionId = normalizeSessionId(sessionId);
  if (!normalizedSessionId) {
    return failure('INVALID_SESSION', 'A valid WingMan AI sessionId is required.');
  }

  const normalizedPartitionId = normalizePartitionId(partitionId);
  if (!normalizedPartitionId) {
    return failure(
      'INVALID_PARTITION',
      'A stable active Partition identity is required.'
    );
  }

  const existing = activeSessions.get(normalizedSessionId);
  if (existing && existing.partitionId !== normalizedPartitionId) {
    return failure(
      'PARTITION_IDENTITY_MISMATCH',
      'The AI session is already bound to a different active Partition.'
    );
  }

  if (!existing) {
    activeSessions.set(normalizedSessionId, {
      sessionId: normalizedSessionId,
      partitionId: normalizedPartitionId,
      activatedAt: new Date().toISOString()
    });
  }

  return {
    ok: true,
    capability: CAPABILITY,
    state: 'active',
    active: true,
    available: true,
    sessionId: normalizedSessionId,
    partitionId: normalizedPartitionId,
    operations: [...V2_OPERATIONS]
  };
}

function status({ sessionId } = {}) {
  const normalizedSessionId = normalizeSessionId(sessionId);
  if (!normalizedSessionId) {
    return failure('INVALID_SESSION', 'A valid WingMan AI sessionId is required.');
  }

  const session = activeSessions.get(normalizedSessionId);
  if (!session) {
    return {
      ok: true,
      capability: CAPABILITY,
      active: false,
      available: false,
      state: 'inactive',
      sessionId: normalizedSessionId
    };
  }

  return {
    ok: true,
    capability: CAPABILITY,
    active: true,
    available: true,
    state: 'active',
    sessionId: normalizedSessionId,
    partitionId: session.partitionId,
    operations: [...V2_OPERATIONS]
  };
}

function deactivate({ sessionId } = {}) {
  const normalizedSessionId = normalizeSessionId(sessionId);
  if (!normalizedSessionId) {
    return failure('INVALID_SESSION', 'A valid WingMan AI sessionId is required.');
  }

  const previous = activeSessions.get(normalizedSessionId) || null;
  const existed = activeSessions.delete(normalizedSessionId);

  return {
    ok: true,
    capability: CAPABILITY,
    active: false,
    available: false,
    state: 'inactive',
    sessionId: normalizedSessionId,
    partitionId: previous?.partitionId || null,
    deactivated: existed
  };
}

module.exports = Object.freeze({
  activate,
  status,
  deactivate,
  ActivePartitionGateway: Object.freeze({
    activate,
    status,
    deactivate
  })
});
