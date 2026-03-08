import { demoService } from "./demo.service.js";

function orgId(req) {
  return req.orgId || req.auth?.orgId || req.headers["x-org-id"] || req.headers["x-orgid"] || req.headers["x_org_id"] || "org_local";
}

export const demoController = {
  async generateDemoData(req, res, next) {
    try {
      const org = orgId(req);
      console.log(`Generating demo data for org: ${org}, requestId: ${req.requestId}`);
      
      // Start generation (this can take a while, so we'll return immediately and process async)
      // Actually, let's make it synchronous for now so user gets feedback
      const result = await demoService.generateDemoData(org, req.requestId || "demo");
      
      res.status(201).json(result);
    } catch (e) {
      console.error("Demo data generation error:", e);
      next(e);
    }
  }
};
