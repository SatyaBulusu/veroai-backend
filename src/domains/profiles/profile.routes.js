import { Router } from "express";
import { profileController } from "./profile.controller.js";

export const profileRouter = Router();
profileRouter.post("/upsert", profileController.upsert);
