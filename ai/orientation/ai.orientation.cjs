/* ========================================================================
   WingMan Backend File

   Alias: @backend-ai/orientation/ai.orientation.cjs
   Role: Owns the canonical, transport-neutral AI orientation state machine.

   Authority contract:
     - The backend owns orientation content, order, progress, and completion.
     - Electron owns provider credentials and provider transport.
     - This module never creates or calls a provider client.
     - Orientation completion does not activate ACTIVE_PARTITION by itself.
========================================================================= */

'use strict';

const fs = require('fs');
const path = require('path');

const ORIENTATION_DIRECTORY = __dirname;
const ORIENTATION_FILES = Object.freeze([
  'orientation.json',
  '02_WHO_IS_HERE.json',
  '03_GOVERNANCE.json',
  '04_ENVIRONMENT.json',
  '05_CAPABILITIES.json',
  '06_ADVOCACY.json',
  '07_ACCESS.json',
  '08_CONTINUITY.json',
  '09_INTERVIEW.json',
  '10_WORKING_WITH_USER.json',
  '11_RELATIONSHIP_CONTINUITY.json',
  '12_WORKSPACE_STEWARDSHIP.json',
  '13_CONTINUITY_LIFECYCLE.json'
]);

const ORIENTATION_PROTOCOL_VERSION = '2.0.0';
const STAGE_ACKNOWLEDGEMENT_PREFIX = 'WINGMAN_STAGE_ACK:';

function readJSON(fileName) {
  const filePath = path.join(ORIENTATION_DIRECTORY, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`[AI Orientation] Required file is missing: ${fileName}`);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(
      `[AI Orientation] Could not parse ${fileName}: ${err.message}`
    );
  }
}

function loadOrientationStages() {
  const documents = ORIENTATION_FILES.map(readJSON);
  const stages = [];

  for (const document of documents) {
    if (Array.isArray(document.stages)) {
      stages.push(...document.stages);
    } else {
      stages.push(document);
    }
  }

  const seen = new Set();

  for (const stage of stages) {
    if (!stage || typeof stage !== 'object') {
      throw new Error('[AI Orientation] A stage is not a valid object.');
    }

    if (typeof stage.id !== 'string' || !stage.id.trim()) {
      throw new Error('[AI Orientation] Every stage requires an id.');
    }

    if (seen.has(stage.id)) {
      throw new Error(`[AI Orientation] Duplicate stage id: ${stage.id}`);
    }

    seen.add(stage.id);
  }

  return stages;
}

function validateOrientationChain(stages) {
  if (!Array.isArray(stages) || stages.length === 0) {
    throw new Error('[AI Orientation] No orientation stages were loaded.');
  }

  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index];
    const expectedNext =
      index === stages.length - 1
        ? 'ORIENTATION_COMPLETE'
        : stages[index + 1].id;

    if (stage.completion?.required !== true) {
      throw new Error(
        `[AI Orientation] Stage ${stage.id} is not marked as required.`
      );
    }

    if (stage.completion?.next !== expectedNext) {
      throw new Error(
        `[AI Orientation] Stage ${stage.id} points to ` +
        `${stage.completion?.next ?? 'nothing'}; expected ${expectedNext}.`
      );
    }
  }

  return true;
}

function createStageAcknowledgement(stageId) {
  return `${STAGE_ACKNOWLEDGEMENT_PREFIX}${stageId}`;
}

