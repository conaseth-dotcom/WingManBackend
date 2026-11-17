/* ========================================================================
   WingMan Backend File

   Alias: @backend-ai/orientation/boarding.record.cjs
   Role: Creates and maintains WingMan-owned AI boarding passport records.

   Authority contract:
     - WingMan owns boarding, diagnostic, and admission state.
     - The candidate AI may author only the candidate artifact.
     - Failed and aborted attempts never establish returning status.
     - Platform + Partition scopes continuity identity.
     - Model and credential changes do not create a new continuity identity.
     - This module does not perform filesystem I/O or call an AI provider.
       Callers persist returned records through the applicable governed path.
========================================================================= */

'use strict';

const BOARDING_RECORD_SCHEMA_VERSION = '1.0.0';
const PLATFORM_CONTINUITY_SCHEMA_VERSION = '1.0.0';

const BOARDING_RECORD_TYPE = 'wingman_ai_boarding_record';
const PLATFORM_CONTINUITY_RECORD_TYPE = 'wingman_ai_platform_continuity';

const BOARDING_MODES = Object.freeze({
  FIRST: 'first',
  RETURNING: 'returning'
});

const BOARDING_STATUSES = Object.freeze({
  CREATED: 'created',
  AWAITING_CANDIDATE_NOTES: 'awaiting_candidate_notes',
  ORIENTING: 'orienting',
  ORIENTATION_COMPLETE: 'orientation_complete',
  PERSISTING_NOTES: 'persisting_notes',
  ACTIVATING_PARTITION: 'activating_partition',
  READY_FOR_INTRODUCTION: 'ready_for_introduction',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ABORTED: 'aborted'
});

const INITIAL_BOARDING_STEP = 'INITIALIZE_ORIENTATION_NOTES';
const NOTES_WRITE_POLICY = 'owner_platform_during_governed_boarding_only';
const NOTES_VISIBILITY_POLICY = 'owner_platform_only';

function nowISO() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function requireString(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error(`[AI Boarding] ${fieldName} is required.`);
  }
  return normalized;
}

function normalizePlatformId(value) {
  return requireString(value, 'platform').toLowerCase();
}

function emptyCandidateArtifact() {
  return {
    orientationNotes: {},
    questions: [],
    ambiguities: [],
    possibleConflicts: [],
    orientationProgress: []
  };
}

function validateObservationArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new Error(`[AI Boarding] candidate.${fieldName} must be an array.`);
  }

  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    if (!isPlainObject(item)) {
      throw new Error(
        `[AI Boarding] candidate.${fieldName}[${index}] must be an object.`
      );
    }
    requireString(item.topic, `candidate.${fieldName}[${index}].topic`);
    requireString(item.detail, `candidate.${fieldName}[${index}].detail`);
  }
}

function validateCandidateArtifact(value) {
  if (!isPlainObject(value)) {
    throw new Error('[AI Boarding] The candidate artifact must be an object.');
  }

  const allowedKeys = new Set([
    'orientationNotes',
    'questions',
    'ambiguities',
    'possibleConflicts',
    'orientationProgress'
  ]);

  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`[AI Boarding] Unknown candidate field: ${key}`);
    }
  }

  if (!isPlainObject(value.orientationNotes)) {
    throw new Error(
      '[AI Boarding] candidate.orientationNotes must be an object.'
    );
  }

  validateObservationArray(value.questions, 'questions');
  validateObservationArray(value.ambiguities, 'ambiguities');
  validateObservationArray(value.possibleConflicts, 'possibleConflicts');

  if (!Array.isArray(value.orientationProgress)) {
    throw new Error(
      '[AI Boarding] candidate.orientationProgress must be an array.'
    );
  }

  for (let index = 0; index < value.orientationProgress.length; index += 1) {
    const item = value.orientationProgress[index];
    if (!isPlainObject(item)) {
      throw new Error(
        `[AI Boarding] candidate.orientationProgress[${index}] must be an object.`
      );
    }
    requireString(
      item.topic,
      `candidate.orientationProgress[${index}].topic`
    );
    if (typeof item.processed !== 'boolean') {
      throw new Error(
        `[AI Boarding] candidate.orientationProgress[${index}].processed ` +
        'must be boolean.'
      );
    }
    if (item.note !== undefined && item.note !== null && typeof item.note !== 'string') {
      throw new Error(
        `[AI Boarding] candidate.orientationProgress[${index}].note ` +
        'must be a string or null.'
      );
    }
  }

  return clone(value);
}

