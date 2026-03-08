import { HttpError } from "../utils/httpError.js";
import { authRepo } from "../domains/auth/auth.repo.js";

/**
 * API Key auth.
 *
 * Header: X-API-Key: <key>
 *
 * Sets: req.auth = { orgId, orgName, userId, userEmail, userDisplayName, roles: [] }
 *
 * Local-only bypass: AUTH_DISABLED=true
 */
export function authMiddleware() {
  return async (req, _res, next) => {
    try {
      if (String(process.env.AUTH_DISABLED || "").toLowerCase() === "true") {
        req.auth = {
          orgId: "org_local",
          orgName: "VeroAI Local",
          userId: "usr_admin",
          userEmail: "admin@local",
          userDisplayName: "Admin",
          roles: ["admin"]
        };
        return next();
      }

      const apiKey = req.header("X-API-Key");
      if (!apiKey) throw new HttpError(401, "Missing X-API-Key");

      const keyRow = await authRepo.findActiveApiKey(apiKey);
      if (!keyRow) throw new HttpError(401, "Invalid or inactive API key");

      const roles = await authRepo.getUserRoles(keyRow.org_id, keyRow.user_id);

      req.auth = {
        orgId: keyRow.org_id,
        orgName: keyRow.org_name,
        userId: keyRow.user_id,
        userEmail: keyRow.user_email,
        userDisplayName: keyRow.user_display_name,
        roles
      };

      return next();
    } catch (e) {
      next(e);
    }
  };
}
