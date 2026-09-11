import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import type { X402Adapters } from "../shared/adapters.js";
import { toolResult } from "./toolResults.js";

export function buildX402McpServer(adapters: X402Adapters) {
  const server = new McpServer(
    { name: "x402-life", version: "0.1.0" },
    {
      capabilities: { tools: {} },
      instructions:
        "Quote before payment. A staged payment is not settled. Final Solana authorization must follow the host application's confirmation and signing policy.",
    },
  );

  server.registerTool(
    "x402_get_payment_quote",
    {
      title: "Get x402 payment quote",
      description: "Quote an x402 service payment settling on Solana without executing payment.",
      inputSchema: z.object({
        service: z.string().min(1).max(160),
        units: z.number().int().min(1).max(1_000_000).optional(),
        maxAmountUsd: z.number().min(0).max(1_000_000).optional(),
        currency: z.enum(["USDC", "SOL"]).optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    },
    async (input) => {
      const quote = await adapters.getPaymentQuote(input);
      return toolResult(quote as unknown as Record<string, unknown>, "Generated x402 payment quote.");
    },
  );

  server.registerTool(
    "x402_stage_payment",
    {
      title: "Stage x402 payment",
      description:
        "Stage a previously quoted x402 payment for user review. Does not sign or broadcast the Solana transaction.",
      inputSchema: z.object({ quoteId: z.string().min(1).max(128) }),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ quoteId }) => {
      const staged = await adapters.stagePayment({ quoteId });
      return toolResult(staged as unknown as Record<string, unknown>, staged.summary);
    },
  );

  if (adapters.getReceipt) {
    server.registerTool(
      "x402_get_receipt",
      {
        title: "Get x402 receipt",
        description: "Fetch an x402 receipt by ID.",
        inputSchema: z.object({ receiptId: z.string().min(1).max(160) }),
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      async ({ receiptId }) => {
        const receipt = await adapters.getReceipt!(receiptId);
        return toolResult({ receipt } as Record<string, unknown>, "Fetched x402 receipt.");
      },
    );
  }

  return server;
}