function createPlatformContinuityRecord({ platform, partitionId, model = null }) {
  const timestamp = nowISO();
  const platformId = normalizePlatformId(platform);

  return {
    schemaVersion: PLATFORM_CONTINUITY_SCHEMA_VERSION,
    recordType: PLATFORM_CONTINUITY_RECORD_TYPE,
    platform: {
      id: platformId,
      createdAt: timestamp,
      lastSeenAt: timestamp,
      lastModel: model ? String(model) : null
    },
    partition: {
      id: requireString(partitionId, 'partitionId')
    },
    boardingContinuity: {
      successfulBoardings: 0,
      firstSuccessfulBoardingAt: null,
      lastSuccessfulBoardingAt: null,
      lastSuccessfulSessionId: null,
      lastSuccessfulBoardingRecord: null
    },
    orientationNotes: {
      exists: false,
      recordVersion: null,
      path: null,
      createdAt: null,
      lastUpdatedAt: null,
      ownerPlatform: platformId,
      writePolicy: NOTES_WRITE_POLICY,
      boardingVisibilityPolicy: NOTES_VISIBILITY_POLICY
    }
  };
}

function validatePlatformContinuityRecord(record, { platform, partitionId } = {}) {
  if (!isPlainObject(record)) {
    throw new Error('[AI Boarding] Platform continuity record must be an object.');
  }

  if (record.recordType !== PLATFORM_CONTINUITY_RECORD_TYPE) {
    throw new Error('[AI Boarding] Invalid platform continuity record type.');
  }

  const ownerPlatform = normalizePlatformId(record.platform?.id);
  const scopedPartitionId = requireString(record.partition?.id, 'partition.id');

  if (platform && ownerPlatform !== normalizePlatformId(platform)) {
    throw new Error(
      '[AI Boarding] Platform continuity record belongs to another platform.'
    );
  }

  if (partitionId && scopedPartitionId !== String(partitionId).trim()) {
    throw new Error(
      '[AI Boarding] Platform continuity record belongs to another Partition.'
    );
  }

  if (record.orientationNotes?.ownerPlatform !== ownerPlatform) {
    throw new Error(
      '[AI Boarding] Orientation Notes ownership does not match platform identity.'
    );
  }

  if (record.orientationNotes?.writePolicy !== NOTES_WRITE_POLICY) {
    throw new Error('[AI Boarding] Invalid Orientation Notes write policy.');
  }

  if (record.orientationNotes?.boardingVisibilityPolicy !== NOTES_VISIBILITY_POLICY) {
    throw new Error('[AI Boarding] Invalid Orientation Notes visibility policy.');
  }

  const count = record.boardingContinuity?.successfulBoardings;
  if (!Number.isInteger(count) || count < 0) {
    throw new Error('[AI Boarding] successfulBoardings must be a nonnegative integer.');
  }

  return true;
}

function selectBoardingMode({ platform, partitionId, continuityRecord = null }) {
  if (!continuityRecord) return BOARDING_MODES.FIRST;

  validatePlatformContinuityRecord(continuityRecord, {
    platform,
    partitionId
  });

  const successful = continuityRecord.boardingContinuity.successfulBoardings > 0;
  const notes = continuityRecord.orientationNotes;
  const validNotesReference = Boolean(
    notes.exists === true &&
    typeof notes.path === 'string' &&
    notes.path.trim() &&
    notes.ownerPlatform === normalizePlatformId(platform)
  );

  return successful && validNotesReference
    ? BOARDING_MODES.RETURNING
    : BOARDING_MODES.FIRST;
}

