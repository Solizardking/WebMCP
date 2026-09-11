// Local protocol fixture only. No market data, inference, signing or payments.
const unavailable = async () => { throw new Error('Demo: adapter not configured'); };
export const adapters = {
  getWalletContext: async () => ({ connected: false, network: 'devnet' }),
  resolveToken: unavailable,
  getSwapQuote: unavailable,
  stageSwap: unavailable,
  getPaymentQuote: unavailable,
  stagePayment: unavailable,
  listModels: async () => [],
  runInference: unavailable,
  ask: unavailable,
};
