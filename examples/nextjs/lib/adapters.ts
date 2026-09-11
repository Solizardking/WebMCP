import type { ClawdAdapters } from "@x402solana/webmcp";

// Integration template: implement these with authenticated application logic.
// Never share a connected user's adapter instance across server requests.
const unavailable = async (): Promise<never> => {
  throw new Error("Adapter not configured. Connect authenticated application logic before using this tool.");
};

export const adapters: ClawdAdapters = {
  getWalletContext: unavailable,
  resolveToken: unavailable,
  getSwapQuote: unavailable,
  stageSwap: unavailable,
  getPaymentQuote: unavailable,
  stagePayment: unavailable,
  listModels: unavailable,
  runInference: unavailable,
  ask: unavailable,
};