function createBoardingRecord({
  sessionId,
  platform,
  model = null,
  partitionId,
  mode
}) {
  const timestamp = nowISO();
  const normalizedMode = mode || BOARDING_MODES.FIRST;

  if (!Object.values(BOARDING_MODES).includes(normalizedMode)) {
    throw new Error(`[AI Boarding] Invalid boarding mode: ${normalizedMode}`);
  }

  return {
    schemaVersion: BOARDING_RECORD_SCHEMA_VERSION,
    recordType: BOARDING_RECORD_TYPE,
    boarding: {
      sessionId: requireString(sessionId, 'sessionId'),
      platform: normalizePlatformId(platform),
      model: model ? String(model) : null,
      mode: normalizedMode,
      status: BOARDING_STATUSES.CREATED,
      partitionId: requireString(partitionId, 'partitionId'),
      startedAt: timestamp,
      completedAt: null,
      lastUpdatedAt: timestamp,
      currentStep: INITIAL_BOARDING_STEP,
      lastCompletedStep: null,
      failurePoint: null,
      error: null
    },
    candidate: emptyCandidateArtifact(),
    diagnostic: {
      attempts: [],
      events: [
        {
          timestamp,
          type: 'boarding_record_created',
          step: INITIAL_BOARDING_STEP,
          detail: `Boarding mode selected: ${normalizedMode}`
        }
      ]
    },
    admission: {
      orientationValidated: false,
      notesPersisted: false,
      notesPersistenceVerified: false,
      activePartitionActivated: false,
      participantReady: false,
      introductionReleased: false
    }
  };
}

function touch(record) {
  record.boarding.lastUpdatedAt = nowISO();
  return record;
}

function appendEvent(record, { type, step = null, detail = null }) {
  requireBoardingRecord(record);
  record.diagnostic.events.push({
    timestamp: nowISO(),
    type: requireString(type, 'event.type'),
    step: step ? String(step) : null,
    detail: detail === null || detail === undefined ? null : String(detail)
  });
  touch(record);
  return record;
}

function requireBoardingRecord(record) {
  if (!isPlainObject(record) || record.recordType !== BOARDING_RECORD_TYPE) {
    throw new Error('[AI Boarding] A valid boarding record is required.');
  }
  return record;
}

function setBoardingStatus(record, status, { currentStep, detail } = {}) {
  requireBoardingRecord(record);
  if (!Object.values(BOARDING_STATUSES).includes(status)) {
    throw new Error(`[AI Boarding] Invalid boarding status: ${status}`);
  }

  record.boarding.status = status;
  if (currentStep !== undefined) {
    record.boarding.currentStep = currentStep;
  }
  record.boarding.error = null;

  appendEvent(record, {
    type: 'boarding_status_changed',
    step: record.boarding.currentStep,
    detail: detail || status
  });

  return record;
}

function recordAttempt(record, {
  step,
  result,
  validation = {},
  questionsAdded = 0,
  ambiguitiesAdded = 0,
  possibleConflictsAdded = 0,
  error = null
}) {
  requireBoardingRecord(record);
  const normalizedStep = requireString(step, 'attempt.step');
  const allowedResults = new Set(['accepted', 'rejected', 'failed', 'aborted']);

  if (!allowedResults.has(result)) {
    throw new Error(`[AI Boarding] Invalid attempt result: ${result}`);
  }

  const attemptNumber =
    record.diagnostic.attempts.filter(item => item.step === normalizedStep).length + 1;

  record.diagnostic.attempts.push({
    step: normalizedStep,
    attempt: attemptNumber,
    result,
    timestamp: nowISO(),
    validation: {
      jsonFound: validation.jsonFound === true,
      jsonValid: validation.jsonValid === true,
      requiredStructurePreserved:
        validation.requiredStructurePreserved === true
    },
    questionsAdded: Math.max(0, Number(questionsAdded) || 0),
    ambiguitiesAdded: Math.max(0, Number(ambiguitiesAdded) || 0),
    possibleConflictsAdded: Math.max(0, Number(possibleConflictsAdded) || 0),
    error: error ? String(error) : null
  });

  touch(record);
  return attemptNumber;
}

