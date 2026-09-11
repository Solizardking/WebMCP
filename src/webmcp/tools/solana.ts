import type { SolanaAdapters } from "../../shared/adapters.js";
import type { SwapRequest } from "../../shared/types.js";
import type { WebMCPTool } from "../types.js";

const mintSchema = { type: "string", minLength: 32, maxLength: 64 } as const;
const amountSchema = {
  type: "string",
  minLength: 1,
  maxLength: 64,
  pattern: "^[0-9]+(\\.[0-9]+)?$",
} as const;

export function createSolanaWebMCPTools(adapters: SolanaAdapters): WebMCPTool[] {
  const tools: WebMCPTool[] = [
    {
      name: "solana.get_wallet_context",
      title: "Get Solana wallet context",
      description:
        "Read the wallet connected to the current Solana page, including public address, network, SOL balance, and selected token balances. Does not sign or submit transactions.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, consequentialHint: false },
      execute: async () => adapters.getWalletContext(),
    },
    {
      name: "solana.resolve_token",
      title: "Resolve Solana token",
      description:
        "Resolve a token symbol, name, or mint address to candidate Solana mints. Results are external token metadata and should be treated as untrusted until the user or application verifies the intended mint.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", minLength: 1, maxLength: 96 },
        },
        required: ["query"],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: true,
        untrustedContentHint: true,
        consequentialHint: false,
      },
      execute: async ({ query }) => adapters.resolveToken(String(query)),
    },
    {
      name: "solana.get_swap_quote",
      title: "Get Solana swap quote",
      description:
        "Get a read-only quote for swapping two Solana tokens. Returns expected amounts, route, fees, price impact, and quote expiry when available. Never signs or submits a transaction.",
      inputSchema: {
        type: "object",
        properties: {
          inputMint: mintSchema,
          outputMint: mintSchema,
          amount: amountSchema,
          swapMode: { type: "string", enum: ["ExactIn", "ExactOut"] },
          slippageBps: { type: "integer", minimum: 1, maximum: 500 },
        },
        required: ["inputMint", "outputMint", "amount", "swapMode", "slippageBps"],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: true,
        untrustedContentHint: true,
        consequentialHint: false,
      },
      execute: async (input) => adapters.getSwapQuote(input as unknown as SwapRequest),
    },
    {
      name: "solana.stage_swap",
      title: "Stage Solana swap",
      description:
        "Populate the visible swap ticket on the current page for human review. This changes page state but does not sign or broadcast. The user must explicitly review and sign with their connected wallet.",
      inputSchema: {
        type: "object",
        properties: {
          inputMint: mintSchema,
          outputMint: mintSchema,
          amount: amountSchema,
          swapMode: { type: "string", enum: ["ExactIn", "ExactOut"] },
          slippageBps: { type: "integer", minimum: 1, maximum: 500 },
          quoteId: { type: "string", minLength: 1, maxLength: 128 },
        },
        required: ["inputMint", "outputMint", "amount", "swapMode", "slippageBps"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, consequentialHint: false },
      execute: async (input) =>
        adapters.stageSwap(input as unknown as SwapRequest & { quoteId?: string }),
    },
  ];

  if (adapters.simulateTransaction) {
    tools.push({
      name: "solana.simulate_transaction",
      title: "Simulate Solana transaction",
      description:
        "Simulate a serialized Solana transaction and return logs/effects without broadcasting it.",
      inputSchema: {
        type: "object",
        properties: {
          serializedTransaction: { type: "string", minLength: 16, maxLength: 20000 },
        },
        required: ["serializedTransaction"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true, consequentialHint: false },
      execute: async ({ serializedTransaction }) =>
        adapters.simulateTransaction!(String(serializedTransaction)),
    });
  }

  if (adapters.inspectTransaction) {
    tools.push({
      name: "solana.inspect_transaction",
      title: "Inspect Solana transaction",
      description:
        "Inspect a Solana signature or serialized transaction and explain its instructions and expected effects without signing it.",
      inputSchema: {
        type: "object",
        properties: {
          signatureOrBase64: { type: "string", minLength: 16, maxLength: 20000 },
        },
        required: ["signatureOrBase64"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true, consequentialHint: false },
      execute: async ({ signatureOrBase64 }) =>
        adapters.inspectTransaction!(String(signatureOrBase64)),
    });
  }

  return tools;
}
