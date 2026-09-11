import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import type { ClawdAdapters } from "../shared/adapters.js";
import { toolResult } from "./toolResults.js";
import { registerStonkTools } from './stonkTools.js';
import { registerFactoryCatalogTool } from './factoryTools.js';

export function buildSolGPTMcpServer(adapters: ClawdAdapters) {
  const server = new McpServer(
    { name: "solgpt-solana-agent", version: "0.1.0" },
    {
      capabilities: { tools: {} },
      instructions:
        "Use read tools to resolve tokens and quote before staging a trade. Never imply that a staged transaction has been signed or broadcast. User signature is required for final Solana execution.",
    },
  );

  server.registerTool(
    "solana_get_wallet_context",
    {
      title: "Get Solana wallet context",
      description: "Read the authenticated user's Solana wallet context without changing state.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => {
      const data = await adapters.getWalletContext();
      return toolResult(data as unknown as Record<string, unknown>, "Read Solana wallet context.");
    },
  );

  server.registerTool(
    "solana_resolve_token",
    {
      title: "Resolve Solana token",
      description: "Resolve a symbol, name, or mint to candidate Solana token metadata.",
      inputSchema: z.object({ query: z.string().min(1).max(96) }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    },
    async ({ query }) => {
      const candidates = await adapters.resolveToken(query);
      return toolResult({ candidates }, `Found ${candidates.length} token candidate(s).`);
    },
  );

  server.registerTool(
    "solana_get_swap_quote",
    {
      title: "Get Solana swap quote",
      description: "Get a read-only Solana swap quote. Does not sign or broadcast.",
      inputSchema: z.object({
        inputMint: z.string().min(32).max(64),
        outputMint: z.string().min(32).max(64),
        amount: z.string().regex(/^[0-9]+(\.[0-9]+)?$/),
        swapMode: z.enum(["ExactIn", "ExactOut"]),
        slippageBps: z.number().int().min(1).max(500),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    },
    async (input) => {
      const quote = await adapters.getSwapQuote(input);
      return toolResult(quote as unknown as Record<string, unknown>, "Generated Solana swap quote.");
    },
  );

  server.registerTool(
    "solgpt_ask",
    {
      title: "Ask SOLGPT",
      description: "Ask SOLGPT for Solana-focused analysis or assistance.",
      inputSchema: z.object({
        prompt: z.string().min(1).max(12000),
        context: z.string().max(12000).optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    },
    async (input) => {
      const result = await adapters.ask(input);
      return toolResult(result as unknown as Record<string, unknown>, result.answer);
    },
  );

  server.registerTool(
    "clawd_list_models",
    {
      title: "List Clawd models",
      description: "List models available through Clawd Compute.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    },
    async () => {
      const models = await adapters.listModels();
      return toolResult({ models }, `Found ${models.length} model(s).`);
    },
  );

  registerStonkTools(server);
  registerFactoryCatalogTool(server, adapters);
  return server;
}
