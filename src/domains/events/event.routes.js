import { Router } from "express";
import { eventController } from "./event.controller.js";

export const eventRouter = Router();
eventRouter.post("/ingest", eventController.ingest);
