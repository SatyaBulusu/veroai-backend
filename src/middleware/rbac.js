import { HttpError } from "../utils/httpError.js";

export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    const roles = req.auth?.roles ?? [];
    const ok = allowedRoles.some(r => roles.includes(r));
    if (!ok) {
      throw new HttpError(403, `Forbidden: requires role(s) [${allowedRoles.join(", ")}]`);
    }
    next();
  };
}

export function enforceApprovalRoleMatch() {
  return (req, _res, next) => {
    const roles = req.auth?.roles ?? [];
    const bodyRole = req.body?.role;

    if (!bodyRole) throw new HttpError(400, "Missing approval role in body");
    if (roles.includes("admin")) return next();

    if (bodyRole === "legal" && !roles.includes("legal")) {
      throw new HttpError(403, "Forbidden: only legal role can submit legal approval");
    }
    if (bodyRole === "cmo" && !roles.includes("cmo")) {
      throw new HttpError(403, "Forbidden: only cmo role can submit cmo approval");
    }
    if (!["legal", "cmo"].includes(bodyRole)) {
      throw new HttpError(403, "Forbidden: unsupported approval role");
    }
    next();
  };
}
