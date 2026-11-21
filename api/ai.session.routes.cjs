/* ========================================================================
   WingMan Backend File

   Alias: @backend-api/ai.session.routes.cjs
   Role: HTTP interface for backend-authoritative, transport-neutral AI
         admission, orientation, persistence verification, chat, status,
         and disconnect operations.
========================================================================= */

'use strict';

const express = require('express');
const AIEngine = require('../ai/ai.engine.cjs');
const { verifyLicense } = require('../access/license.gateway.cjs');

const router = express.Router();

function sendResult(res, result, successStatus = 200) {
  if (!result || result.ok !== true) {
    return res.status(400).json(
      result || { ok: false, error: 'The AI operation returned no result.' }
    );
  }
  return res.status(successStatus).json(result);
}

router.post('/invite', async (req, res) => {
  console.log('[WM-INVITE] POST /api/ai/invite');

  try {
    const aiStartup = req.app.locals.aiStartup;
    if (!aiStartup || typeof aiStartup.startAIOnboarding !== 'function') {
      return res.status(503).json({
        ok: false,
        error: 'AI onboarding is not available.'
      });
    }

    const {
      productRef,
      provider = 'openai',
      model,
      params = {},
      localBoardingContext
    } = req.body || {};

    const license = await verifyLicense(productRef);
    if (license.authorized !== true) {
      const statusCode = license.serviceReachable ? 403 : 503;
      return res.status(statusCode).json({
        ok: false,
        authorized: false,
        reason: license.reason,
        tier: license.tier,
        serviceReachable: license.serviceReachable,
        error: 'WingMan backend access is not authorized for this license.'
      });
    }

    const licenseContext = {
      productRef: String(productRef).trim(),
      tier: license.tier,
      verifiedAt: new Date().toISOString()
    };

    const result = await aiStartup.startAIOnboarding({
      licenseContext,
      provider,
      model,
      params,
      localBoardingContext,
      systemSettings: req.app.locals.systemSettings || {},
      partitionPaths: req.app.locals.partition?.paths || null
    });

    return sendResult(res, result, 201);
  } catch (err) {
    console.error('[WM-INVITE] Admission failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/orientation/respond', (req, res) => {
  console.log('[WM-ORIENTATION] POST /api/ai/orientation/respond');

  try {
    const { sessionId, response } = req.body || {};
    const result = AIEngine.advanceOrientation({ sessionId, response });
    return sendResult(res, result);
  } catch (err) {
    console.error('[WM-ORIENTATION] Response processing failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/orientation/persistence-result', (req, res) => {
  console.log('[WM-ORIENTATION] POST /api/ai/orientation/persistence-result');

  try {
    const { sessionId, persistenceType, result } = req.body || {};
    const response = AIEngine.submitPersistenceResult({
      sessionId,
      persistenceType,
      result
    });
    return sendResult(res, response);
  } catch (err) {
    console.error('[WM-ORIENTATION] Persistence result failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/session/:sessionId/operation', (req, res) => {
  try {
    const result = AIEngine.currentOperation({
      sessionId: req.params.sessionId
    });
    return sendResult(res, result);
  } catch (err) {
    console.error('[WM-AI] Current-operation lookup failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/session/:sessionId/status', (req, res) => {
  try {
    const result = AIEngine.status({ sessionId: req.params.sessionId });
    return sendResult(res, result);
  } catch (err) {
    console.error('[WM-AI] Status lookup failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/spatial/begin', (req, res) => {
  console.log('[WM-SPATIAL] POST /api/ai/spatial/begin');
  try {
    const {
      sessionId,
      action,
      parameters = {},
      initiatedBy,
      reason,
      userOverride
    } = req.body || {};
    return sendResult(
  res,
  AIEngine.beginSpatialAction({
    sessionId,
    action,
    parameters,
    initiatedBy,
    reason,
    userOverride
  })
);
  } catch (err) {
    console.error('[WM-SPATIAL] Spatial action preparation failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});
router.post('/spatial/complete', (req, res) => {
  console.log('[WM-SPATIAL] POST /api/ai/spatial/complete');
  try {
    const { sessionId, actionId, result } = req.body || {};
    return sendResult(res, AIEngine.completeSpatialAction({ sessionId, actionId, result }));
  } catch (err) {
    console.error('[WM-SPATIAL] Spatial action completion failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});
router.post('/introduction/begin', (req, res) => {
  console.log('[WM-INTRODUCTION] POST /api/ai/introduction/begin');
  try {
    const { sessionId, preferredName } = req.body || {};
    return sendResult(res, AIEngine.beginIntroduction({
      sessionId,
      preferredName
    }));
  } catch (err) {
    console.error('[WM-INTRODUCTION] Introduction preparation failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/introduction/complete', (req, res) => {
  console.log('[WM-INTRODUCTION] POST /api/ai/introduction/complete');
  try {
    const { sessionId, turnId, reply, actionChoice = null } = req.body || {};

    return sendResult(
      res,
      AIEngine.completeChat({
        sessionId,
        turnId,
        reply,
        actionChoice
      })
    );
        sessionId,
        turnId,
        reply
      }));
    } catch (err) {
      console.error('[WM-INTRODUCTION] Introduction completion failed:', err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

router.post('/chat/begin', async (req, res) => {
  console.log('[WM-CHAT] POST /api/ai/chat/begin');
  try {
    const { sessionId, message } = req.body || {};
    const sessionStatus = AIEngine.status({ sessionId });

    if (!sessionStatus || sessionStatus.ok !== true) {
      return sendResult(res, sessionStatus);
    }

    const productRef = sessionStatus.license?.productRef;
    if (!productRef) {
      return res.status(403).json({
        ok: false,
        authorized: false,
        reason: 'session_license_missing',
        error: 'This AI session does not have a verified WingMan license identity.'
      });
    }

    const license = await verifyLicense(productRef);
    if (license.authorized !== true) {
      const statusCode = license.serviceReachable ? 403 : 503;
      return res.status(statusCode).json({
        ok: false,
        authorized: false,
        reason: license.reason,
        tier: license.tier,
        serviceReachable: license.serviceReachable,
        error: 'WingMan backend access is not currently authorized for this license.'
      });
    }

    return sendResult(res, AIEngine.beginChat({ sessionId, message }));
  } catch (err) {
    console.error('[WM-CHAT] Chat preparation failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/chat/complete', (req, res) => {
  console.log('[WM-CHAT] POST /api/ai/chat/complete');
  try {
    const { sessionId, turnId, reply } = req.body || {};
    return sendResult(res, AIEngine.completeChat({ sessionId, turnId, reply }));
  } catch (err) {
    console.error('[WM-CHAT] Chat completion failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/turn/fail', (req, res) => {
  console.log('[WM-AI] POST /api/ai/turn/fail');
  try {
    const { sessionId, turnId, error } = req.body || {};
    return sendResult(res, AIEngine.failPendingTurn({ sessionId, turnId, error }));
  } catch (err) {
    console.error('[WM-AI] Pending-turn failure handling failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/disconnect', (req, res) => {
  console.log('[WM-AI] POST /api/ai/disconnect');
  try {
    const { sessionId } = req.body || {};
    return sendResult(res, AIEngine.disconnect({ sessionId }));
  } catch (err) {
    console.error('[WM-AI] Disconnect failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
