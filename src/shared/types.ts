export type SolanaNetwork = "mainnet-beta" | "devnet";

export interface WalletContext {
  connected: boolean;
  address?: string;
  network: SolanaNetwork;
  solBalance?: number;
  balances?: Array<{
    mint: string;
    symbol?: string;
    amount: string;
    decimals: number;
  }>;
}

export interface TokenCandidate {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  verified?: boolean;
  source?: string;
}

export interface SwapRequest {
  inputMint: string;
  outputMint: string;
  amount: string;
  swapMode: "ExactIn" | "ExactOut";
  slippageBps: number;
}

export interface SwapQuote {
  quoteId: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  minimumOutAmount?: string;
  route?: Array<{ venue: string; percent?: number }>;
  priceImpactPct?: string;
  fees?: Array<{ kind: string; amount: string; mint?: string }>;
  expiresAt?: string;
  network: SolanaNetwork;
}

export interface StagedAction {
  staged: boolean;
  ticketId: string;
  requiresUserSignature: boolean;
  summary: string;
}

export interface X402QuoteRequest {
  service: string;
  units?: number;
  maxAmountUsd?: number;
  currency?: "USDC" | "SOL";
}

export interface X402PaymentQuote {
  quoteId: string;
  service: string;
  amount: string;
  currency: "USDC" | "SOL";
  expiresAt?: string;
  provider?: string;
  settlementNetwork: "solana";
}

export interface InferenceRequest {
  model?: string;
  prompt: string;
  maxTokens?: number;
}

export interface InferenceResult {
  model: string;
  output: string;
  provider: string;
  receipt?: string;
  verified?: boolean;
}
