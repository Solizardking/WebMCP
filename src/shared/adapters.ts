import type {
  InferenceRequest,
  InferenceResult,
  StagedAction,
  SwapQuote,
  SwapRequest,
  TokenCandidate,
  WalletContext,
  X402PaymentQuote,
  X402QuoteRequest,
} from "./types.js";

export interface SolanaAdapters {
  getWalletContext(): Promise<WalletContext>;
  resolveToken(query: string): Promise<TokenCandidate[]>;
  getSwapQuote(input: SwapRequest): Promise<SwapQuote>;
  stageSwap(input: SwapRequest & { quoteId?: string }): Promise<StagedAction>;
  simulateTransaction?(serializedTransaction: string): Promise<unknown>;
  inspectTransaction?(signatureOrBase64: string): Promise<unknown>;
}

export interface X402Adapters {
  getPaymentQuote(input: X402QuoteRequest): Promise<X402PaymentQuote>;
  stagePayment(input: { quoteId: string }): Promise<StagedAction>;
  getReceipt?(receiptId: string): Promise<unknown>;
}

export interface ClawdComputeAdapters {
  listModels(): Promise<Array<{ id: string; provider?: string; verified?: boolean }>>;
  runInference(input: InferenceRequest): Promise<InferenceResult>;
}

export interface SolGPTAdapters {
  ask(input: { prompt: string; context?: string }): Promise<{ answer: string; sources?: string[] }>;
}

export type FactoryWhoamiIdentity = {
  sub: string;
  clientId?: string;
  scopes: string[];
  email?: string | null;
};

export type FactoryAgentSummary = {
  id: string;
  title?: string;
  summary?: string;
  [key: string]: unknown;
};

export interface FactoryAdapters {
  listFactoryAgents?(): FactoryAgentSummary[];
  produceFactoryAgent?(id: string): unknown | null;
  factoryBoardPayload?(): { agents: unknown[]; [key: string]: unknown };
  currentFactoryIdentity?(): FactoryWhoamiIdentity | null;
}

export interface ClawdAdapters
  extends SolanaAdapters,
    X402Adapters,
    ClawdComputeAdapters,
    SolGPTAdapters,
    FactoryAdapters {}
