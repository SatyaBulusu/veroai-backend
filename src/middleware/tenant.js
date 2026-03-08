/**
 * Tenant context helper. Requires authMiddleware to have set req.auth.
 */
export function tenantContext() {
  return (req, _res, next) => {
    req.orgId = req.auth?.orgId;
    next();
  };
}
