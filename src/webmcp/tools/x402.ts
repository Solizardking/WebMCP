import type { X402Adapters } from "../../shared/adapters.js";
import type { WebMCPTool } from "../types.js";

export function createX402WebMCPTools(adapters: X402Adapters): WebMCPTool[] {
  const tools: WebMCPTool[] = [
    {
      name: "x402.get_payment_quote",
      title: "Get x402 payment quote",
      description:
        "Get a read-only x402 quote for a service or agent action settling on Solana. Does not authorize or send payment.",
      inputSchema: {
        type: "object",
        properties: {
          service: { type: "string", minLength: 1, maxLength: 160 },
          units: { type: "integer", minimum: 1, maximum: 1000000 },
          maxAmountUsd: { type: "number", minimum: 0, maximum: 1000000 },
          currency: { type: "string", enum: ["USDC", "SOL"] },
        },
        required: ["service"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true, consequentialHint: false },
      execute: async (input) => adapters.getPaymentQuote(input as never),
    },
    {
      name: "x402.stage_payment",
      title: "Stage x402 payment",
      description:
        "Stage an x402 payment quote in the visible page for user review. This does not sign or broadcast a Solana payment.",
      inputSchema: {
        type: "object",
        properties: { quoteId: { type: "string", minLength: 1, maxLength: 128 } },
        required: ["quoteId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, consequentialHint: false },
      execute: async ({ quoteId }) => adapters.stagePayment({ quoteId: String(quoteId) }),
    },
  ];

  if (adapters.getReceipt) {
    tools.push({
      name: "x402.get_receipt",
      title: "Get x402 receipt",
      description: "Read an x402 payment or service receipt by ID.",
      inputSchema: {
        type: "object",
        properties: { receiptId: { type: "string", minLength: 1, maxLength: 160 } },
        required: ["receiptId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true, consequentialHint: false },
      execute: async ({ receiptId }) => adapters.getReceipt!(String(receiptId)),
    });
  }

  return tools;
}
