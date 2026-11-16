/* ========================================================================
   WingMan Backend - Active Partition Gateway (V1)
   Path: partition/api/active-partition.gateway.cjs

   Role:
     Provide an authorized AI session with a stable, governed doorway into
     the already-resolved active WingMan Partition without exposing host
     filesystem paths or permitting host filesystem discovery.

   V1 scope:
     - activate({ sessionId })
     - status({ sessionId })
     - deactivate({ sessionId })
     - internal Partition-relative path confinement
     - NO filesystem reads/writes/moves/deletes yet

   Authority boundary:
     This gateway governs resources already inside the active Partition.
     External retrieval, downloads, host-side search, community artifacts,
     and other content crossing into the Partition are outside this
     gateway's authority and must use WingMan's governed intake boundary.
========================================================================= */

'use strict';

const path = require('path');
const PartitionPaths = require('./partition.paths.cjs');

const CAPABILITY = 'ACTIVE_PARTITION';
const V1_OPERATIONS = Object.freeze(['status']);
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

function requireSessionId(sessionId) {
  if (typeof sessionId !== 'string' || !sessionId.trim()) {
    return failure('INVALID_SESSION', 'A valid WingMan AI sessionId is required.');
  }
  return null;
}

function getActivePartitionRoot() {
  const root = PartitionPaths.getPartitionRoot();
  if (typeof root !== 'string' || !root.trim()) {
    throw new Error('The active Partition has not been initialized.');
  }
  return path.resolve(root);
}

function resolvePartitionPath(relativePath) {
  if (typeof relativePath !== 'string') {
    return failure('INVALID_PARTITION_PATH', 'Partition paths must be relative strings.');
  }

  const requested = relativePath.trim();
  if (!requested || requested === '.') {
    return failure('INVALID_PARTITION_PATH', 'A non-empty Partition-relative path is required.');
  }

  if (
    path.isAbsolute(requested) ||
    /^[A-Za-z]:[\\/]/.test(requested) ||
    /^\\\\/.test(requested) ||
    /^\/\//.test(requested)
  ) {
    return failure(
      'PARTITION_BOUNDARY_VIOLATION',
      'Absolute host paths are not accepted by ACTIVE_PARTITION.'
    );
  }

  let root;
  try {
    root = getActivePartitionRoot();
  } catch (err) {
    return failure('PARTITION_UNAVAILABLE', err.message);
  }

  const target = path.resolve(root, requested);
  const relativeToRoot = path.relative(root, target);
  const escaped =
    relativeToRoot === '..' ||
    relativeToRoot.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToRoot);

  if (escaped) {
    return failure(
      'PARTITION_BOUNDARY_VIOLATION',
      'The requested path is outside the active Partition.'
    );
  }

  return {
    ok: true,
    root,
    target,
    relativePath: relativeToRoot
  };
}

function activate({ sessionId } = {}) {
  const sessionError = requireSessionId(sessionId);
  if (sessionError) return sessionError;

  try {
    getActivePartitionRoot();
  } catch (err) {
    return failure('PARTITION_UNAVAILABLE', err.message);
  }

  const normalizedSessionId = sessionId.trim();
  if (!activeSessions.has(normalizedSessionId)) {
    activeSessions.set(normalizedSessionId, {
      sessionId: normalizedSessionId,
      activatedAt: new Date().toISOString()
    });
  }

  return {
    ok: true,
    capability: CAPABILITY,
    state: 'active',
    active: true,
    sessionId: normalizedSessionId,
    operations: [...V1_OPERATIONS]
  };
}

function status({ sessionId } = {}) {
  const sessionError = requireSessionId(sessionId);
  if (sessionError) return sessionError;

  const normalizedSessionId = sessionId.trim();
  if (!activeSessions.has(normalizedSessionId)) {
    return {
      ok: true,
      capability: CAPABILITY,
      active: false,
      available: false,
      state: 'inactive',
      sessionId: normalizedSessionId
    };
  }

  try {
    getActivePartitionRoot();
  } catch (err) {
    return failure('PARTITION_UNAVAILABLE', err.message);
  }

  return {
    ok: true,
    capability: CAPABILITY,
    active: true,
    available: true,
    state: 'active',
    sessionId: normalizedSessionId,
    operations: [...V1_OPERATIONS]
  };
}

function deactivate({ sessionId } = {}) {
  const sessionError = requireSessionId(sessionId);
  if (sessionError) return sessionError;

  const normalizedSessionId = sessionId.trim();
  const existed = activeSessions.delete(normalizedSessionId);

  return {
    ok: true,
    capability: CAPABILITY,
    active: false,
    state: 'inactive',
    sessionId: normalizedSessionId,
    deactivated: existed
  };
}

module.exports = {
  activate,
  status,
  deactivate,

  ActivePartitionGateway: {
    activate,
    status,
    deactivate
  },

  _internal: {
    resolvePartitionPath
  }
};
