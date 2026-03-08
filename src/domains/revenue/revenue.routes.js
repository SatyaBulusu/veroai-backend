import { Router } from "express";
import { revenueController } from "./revenue.controller.js";

export const revenueRouter = Router();
revenueRouter.post("/ingest", revenueController.ingest);
