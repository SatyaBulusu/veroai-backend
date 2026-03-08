import { AssetGenProvider } from "./provider.js";

function line(...xs) { return xs.filter(Boolean).join(" "); }

export class MockProvider extends AssetGenProvider {
  async generate({ asset_type, channel, tone, persona, constraints = {}, inputs = {} }) {
    const maxChars = Number(constraints.max_chars || 0);

    const product = inputs.product || "VeroAI";
    const value = inputs.value_prop || "prove marketing impact with revenue-first analytics";
    const cta = inputs.cta || "Book a demo";
    const audience = persona?.name || "there";

    let out = "";

    switch (asset_type) {
      case "email_subject":
        out = line(product + ":", value);
        break;
      case "email_body":
        out = [
          `Hi ${audience},`,
          ``,
          `Quick note — ${product} helps you ${value}.`,
          `In one place, you can connect spend → attribution → ROI, and ship experiments faster with approvals.`,
          ``,
          `If you're open to it, ${cta}.`,
          ``,
          `Thanks,`,
          `VeroAI Team`
        ].join("\n");
        break;
      case "ad_headline":
        out = line("Prove ROI.", "Scale winners.", product);
        break;
      case "ad_body":
        out = `Connect spend to revenue and see what actually works. ${cta}.`;
        break;
      case "landing_hero":
        out = `${product}: Revenue-first marketing, with governance built in.`;
        break;
      case "cta":
        out = cta;
        break;
      case "banner_prompt":
        out = `A clean, modern ${channel} banner for ${product}, tone ${tone}, emphasizing: ${value}.`;
        break;
      default:
        out = `${product} — ${value}. ${cta}.`;
    }

    if (maxChars && out.length > maxChars) out = out.slice(0, maxChars);

    return { content_text: out, provider: "mock", model: "template-v1" };
  }
}
