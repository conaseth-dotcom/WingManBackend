/* ========================================================================
   WingMan Backend File

   Alias: @backend-ai/orientation/ai.orientation.cjs
   Role: Canonical, transport-neutral conversational AI boarding state machine.

   Authority contract:
     - The backend owns curriculum order, validation, progress, and completion.
     - Electron owns provider transport and local persistence transport.
     - Candidate AI may author only the candidate artifact.
     - Every accepted candidate artifact requires a verified local snapshot.
     - Orientation completion does not activate ACTIVE_PARTITION by itself.
========================================================================= */

'use strict';

const fs = require('fs');
const path = require('path');
const {
  BOARDING_MODES,
  INITIAL_BOARDING_STEP,
  acceptCandidateArtifact,
  rejectCandidateArtifact,
  setBoardingStatus
} = require('./boarding.record.cjs');

const ORIENTATION_PROTOCOL_VERSION = '3.0.0';
const CURRICULUM_DIRECTORY = path.join(
  __dirname,
  'WingMan_Conversational_Orientation_Carton_v3'
);
const CURRICULUM_MANIFEST_FILE = '00_BOARDING_CURRICULUM.json';
const PERSIST_BOARDING_SNAPSHOT = 'persist_boarding_snapshot';

function cloneForTransport(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readCurriculumJSON(fileName) {
  const filePath = path.join(CURRICULUM_DIRECTORY, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`[AI Orientation] Required curriculum file is missing: ${fileName}`);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(
      `[AI Orientation] Could not parse curriculum file ${fileName}: ${err.message}`
    );
  }
}

function loadOrientationStages() {
  const manifest = readCurriculumJSON(CURRICULUM_MANIFEST_FILE);

  if (!Array.isArray(manifest.steps) || manifest.steps.length === 0) {
    throw new Error('[AI Orientation] Curriculum manifest contains no steps.');
  }

  const ordered = [...manifest.steps].sort((a, b) => a.order - b.order);
  const stages = ordered.map(entry => {
    if (!entry || typeof entry.file !== 'string' || !entry.file.trim()) {
      throw new Error('[AI Orientation] Curriculum step has no file.');
    }

    const stage = readCurriculumJSON(entry.file);
    if (stage.id !== entry.id) {
      throw new Error(
        `[AI Orientation] Manifest/file identity mismatch: ${entry.id}`
      );
    }

    return stage;
  });

  return { manifest, stages };
}

function validateOrientationChain(stages) {
  if (!Array.isArray(stages) || stages.length === 0) {
    throw new Error('[AI Orientation] No conversational curriculum was loaded.');
  }

  const seen = new Set();

  for (const stage of stages) {
    if (!isPlainObject(stage) || typeof stage.id !== 'string' || !stage.id.trim()) {
      throw new Error('[AI Orientation] Every curriculum step requires an id.');
    }

    if (seen.has(stage.id)) {
      throw new Error(`[AI Orientation] Duplicate curriculum id: ${stage.id}`);
    }
    seen.add(stage.id);

    if (stage.delivery?.type !== 'conversational_orientation_turn') {
      throw new Error(
        `[AI Orientation] Step ${stage.id} is not conversational.`
      );
    }

    if (stage.checkpoint?.operationType !== PERSIST_BOARDING_SNAPSHOT) {
      throw new Error(
        `[AI Orientation] Step ${stage.id} lacks its boarding snapshot checkpoint.`
      );
    }
  }

  return true;
}

function candidateArtifactContract() {
  return {
    orientationNotes: {
      description:
        'Your non-authoritative working understanding, organized however you find useful.',
      type: 'object'
    },
    questions: {
      description:
        'Genuine questions that materially affect understanding or operation. Empty is valid.',
      type: 'array',
      itemShape: { topic: 'string', detail: 'string' }
    },
    ambiguities: {
      description:
        'Genuine ambiguities that materially affect understanding or operation. Empty is valid.',
      type: 'array',
      itemShape: { topic: 'string', detail: 'string' }
    },
    possibleConflicts: {
      description:
        'Possible conflicts in the supplied material. Empty is valid.',
      type: 'array',
      itemShape: { topic: 'string', detail: 'string' }
    },
    orientationProgress: {
      description:
        'Topics you have processed. Each item contains topic, processed, and optional note.',
      type: 'array'
    }
  };
}

