import { ActionConnector } from "./connector.js";

export class MockConnector extends ActionConnector {
  async execute(action) {
    return {
      ok: true,
      connector: "mock",
      executed_action_type: action.action_type,
      entity: { type: action.entity_type, id: action.entity_id },
      note: "Simulated execution (local).",
      timestamp: new Date().toISOString()
    };
  }
}
