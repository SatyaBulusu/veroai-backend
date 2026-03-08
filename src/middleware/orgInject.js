/**
 * Inject org context into write payloads so repos can persist org_id consistently.
 * Requires authMiddleware + tenantContext to have set req.orgId.
 */
export function orgInject() {
  return (req, _res, next) => {
    const orgId = req.orgId || req.auth?.orgId;
    if (!orgId) return next();

    if (req.body && typeof req.body === "object") {
      if (!("org_id" in req.body)) req.body.org_id = orgId;

      if (Array.isArray(req.body.events)) {
        req.body.events = req.body.events.map(e => ({ ...e, org_id: e.org_id ?? orgId }));
      }
      if (Array.isArray(req.body.revenue_events)) {
        req.body.revenue_events = req.body.revenue_events.map(e => ({ ...e, org_id: e.org_id ?? orgId }));
      }
    }
    next();
  };
}