function buildOpeningOperation(session) {
  const returning = session.boardingMode === BOARDING_MODES.RETURNING;
  const stepId = returning
    ? 'REVIEW_OWN_ORIENTATION_NOTES'
    : INITIAL_BOARDING_STEP;

  const instruction = returning
    ? [
        'You have participated in this WingMan Partition through this AI platform before.',
        'Review only your platform-owned prior Orientation Notes supplied below.',
        'Treat them as revisable working understanding, not as WingMan authority.',
        'Preserve, reorganize, clarify, correct, remove, or expand them as you find useful.',
        'Current WingMan orientation supplied in later turns will remain authoritative.'
      ]
    : [
        'You are beginning your first successful WingMan boarding for this AI platform in this Partition.',
        'Initialize your Orientation Notes now, before substantive WingMan curriculum is delivered.',
        'Choose whatever internal organization will help you record operational understanding as boarding proceeds.'
      ];

  return {
    type: 'orientation_turn',
    protocolVersion: ORIENTATION_PROTOCOL_VERSION,
    stepId,
    stageId: stepId,
    stageNumber: 1,
    stageCount: session.orientation.stageCount,
    boardingMode: session.boardingMode,
    systemPrompt: [
      'You are in a private WingMan boarding conversation and are not admitted to work with the user.',
      'Do not address the user, begin ordinary project work, or claim admission.',
      'Return your complete candidate artifact as valid JSON.',
      'Brief conversational text may appear before or after the JSON.'
    ].join(' '),
    message: JSON.stringify(
      {
        package: 'WingMan Conversational AI Boarding',
        protocolVersion: ORIENTATION_PROTOCOL_VERSION,
        boardingMode: session.boardingMode,
        step: {
          id: stepId,
          instruction
        },
        priorOrientationNotes: returning
          ? cloneForTransport(session.priorOrientationNotes)
          : null,
        responseContract: candidateArtifactContract()
      },
      null,
      2
    )
  };
}

function buildStageOperation(stage, index, orientation) {
  return {
    type: 'orientation_turn',
    protocolVersion: ORIENTATION_PROTOCOL_VERSION,
    stepId: stage.id,
    stageId: stage.id,
    stageNumber: index + 2,
    stageCount: orientation.stageCount,
    boardingMode: orientation.boardingMode,
    systemPrompt: [
      'You are in a private WingMan boarding conversation and are not admitted to work with the user.',
      'Read only the canonical WingMan material supplied in this turn.',
      'Update your complete candidate artifact in your own words.',
      'Prefer concise operational meaning over copying the curriculum merely for completeness.',
      'Record only genuine questions, ambiguities, or possible conflicts. Empty arrays are valid.',
      'Questions recorded in the artifact do not pause boarding unless WingMan explicitly requires resolution.',
      'Do not address the user, begin ordinary project work, or claim admission.',
      'Return the complete candidate artifact as valid JSON. Brief conversational text may surround it.'
    ].join(' '),
    message: JSON.stringify(
      {
        package: 'WingMan Conversational AI Boarding',
        protocolVersion: ORIENTATION_PROTOCOL_VERSION,
        boardingMode: orientation.boardingMode,
        step: {
          id: stage.id,
          title: stage.title,
          purpose: stage.purpose,
          canonicalMaterial: cloneForTransport(stage.material)
        },
        currentCandidateArtifact: cloneForTransport(
          orientation.sessionBoardingRecord.candidate
        ),
        requiredProgressEntry: cloneForTransport(
          stage.candidateArtifact?.progressEntry || {
            topic: stage.id,
            processed: true
          }
        ),
        responseContract: candidateArtifactContract()
      },
      null,
      2
    )
  };
}