function acceptCandidateArtifact(record, artifact, { step, nextStep = null } = {}) {
  requireBoardingRecord(record);
  const normalizedStep = requireString(
    step || record.boarding.currentStep,
    'candidate step'
  );
  const previous = record.candidate;
  const validated = validateCandidateArtifact(artifact);

  record.candidate = validated;
  record.boarding.lastCompletedStep = normalizedStep;
  record.boarding.currentStep = nextStep;
  record.boarding.status = nextStep
    ? BOARDING_STATUSES.ORIENTING
    : BOARDING_STATUSES.ORIENTATION_COMPLETE;
  record.boarding.error = null;

  recordAttempt(record, {
    step: normalizedStep,
    result: 'accepted',
    validation: {
      jsonFound: true,
      jsonValid: true,
      requiredStructurePreserved: true
    },
    questionsAdded: Math.max(0, validated.questions.length - previous.questions.length),
    ambiguitiesAdded: Math.max(
      0,
      validated.ambiguities.length - previous.ambiguities.length
    ),
    possibleConflictsAdded: Math.max(
      0,
      validated.possibleConflicts.length - previous.possibleConflicts.length
    )
  });

  appendEvent(record, {
    type: 'candidate_artifact_accepted',
    step: normalizedStep,
    detail: nextStep ? `Advanced to ${nextStep}` : 'Orientation artifact complete'
  });

  return clone(record.candidate);
}

function rejectCandidateArtifact(record, {
  step,
  error,
  jsonFound = false,
  jsonValid = false,
  requiredStructurePreserved = false
}) {
  requireBoardingRecord(record);
  const normalizedStep = requireString(
    step || record.boarding.currentStep,
    'candidate step'
  );
  const message = requireString(error, 'candidate artifact error');

  record.boarding.error = message;

  recordAttempt(record, {
    step: normalizedStep,
    result: 'rejected',
    validation: {
      jsonFound,
      jsonValid,
      requiredStructurePreserved
    },
    error: message
  });

  appendEvent(record, {
    type: 'candidate_artifact_rejected',
    step: normalizedStep,
    detail: message
  });

  return record;
}

function recordFailure(record, { step, error, status = BOARDING_STATUSES.FAILED }) {
  requireBoardingRecord(record);
  if (![BOARDING_STATUSES.FAILED, BOARDING_STATUSES.ABORTED].includes(status)) {
    throw new Error('[AI Boarding] Failure status must be failed or aborted.');
  }

  const normalizedStep = String(step || record.boarding.currentStep || 'UNKNOWN');
  const message = requireString(error, 'failure error');

  record.boarding.status = status;
  record.boarding.failurePoint = normalizedStep;
  record.boarding.error = message;
  record.boarding.completedAt = nowISO();

  recordAttempt(record, {
    step: normalizedStep,
    result: status === BOARDING_STATUSES.ABORTED ? 'aborted' : 'failed',
    error: message
  });

  appendEvent(record, {
    type: status === BOARDING_STATUSES.ABORTED
      ? 'boarding_aborted'
      : 'boarding_failed',
    step: normalizedStep,
    detail: message
  });

  return record;
}

function markAdmission(record, field, value = true) {
  requireBoardingRecord(record);

  if (!Object.prototype.hasOwnProperty.call(record.admission, field)) {
    throw new Error(`[AI Boarding] Unknown admission field: ${field}`);
  }

  if (typeof value !== 'boolean') {
    throw new Error('[AI Boarding] Admission values must be boolean.');
  }

  record.admission[field] = value;
  appendEvent(record, {
    type: 'admission_state_changed',
    step: record.boarding.currentStep,
    detail: `${field}=${value}`
  });
  return record;
}

