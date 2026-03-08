import { auditService } from "./audit.service.js";
import { HttpError } from "../../utils/httpError.js";

function orgId(req) {
  return req.orgId || req.headers["x-org-id"] || req.headers["x-orgid"] || req.headers["x_org_id"] || "org_local";
}

export const auditController = {
  async list(req, res, next) {
    try {
      const orgIdValue = orgId(req);
      console.log('Audit list request - orgId:', orgIdValue, 'query:', req.query);
      
      if (!orgIdValue) {
        return res.status(400).json({ error: "Missing org_id" });
      }

      const filters = {
        action: req.query.action || undefined,
        entityType: req.query.entity_type || undefined,
        actorType: req.query.actor_type || undefined,
        startDate: req.query.start_date || undefined,
        endDate: req.query.end_date || undefined,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        offset: req.query.offset ? Number(req.query.offset) : 0
      };

      console.log('Calling auditService.listAuditLogs with filters:', filters);
      const result = await auditService.listAuditLogs(orgIdValue, filters);
      console.log('Audit service returned:', { itemCount: result?.items?.length, total: result?.total });
      
      return res.status(200).json(result);
    } catch (e) {
      console.error("Error listing audit logs:", e);
      console.error("Error stack:", e.stack);
      if (e instanceof HttpError) {
        return next(e);
      }
      return next(new HttpError(500, e.message || "Failed to list audit logs", { originalError: e.message }));
    }
  },

  async getFilterOptions(req, res, next) {
    try {
      const orgIdValue = orgId(req);
      if (!orgIdValue) {
        return res.status(400).json({ error: "Missing org_id" });
      }

      const options = await auditService.getFilterOptions(orgIdValue);
      res.json(options);
    } catch (e) {
      console.error("Error getting audit filter options:", e);
      next(e);
    }
  }
};
