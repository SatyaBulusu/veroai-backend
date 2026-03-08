import { Router } from "express";
import { reportingController } from "./reporting.controller.js";

export const reportingRouter = Router();

// Executive dashboard (CMO view)
reportingRouter.get("/dashboard/executive", reportingController.executiveDashboard);
