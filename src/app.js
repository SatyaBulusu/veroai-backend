import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { logger } from "./config/logger.js";
import { requestId } from "./middleware/requestId.js";
import { errorHandler } from "./middleware/errorHandler.js";

import { campaignRouter } from "./domains/campaigns/campaign.routes.js";
import { contentRouter } from "./domains/content/content.routes.js";
import { approvalRouter } from "./domains/approvals/approval.routes.js";

import { profileRouter } from "./domains/profiles/profile.routes.js";
import { eventRouter } from "./domains/events/event.routes.js";

import { revenueRouter } from "./domains/revenue/revenue.routes.js";
import { attributionRouter } from "./domains/attribution/attribution.routes.js";

import { reportingRouter } from "./domains/reporting/reporting.routes.js";

import { authMiddleware } from "./middleware/auth.js";
import { securedV1Router } from "./routes/secured.routes.js";

import { tenantContext } from "./middleware/tenant.js";

import cors from "cors";


export function buildApp() {
  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: "1mb" }));
  app.use(requestId);
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => res.json({ ok: true, product: "VeroAI", step: 1 }));

  //app.use("/v1/campaigns", campaignRouter);
  //app.use("/v1/content-assets", contentRouter);
  //app.use("/v1/approvals", approvalRouter);

  app.use("/v1/profiles", profileRouter);
  app.use("/v1/events", eventRouter);

  app.use("/v1/revenue-events", revenueRouter);
  app.use("/v1/attribution", attributionRouter);

  app.use(cors({
    origin: ["http://localhost:3001", "http://127.0.0.1:3001"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Org-Id"],
  }));
  
  // important: respond to preflight
  app.options("*", cors());

  //app.use("/v1/reporting", reportingRouter);

  app.use(authMiddleware());
  app.use(tenantContext());
  app.use("/v1", securedV1Router);

  app.use(errorHandler);
  return app;
}
