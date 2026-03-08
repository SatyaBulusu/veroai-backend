import { Router } from "express";
import { demoController } from "./demo.controller.js";

export const demoRouter = Router();

// Generate demo data endpoint
demoRouter.post("/generate", demoController.generateDemoData);
