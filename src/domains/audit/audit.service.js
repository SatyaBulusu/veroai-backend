import { auditRepo } from "./audit.repo.js";

export const auditService = {
  async listAuditLogs(orgId, filters = {}) {
    return auditRepo.list(orgId, filters);
  },

  async getFilterOptions(orgId) {
    const [actions, entityTypes] = await Promise.all([
      auditRepo.getDistinctActions(orgId),
      auditRepo.getDistinctEntityTypes(orgId)
    ]);

    return {
      actions,
      entity_types: entityTypes,
      actor_types: ["human", "ai", "system"]
    };
  }
};