function buildPersistenceOperation(session, completedStepId) {
  return {
    type: PERSIST_BOARDING_SNAPSHOT,
    protocolVersion: ORIENTATION_PROTOCOL_VERSION,
    persistenceType: PERSIST_BOARDING_SNAPSHOT,
    sessionId: session.id,
    platform: session.provider,
    partitionId: session.partitionId,
    completedStepId,
    record: cloneForTransport(session.boardingRecord)
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
  if (!session || typeof session !== 'object' || !session.boardingRecord) {
    throw new Error('[AI Orientation] A candidate session with a boarding record is required.');
  }

  const onProgress =
    typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const { manifest, stages } = loadOrientationStages();
  validateOrientationChain(stages);
  const startedAt = Date.now();

  session.state = 'orienting';
  setBoardingStatus(session.boardingRecord, 'awaiting_candidate_notes', {
    currentStep:
      session.boardingMode === BOARDING_MODES.RETURNING
        ? 'REVIEW_OWN_ORIENTATION_NOTES'
        : INITIAL_BOARDING_STEP,
    detail: 'Waiting for candidate Orientation Notes artifact'
  });

  session.orientation = {
    protocolVersion: ORIENTATION_PROTOCOL_VERSION,
    status: 'awaiting_candidate_response',
    boardingMode: session.boardingMode,
    startedAt,
    completedAt: null,
    durationMs: null,
    stageCount: stages.length + 1,
    currentStageIndex: 0,
    openingComplete: false,
    completedStageIds: [],
    attemptsByStage: {},
    manifest,
    stages,
    sessionBoardingRecord: session.boardingRecord,
    error: null
  };

  const operation = buildOpeningOperation(session);

  onProgress({
    state: session.state,
    phase: 'turn_ready',
    boardingMode: session.boardingMode,
    stepId: operation.stepId,
    stageNumber: operation.stageNumber,
    stageCount: operation.stageCount
  });

  return {
    ok: true,
    state: session.state,
    boardingMode: session.boardingMode,
    orientation: getOrientationStatus(session),
    operation
  };
}

function finalizeOrientationIfReady(session, orientation) {
  if (
    orientation.openingComplete &&
    orientation.currentStageIndex >= orientation.stages.length &&
    !session.pendingPersistence
  ) {
    const completedAt = Date.now();
    orientation.status = 'complete';
    orientation.completedAt = completedAt;
    orientation.durationMs = completedAt - orientation.startedAt;
    session.state = 'orientation_complete';
    return true;
  }

  return false;
}

function getCurrentOrientationOperation(session) {
  const orientation = requireOrientationSession(session);

  if (session.pendingPersistence?.operation) {
    return cloneForTransport(session.pendingPersistence.operation);
  }

  if (orientation.status === 'complete') return null;

  if (finalizeOrientationIfReady(session, orientation)) return null;

  orientation.status = 'awaiting_candidate_response';

  if (!orientation.openingComplete) {
    return buildOpeningOperation(session);
  }

  const stage = orientation.stages[orientation.currentStageIndex];
  if (!stage) {
    throw new Error('[AI Orientation] The current conversational step is missing.');
  }

  return buildStageOperation(stage, orientation.currentStageIndex, orientation);
}

function extractBalancedJSONObject(raw) {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (start < 0) {
      if (char === '{') {
        start = index;
        depth = 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return raw.slice(start, index + 1);
    }
  }

  return null;
}

function parseProviderResponse(value) {
  if (isPlainObject(value)) return value;

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
  } catch {
    const extracted = extractBalancedJSONObject(raw);
    if (!extracted) {
      throw new Error(
        '[AI Orientation] The provider response contained no complete JSON object.'
      );
    }

    try {
      return JSON.parse(extracted);
    } catch (err) {
      throw new Error(
        `[AI Orientation] The candidate artifact was not valid JSON: ${err.message}`
      );
    }
  }
}

