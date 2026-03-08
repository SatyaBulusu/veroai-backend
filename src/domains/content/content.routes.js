import { Router } from "express";
import { contentController } from "./content.controller.js";

export const contentRouter = Router();
contentRouter.post("/", contentController.create);
contentRouter.post("/:assetId/versions", contentController.addVersion);
