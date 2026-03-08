const DEFAULT_BANNED_PHRASES = [
  "guaranteed results",
  "100% guaranteed",
  "get rich quick",
  "no risk",
  "risk-free",
];

const CHANNEL_REQUIRED_DISCLAIMERS = {
  email: [],
  linkedin_ads: [],
  google_ads: [],
};

export function validateAsset({ channel, tone, content_text, rules = {} }) {
  const banned = rules.banned_phrases || DEFAULT_BANNED_PHRASES;
  const required = rules.required_disclaimers || CHANNEL_REQUIRED_DISCLAIMERS[channel] || [];

  const reasons = [];
  const lower = String(content_text || "").toLowerCase();

  for (const phrase of banned) {
    if (phrase && lower.includes(String(phrase).toLowerCase())) {
      reasons.push({ code: "banned_phrase", message: `Contains banned phrase: "${phrase}"` });
    }
  }

  for (const req of required) {
    if (req && !lower.includes(String(req).toLowerCase())) {
      reasons.push({ code: "missing_disclaimer", message: `Missing required disclaimer: "${req}"` });
    }
  }

  if (["professional", "confident"].includes(String(tone || "").toLowerCase())) {
    const capsRuns = /[A-Z]{10,}/.test(String(content_text || ""));
    if (capsRuns) reasons.push({ code: "tone_caps", message: "Excessive ALL CAPS may violate professional tone." });
  }

  const passed = reasons.length === 0;
  const risk_level = !passed ? (reasons.some(r => r.code === "banned_phrase") ? "high" : "medium") : "low";

  return { passed, risk_level, reasons };
}
