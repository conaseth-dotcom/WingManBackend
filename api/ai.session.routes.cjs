/* ========================================================================
   WingMan Backend File

   Alias: @backend-api/ai.session.routes.cjs
   Role: HTTP interface for backend-authoritative, transport-neutral AI
         admission, orientation, chat, status, and disconnect operations.
========================================================================= */

'use strict';

const express = require('express');
const AIEngine = require('../ai/ai.engine.cjs');

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
      provider = 'openai',
      model,
      params = {}
    } = req.body || {};

    const result = await aiStartup.startAIOnboarding({
      provider,
      model,
      params,
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
    const result = AIEngine.status({
      sessionId: req.params.sessionId
    });
    return sendResult(res, result);
  } catch (err) {
    console.error('[WM-AI] Status lookup failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/chat/begin', (req, res) => {
  console.log('[WM-CHAT] POST /api/ai/chat/begin');

  try {
    const { sessionId, message } = req.body || {};
    const result = AIEngine.beginChat({ sessionId, message });
    return sendResult(res, result);
  } catch (err) {
    console.error('[WM-CHAT] Chat preparation failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/chat/complete', (req, res) => {
  console.log('[WM-CHAT] POST /api/ai/chat/complete');

  try {
    const { sessionId, turnId, reply } = req.body || {};
    const result = AIEngine.completeChat({ sessionId, turnId, reply });
    return sendResult(res, result);
  } catch (err) {
    console.error('[WM-CHAT] Chat completion failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/turn/fail', (req, res) => {
  console.log('[WM-AI] POST /api/ai/turn/fail');

  try {
    const { sessionId, turnId, error } = req.body || {};
    const result = AIEngine.failPendingTurn({ sessionId, turnId, error });
    return sendResult(res, result);
  } catch (err) {
    console.error('[WM-AI] Pending-turn failure handling failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/disconnect', (req, res) => {
  console.log('[WM-AI] POST /api/ai/disconnect');

  try {
    const { sessionId } = req.body || {};
    const result = AIEngine.disconnect({ sessionId });
    return sendResult(res, result);
  } catch (err) {
    console.error('[WM-AI] Disconnect failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
