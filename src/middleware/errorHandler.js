import { HttpError } from "../utils/httpError.js";
import { logger } from "../config/logger.js";

export function errorHandler(err, req, res, _next) {
  const status = err instanceof HttpError ? err.status : 500;
  const body = {
    requestId: req.requestId,
    error: status === 500 ? "InternalServerError" : "RequestError",
    message: err?.message ?? "Unknown error",
    details: err?.details
  };
  if (status === 500) logger.error({ err, requestId: req.requestId }, "Unhandled error");
  res.status(status).json(body);
}
