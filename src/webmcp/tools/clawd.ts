import type { ClawdComputeAdapters } from "../../shared/adapters.js";
import type { WebMCPTool } from "../types.js";

export function createClawdComputeWebMCPTools(adapters: ClawdComputeAdapters): WebMCPTool[] {
  return [
    {
      name: "clawd.get_models",
      title: "List Clawd models",
      description: "List AI models currently available through Clawd Compute.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true, consequentialHint: false },
      execute: async () => adapters.listModels(),
    },
    {
      name: "clawd.run_inference",
      title: "Run Clawd inference",
      description:
        "Run an AI inference request through Clawd Compute. This may consume metered compute; the page should show any required payment or quota before consequential payment execution.",
      inputSchema: {
        type: "object",
        properties: {
          model: { type: "string", minLength: 1, maxLength: 160 },
          prompt: { type: "string", minLength: 1, maxLength: 20000 },
          maxTokens: { type: "integer", minimum: 1, maximum: 8192 },
        },
        required: ["prompt"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true, consequentialHint: false },
      execute: async (input) => adapters.runInference(input as never),
    },
  ];
}
