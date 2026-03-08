import { Router } from "express";
import { auditController } from "./audit.controller.js";

export const auditRouter = Router();

auditRouter.get("/", auditController.list);
auditRouter.get("/filter-options", auditController.getFilterOptions);
