import { Router } from "express";
import { attributionController } from "./attribution.controller.js";

export const attributionRouter = Router();
attributionRouter.post("/runs", attributionController.createRun);
attributionRouter.get("/results", attributionController.getResults);
