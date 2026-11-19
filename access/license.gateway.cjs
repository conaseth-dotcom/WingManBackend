"use strict";

// ============================================================================
// WingMan Backend - License Service Gateway
// Path: access/license.gateway.cjs
//
// Responsibility:
//   - Accept a WingMan productRef from backend-owned code.
//   - Ask the separate WingMan License Service whether that license currently
//     permits backend access.
//   - Return a small normalized authorization result.
//
// Non-responsibilities:
//   - No customer/account data.
//   - No payment-provider logic.
//   - No local license database access.
//   - No authorization bypass for developer licenses.
// ============================================================================

const DEFAULT_LICENSE_SERVICE_URL = "http://127.0.0.1:3000";
const VERIFY_PATH = "/license/verify";
const DEFAULT_TIMEOUT_MS = 5000;

function normalizeBaseUrl(value) {
  const raw = String(value || DEFAULT_LICENSE_SERVICE_URL).trim();
  return raw.replace(/\/+$/, "");
}

function normalizeProductRef(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getLicenseServiceUrl() {
  return normalizeBaseUrl(process.env.WINGMAN_LICENSE_SERVICE_URL);
}

function getTimeoutMs() {
  const configured = Number(process.env.WINGMAN_LICENSE_VERIFY_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_TIMEOUT_MS;
}

function denied(reason, extra = {}) {
  return {
    ok: extra.ok === true,
    authorized: false,
    reason,
    tier: extra.tier || null,
    serviceReachable: extra.serviceReachable === true,
    status: extra.status || null
  };
}

async function verifyLicense(productRef) {
  const normalizedProductRef = normalizeProductRef(productRef);

  if (!normalizedProductRef) {
    return denied("invalid_product_ref");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());
  const endpoint = `${getLicenseServiceUrl()}${VERIFY_PATH}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ productRef: normalizedProductRef }),
      signal: controller.signal
    });

    let payload;
    try {
      payload = await response.json();
    } catch {
      return denied("license_service_invalid_response", {
        serviceReachable: true,
        status: response.status
      });
    }

    if (!response.ok) {
      return denied(
        typeof payload?.reason === "string"
          ? payload.reason
          : typeof payload?.error === "string"
            ? payload.error
            : "license_service_rejected_request",
        {
          serviceReachable: true,
          status: response.status,
          tier: payload?.tier
        }
      );
    }

    if (!payload || payload.ok !== true) {
      return denied("license_service_invalid_response", {
        serviceReachable: true,
        status: response.status,
        tier: payload?.tier
      });
    }

    if (payload.authorized !== true) {
      return denied(
        typeof payload.reason === "string"
          ? payload.reason
          : "license_not_authorized",
        {
          ok: true,
          serviceReachable: true,
          status: response.status,
          tier: payload.tier
        }
      );
    }

    return {
      ok: true,
      authorized: true,
      reason: typeof payload.reason === "string" ? payload.reason : "active",
      tier: typeof payload.tier === "string" ? payload.tier : null,
      serviceReachable: true,
      status: response.status
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      return denied("license_service_timeout");
    }

    return denied("license_service_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  verifyLicense,
  getLicenseServiceUrl
};
