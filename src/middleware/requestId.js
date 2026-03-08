import crypto from "crypto";

export function requestId(req, res, next) {
  const rid = req.header("X-Request-Id") || crypto.randomUUID();
  req.requestId = rid;
  res.setHeader("X-Request-Id", rid);
  next();
}
