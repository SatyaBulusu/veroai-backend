import { env } from "./config/env.js";
import { buildApp } from "./app.js";
import { logger } from "./config/logger.js";

const app = buildApp();
app.listen(env.port, () => logger.info({ port: env.port }, "VeroAI backend (step1) started"));
