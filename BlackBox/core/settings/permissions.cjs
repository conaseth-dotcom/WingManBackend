/* ============================================================================
   WingMan BlackBox — Permissions Module (Minimal Stub)
   Path: C:/WingManBackend/BlackBox/core/permissions.cjs

   BlackBox expects:
     - loadPermissions()
     - getPermissionsForUser()
     - validatePermission()

   This stub satisfies all callers without enforcing any real rules.
============================================================================ */

function loadPermissions() {
  // Return a safe default permission set
  return {
    allowAI: true,
    allowAutonomy: false,
    allowMemory: true,
    allowUI: true,
    allowPipeline: true
  };
}

function getPermissionsForUser(userId) {
  return {
    userId,
    permissions: loadPermissions()
  };
}

function validatePermission(permissionName) {
  const perms = loadPermissions();
  return Boolean(perms[permissionName]);
}

module.exports = {
  loadPermissions,
  getPermissionsForUser,
  validatePermission
};