function cloneForTransport(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeWorkingNotes(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return cloneForTransport(value);
}

function buildStageOperation(stage, index, stageCount) {
  const expectedAcknowledgement = createStageAcknowledgement(stage.id);

  return {
    type: 'orientation_stage',
    protocolVersion: ORIENTATION_PROTOCOL_VERSION,
    stageId: stage.id,
    stageNumber: index + 1,
    stageCount,
    systemPrompt: [
      'You are entering WingMan and are not yet admitted to work with the user.',
      'Process only the canonical orientation stage supplied in this operation.',
      'Do not address the user and do not begin ordinary project work.',
      'You may update your non-authoritative orientation working notes.',
      'Return only valid JSON matching the response contract.'
    ].join(' '),
    message: JSON.stringify(
      {
        package: 'WingMan AI Orientation',
        protocolVersion: ORIENTATION_PROTOCOL_VERSION,
        stage: cloneForTransport(stage),
        responseContract: {
          acknowledgement: expectedAcknowledgement,
          notes: {
            description:
              'Optional non-authoritative AI working notes to carry forward.',
            type: 'object'
          }
        }
      },
      null,
      2
    ),
    expectedAcknowledgement
  };
}

function requireOrientationSession(session) {
  if (!session || typeof session !== 'object') {
    throw new Error('[AI Orientation] A valid AI session is required.');
  }

  if (!session.orientation || typeof session.orientation !== 'object') {
    throw new Error('[AI Orientation] The session has no orientation state.');
  }

  return session.orientation;
}

function beginOrientation(session, options = {}) {
  if (!session || typeof session !== 'object') {
    throw new Error('[AI Orientation] A valid AI session is required.');
  }

  const onProgress =
    typeof options.onProgress === 'function' ? options.onProgress : () => {};

  const stages = loadOrientationStages();
  validateOrientationChain(stages);

  const startedAt = Date.now();

  session.state = 'orienting';
  session.orientation = {
    protocolVersion: ORIENTATION_PROTOCOL_VERSION,
    status: 'awaiting_stage_response',
    startedAt,
    completedAt: null,
    durationMs: null,
    stageCount: stages.length,
    currentStageIndex: 0,
    completedStageIds: [],
    attemptsByStage: {},
    workingNotes: {},
    stages,
    error: null
  };

  const operation = buildStageOperation(stages[0], 0, stages.length);

  onProgress({
    state: session.state,
    phase: 'stage_ready',
    stageId: operation.stageId,
    stageNumber: operation.stageNumber,
    stageCount: operation.stageCount
  });

  return {
    ok: true,
    state: session.state,
    orientation: getOrientationStatus(session),
    operation
  };
}

function getCurrentOrientationOperation(session) {
  const orientation = requireOrientationSession(session);

  if (orientation.status === 'complete') {
    return null;
  }

  const index = orientation.currentStageIndex;
  const stage = orientation.stages[index];

  if (!stage) {
    throw new Error('[AI Orientation] The current orientation stage is missing.');
  }

  return buildStageOperation(stage, index, orientation.stageCount);
}

function parseProviderResponse(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  const raw = String(value || '').trim();

  if (!raw) {
    throw new Error('[AI Orientation] The provider returned an empty response.');
  }

  const withoutFence = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch (err) {
    throw new Error(
      `[AI Orientation] The provider response was not valid JSON: ${err.message}`
    );
  }
}

function submitOrientationResponse(session, response, options = {}) {
  const orientation = requireOrientationSession(session);
  const onProgress =
    typeof options.onProgress === 'function' ? options.onProgress : () => {};

  if (orientation.status === 'complete') {
    return {
      ok: true,
      complete: true,
      state: session.state,
      orientation: getOrientationStatus(session),
      operation: null
    };
  }

  const index = orientation.currentStageIndex;
  const stage = orientation.stages[index];

  if (!stage) {
    throw new Error('[AI Orientation] The current orientation stage is missing.');
  }

  orientation.attemptsByStage[stage.id] =
    (orientation.attemptsByStage[stage.id] || 0) + 1;

  let parsed;

  try {
    parsed = parseProviderResponse(response);
  } catch (err) {
    orientation.error = err.message;
    orientation.status = 'awaiting_stage_response';

    return {
      ok: false,
      retry: true,
      complete: false,
      state: session.state,
      error: err.message,
      orientation: getOrientationStatus(session),
      operation: getCurrentOrientationOperation(session)
    };
  }

  const expectedAcknowledgement = createStageAcknowledgement(stage.id);
  const acknowledgement = String(parsed.acknowledgement || '').trim();

  if (acknowledgement !== expectedAcknowledgement) {
    const error =
      `[AI Orientation] Stage ${stage.id} was not validly acknowledged. ` +
      `Expected ${expectedAcknowledgement}; received ` +
      `${acknowledgement || '<empty>'}.`;

    orientation.error = error;
    orientation.status = 'awaiting_stage_response';

    return {
      ok: false,
      retry: true,
      complete: false,
      state: session.state,
      error,
      orientation: getOrientationStatus(session),
      operation: getCurrentOrientationOperation(session)
    };
  }

  orientation.workingNotes = normalizeWorkingNotes(parsed.notes);
  orientation.completedStageIds.push(stage.id);
  orientation.currentStageIndex += 1;
  orientation.error = null;

  if (orientation.currentStageIndex < orientation.stageCount) {
    orientation.status = 'awaiting_stage_response';
    const operation = getCurrentOrientationOperation(session);

    onProgress({
      state: session.state,
      phase: 'stage_ready',
      completedStageId: stage.id,
      stageId: operation.stageId,
      stageNumber: operation.stageNumber,
      stageCount: operation.stageCount
    });

    return {
      ok: true,
      retry: false,
      complete: false,
      state: session.state,
      orientation: getOrientationStatus(session),
      operation
    };
  }

  const completedAt = Date.now();

  orientation.status = 'complete';
  orientation.completedAt = completedAt;
  orientation.durationMs = completedAt - orientation.startedAt;

  // The pipeline must activate ACTIVE_PARTITION before changing this state to
  // ready_for_introduction. Orientation completion alone grants no capability.
  session.state = 'orientation_complete';

  onProgress({
    state: session.state,
    phase: 'complete',
    durationMs: orientation.durationMs,
    stageCount: orientation.stageCount
  });

  return {
    ok: true,
    retry: false,
    complete: true,
    state: session.state,
    orientation: getOrientationStatus(session),
    operation: null
  };
}

function getOrientationStatus(session) {
  const orientation = requireOrientationSession(session);

  return {
    protocolVersion: orientation.protocolVersion,
    status: orientation.status,
    startedAt: orientation.startedAt,
    completedAt: orientation.completedAt,
    durationMs: orientation.durationMs,
    stageCount: orientation.stageCount,
    currentStageIndex: orientation.currentStageIndex,
    completedStageIds: [...orientation.completedStageIds],
    attemptsByStage: { ...orientation.attemptsByStage },
    workingNotes: cloneForTransport(orientation.workingNotes),
    error: orientation.error
  };
}

module.exports = {
  ORIENTATION_FILES,
  ORIENTATION_PROTOCOL_VERSION,
  STAGE_ACKNOWLEDGEMENT_PREFIX,
  loadOrientationStages,
  validateOrientationChain,
  createStageAcknowledgement,
  buildStageOperation,
  beginOrientation,
  getCurrentOrientationOperation,
  submitOrientationResponse,
  getOrientationStatus
};
