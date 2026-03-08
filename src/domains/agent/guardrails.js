export function evaluateGuardrails(proposal) {
  const risk = proposal?.risk_level || "low";
  const requiresApproval = ["medium", "high"].includes(String(risk));

  if (proposal?.action_type === "reallocate_budget") {
    const pct = Number(proposal?.params?.shift_percent || 0);
    if (pct > 20) {
      return {
        allowed: false,
        status: "rejected",
        risk_level: "high",
        reasons: [{ code: "budget_shift_cap", message: "Budget shift exceeds prototype cap (20%)." }]
      };
    }
  }

  return {
    allowed: true,
    status: requiresApproval ? "needs_approval" : "approved",
    risk_level: risk,
    reasons: []
  };
}
