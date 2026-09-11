export interface NoriSigner {
    publicKey: string;
    /** Return a base58 Ed25519 signature over these exact bytes. */
    signMessage(message: Uint8Array): Promise<string>;
}
export declare class NoriClient {
    readonly agentAsset: string;
    private signer;
    private fetchImpl;
    readonly origin: string;
    private token?;
    constructor(url: string, agentAsset: string, signer: NoriSigner, fetchImpl?: typeof fetch);
    private request;
    discover(expectedExecutive: string): Promise<any>;
    rateCard(): Promise<any>;
    models(): Promise<any>;
    blockhash(): Promise<string>;
    /** Partially-signed delegateExecutionV1. Nori co-signs as fee payer and submits. */
    submitDelegation(transaction: string): Promise<any>;
    authenticate(): Promise<void>;
    /** Explicit service invocation. Charges may occur under the on-chain delegation. */
    call(skill: 'chat.completion' | 'image.generation' | 'solana.rpc', input: Record<string, unknown>): Promise<any>;
    sendMessage(skill: 'chat.completion' | 'image.generation' | 'solana.rpc', input: Record<string, unknown>, requestId?: `${string}-${string}-${string}-${string}-${string}`): Promise<any>;
    disconnect(): void;
}
//# sourceMappingURL=nori.d.ts.map