function submitOrientationResponse(session, response, options = {}) {
  const orientation = requireOrientationSession(session);
  const onProgress =
    typeof options.onProgress === 'function' ? options.onProgress : () => {};

  if (session.pendingPersistence) {
    return {
      ok: false,
      retry: false,
      complete: false,
      state: session.state,
      error: 'A boarding snapshot is awaiting local persistence verification.',
      orientation: getOrientationStatus(session),
      operation: cloneForTransport(session.pendingPersistence.operation)
    };
  }

  if (orientation.status === 'complete') {
    return {
      ok: true,
      complete: true,
      state: session.state,
      orientation: getOrientationStatus(session),
      operation: null
    };
  }

  const opening = !orientation.openingComplete;
  const stage = opening
    ? null
    : orientation.stages[orientation.currentStageIndex];
  const stepId = opening
    ? session.boardingMode === BOARDING_MODES.RETURNING
      ? 'REVIEW_OWN_ORIENTATION_NOTES'
      : INITIAL_BOARDING_STEP
    : stage?.id;

  if (!stepId) {
    throw new Error('[AI Orientation] The current conversational step is missing.');
  }

  orientation.attemptsByStage[stepId] =
    (orientation.attemptsByStage[stepId] || 0) + 1;

  let candidate;

  try {
    candidate = parseProviderResponse(response);
    acceptCandidateArtifact(session.boardingRecord, candidate, {
      step: stepId,
      nextStep: opening
        ? orientation.stages[0]?.id || null
        : orientation.stages[orientation.currentStageIndex + 1]?.id || null
    });
  } catch (err) {
    orientation.error = err.message;
    orientation.status = 'awaiting_candidate_response';

    rejectCandidateArtifact(session.boardingRecord, {
      step: stepId,
      error: err.message,
      jsonFound: Boolean(extractBalancedJSONObject(String(response || ''))),
      jsonValid: false,
      requiredStructurePreserved: false
    });

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

  if (opening) {
    orientation.openingComplete = true;
  } else {
    orientation.completedStageIds.push(stage.id);
    orientation.currentStageIndex += 1;
  }

  orientation.error = null;
  orientation.status = 'awaiting_persistence_verification';
  session.state = 'persisting_boarding_snapshot';

  const persistenceOperation = buildPersistenceOperation(session, stepId);
  session.pendingPersistence = {
    type: PERSIST_BOARDING_SNAPSHOT,
    stepId,
    createdAt: Date.now(),
    operation: persistenceOperation,
    error: null
  };

  onProgress({
    state: session.state,
    phase: 'persistence_required',
    completedStepId: stepId,
    nextStepId: session.boardingRecord.boarding.currentStep
  });

  return {
    ok: true,
    retry: false,
    complete: false,
    state: session.state,
    orientation: getOrientationStatus(session),
    operation: cloneForTransport(persistenceOperation)
  };
}

function getOrientationStatus(session) {
  const orientation = requireOrientationSession(session);

  return {
    protocolVersion: orientation.protocolVersion,
    status: orientation.status,
    boardingMode: orientation.boardingMode,
    startedAt: orientation.startedAt,
    completedAt: orientation.completedAt,
    durationMs: orientation.durationMs,
    stageCount: orientation.stageCount,
    currentStageIndex: orientation.currentStageIndex,
    openingComplete: orientation.openingComplete,
    currentStep: session.boardingRecord?.boarding?.currentStep || null,
    lastCompletedStep:
      session.boardingRecord?.boarding?.lastCompletedStep || null,
    completedStageIds: [...orientation.completedStageIds],
    attemptsByStage: { ...orientation.attemptsByStage },
    pendingPersistenceType: session.pendingPersistence?.type || null,
    candidateSummary: {
      questions: session.boardingRecord?.candidate?.questions?.length || 0,
      ambiguities: session.boardingRecord?.candidate?.ambiguities?.length || 0,
      possibleConflicts:
        session.boardingRecord?.candidate?.possibleConflicts?.length || 0,
      progressEntries:
        session.boardingRecord?.candidate?.orientationProgress?.length || 0
    },
    error: orientation.error
  };
}

module.exports = {
  CURRICULUM_DIRECTORY,
  CURRICULUM_MANIFEST_FILE,
  ORIENTATION_PROTOCOL_VERSION,
  PERSIST_BOARDING_SNAPSHOT,
  loadOrientationStages,
  validateOrientationChain,
  buildOpeningOperation,
  buildStageOperation,
  buildPersistenceOperation,
  beginOrientation,
  getCurrentOrientationOperation,
  parseProviderResponse,
  submitOrientationResponse,
  getOrientationStatus
};
