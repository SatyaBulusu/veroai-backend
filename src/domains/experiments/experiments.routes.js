import { Router } from "express";
import {
  createExperimentHandler,
  listExperimentsHandler,
  getExperimentHandler,
  addVariantHandler,
  listVariantsHandler,
  assignHandler,
  listAssignmentsHandler,
  resultsHandler
} from "./experiments.controller.js";

export const experimentsRouter = Router();

experimentsRouter.post("/", createExperimentHandler);
experimentsRouter.get("/", listExperimentsHandler);
experimentsRouter.get("/:id", getExperimentHandler);

experimentsRouter.post("/:id/variants", addVariantHandler);
experimentsRouter.get("/:id/variants", listVariantsHandler);

experimentsRouter.post("/:id/assign", assignHandler);
experimentsRouter.get("/:id/assignments", listAssignmentsHandler);

experimentsRouter.get("/:id/results", resultsHandler);