function assertReadyForParticipant(record) {
  requireBoardingRecord(record);
  const admission = record.admission;
  const unmet = [];

  if (!admission.orientationValidated) unmet.push('orientationValidated');
  if (!admission.notesPersisted) unmet.push('notesPersisted');
  if (!admission.notesPersistenceVerified) unmet.push('notesPersistenceVerified');
  if (!admission.activePartitionActivated) unmet.push('activePartitionActivated');

  if (unmet.length > 0) {
    throw new Error(
      `[AI Boarding] Participant Ready is blocked; unmet conditions: ${unmet.join(', ')}`
    );
  }

  return true;
}

function markParticipantReady(record) {
  assertReadyForParticipant(record);
  markAdmission(record, 'participantReady', true);
  record.boarding.status = BOARDING_STATUSES.READY_FOR_INTRODUCTION;
  record.boarding.currentStep = 'INTRODUCTION';
  touch(record);
  return record;
}

function completeBoarding(record) {
  requireBoardingRecord(record);

  if (!record.admission.participantReady) {
    throw new Error(
      '[AI Boarding] Boarding cannot complete before Participant Ready.'
    );
  }

  if (!record.admission.introductionReleased) {
    throw new Error(
      '[AI Boarding] Boarding cannot complete before the introduction is released.'
    );
  }

  record.boarding.status = BOARDING_STATUSES.COMPLETED;
  record.boarding.currentStep = null;
  record.boarding.completedAt = nowISO();
  record.boarding.error = null;
  appendEvent(record, {
    type: 'boarding_completed',
    step: null,
    detail: 'Participant admitted and introduction released'
  });
  return record;
}

function markSuccessfulContinuity({
  continuityRecord,
  boardingRecord,
  boardingRecordPath,
  orientationNotesPath,
  orientationNotesVersion = '1.0.0'
}) {
  requireBoardingRecord(boardingRecord);

  if (boardingRecord.boarding.status !== BOARDING_STATUSES.COMPLETED) {
    throw new Error(
      '[AI Boarding] Platform continuity cannot be updated from an incomplete boarding.'
    );
  }

  validatePlatformContinuityRecord(continuityRecord, {
    platform: boardingRecord.boarding.platform,
    partitionId: boardingRecord.boarding.partitionId
  });

  const timestamp = boardingRecord.boarding.completedAt || nowISO();
  const continuity = continuityRecord.boardingContinuity;

  continuity.successfulBoardings += 1;
  continuity.firstSuccessfulBoardingAt ||= timestamp;
  continuity.lastSuccessfulBoardingAt = timestamp;
  continuity.lastSuccessfulSessionId = boardingRecord.boarding.sessionId;
  continuity.lastSuccessfulBoardingRecord = requireString(
    boardingRecordPath,
    'boardingRecordPath'
  );

  continuityRecord.platform.lastSeenAt = timestamp;
  continuityRecord.platform.lastModel = boardingRecord.boarding.model;

  const notes = continuityRecord.orientationNotes;
  notes.exists = true;
  notes.recordVersion = requireString(
    orientationNotesVersion,
    'orientationNotesVersion'
  );
  notes.path = requireString(orientationNotesPath, 'orientationNotesPath');
  notes.createdAt ||= timestamp;
  notes.lastUpdatedAt = timestamp;

  return continuityRecord;
}

module.exports = {
  BOARDING_RECORD_SCHEMA_VERSION,
  PLATFORM_CONTINUITY_SCHEMA_VERSION,
  BOARDING_RECORD_TYPE,
  PLATFORM_CONTINUITY_RECORD_TYPE,
  BOARDING_MODES,
  BOARDING_STATUSES,
  INITIAL_BOARDING_STEP,
  NOTES_WRITE_POLICY,
  NOTES_VISIBILITY_POLICY,
  emptyCandidateArtifact,
  validateCandidateArtifact,
  createPlatformContinuityRecord,
  validatePlatformContinuityRecord,
  selectBoardingMode,
  createBoardingRecord,
  appendEvent,
  setBoardingStatus,
  recordAttempt,
  acceptCandidateArtifact,
  rejectCandidateArtifact,
  recordFailure,
  markAdmission,
  assertReadyForParticipant,
  markParticipantReady,
  completeBoarding,
  markSuccessfulContinuity
};
