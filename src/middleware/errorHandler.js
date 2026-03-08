import { HttpError } from "../utils/httpError.js";
import { logger } from "../config/logger.js";
import { ZodError } from "zod";

export function errorHandler(err, req, res, _next) {
  let status = 500;
  let body = {
    requestId: req.requestId,
    error: "InternalServerError",
    message: err?.message ?? "Unknown error",
    details: err?.details
  };

  if (err instanceof HttpError) {
    status = err.status;
    body.error = "RequestError";
    body.message = err.message;
    body.details = err.details;
  } else if (err instanceof ZodError) {
    status = 400;
    body.error = "ValidationError";
    body.message = "Invalid request data";
    body.details = err.errors.map(e => ({
      path: e.path.join("."),
      message: e.message
    }));
  } else {
    logger.error({ err, requestId: req.requestId }, "Unhandled error");
  }

  res.status(status).json(body);
}
