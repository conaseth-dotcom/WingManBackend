"use strict";

const express = require("express");
const { verifyLicense } = require("../access/license.gateway.cjs");

const router = express.Router();

router.post("/verify", async (req, res) => {
  const productRef = typeof req.body?.productRef === "string"
    ? req.body.productRef.trim()
    : "";

  const result = await verifyLicense(productRef);

  if (result.authorized !== true) {
    return res.status(result.serviceReachable ? 403 : 503).json({
      ok: false,
      authorized: false,
      reason: result.reason,
      tier: result.tier,
      serviceReachable: result.serviceReachable
    });
  }

  return res.status(200).json({
    ok: true,
    authorized: true,
    reason: result.reason,
    tier: result.tier
  });
});

module.exports = router;
