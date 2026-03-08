import dotenv from "dotenv";
dotenv.config();

function req(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// Valid attribution models
const VALID_ATTRIBUTION_MODELS = ["last_touch", "linear"];

function parseAttributionModels() {
  const envValue = process.env.AUTO_ATTRIBUTION_MODELS;
  if (!envValue) {
    // Default: run all available models
    return VALID_ATTRIBUTION_MODELS;
  }
  
  // Parse comma-separated list: "last_touch,linear" or "last_touch"
  const models = envValue.split(",").map(m => m.trim()).filter(Boolean);
  
  // Validate each model
  const invalid = models.filter(m => !VALID_ATTRIBUTION_MODELS.includes(m));
  if (invalid.length > 0) {
    console.warn(`Invalid attribution models in AUTO_ATTRIBUTION_MODELS: ${invalid.join(", ")}. Valid models: ${VALID_ATTRIBUTION_MODELS.join(", ")}`);
    // Filter out invalid models
    return models.filter(m => VALID_ATTRIBUTION_MODELS.includes(m));
  }
  
  return models.length > 0 ? models : VALID_ATTRIBUTION_MODELS;
}

export const env = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  logLevel: process.env.LOG_LEVEL ?? "info",
  mysql: {
    host: req("MYSQL_HOST"),
    port: parseInt(process.env.MYSQL_PORT ?? "3306", 10),
    user: req("MYSQL_USER"),
    password: req("MYSQL_PASSWORD"),
    database: req("MYSQL_DATABASE")
  },
  attribution: {
    // Models to automatically run when revenue events are created
    // Comma-separated list: "last_touch,linear" or "last_touch"
    // Defaults to all available models if not set
    autoModels: parseAttributionModels(),
    // Default attribution window in days
    defaultWindowDays: parseInt(process.env.AUTO_ATTRIBUTION_WINDOW_DAYS ?? "90", 10)
  }
};
