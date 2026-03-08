import { reportingRepo } from "./reporting.repo.js";

export const reportingController = {
  async executiveDashboard(req, res, next) {
    try {
      const windowDays = req.query.window_days ? parseInt(String(req.query.window_days), 10) : 30;
      const topN = req.query.top_n ? parseInt(String(req.query.top_n), 10) : 10;
      const body = await reportingRepo.getExecutiveDashboard(req.orgId, windowDays, topN);
      res.status(200).json(body);
    } catch (e) {
      next(e);
    }
  }
};
