import { z } from 'zod';
export declare const STONK_API = "https://www.stonkfun.xyz/api/public/v1";
export declare const launchInput: z.ZodObject<{
    creatorWallet: z.ZodString;
    quoteMint: z.ZodString;
    name: z.ZodString;
    symbol: z.ZodString;
    mode: z.ZodEnum<{
        standard: "standard";
        reward: "reward";
    }>;
    logo: z.ZodString;
    feeTier: z.ZodOptional<z.ZodEnum<{
        "1%": "1%";
        "2%": "2%";
    }>>;
    devBuyPercent: z.ZodOptional<z.ZodNumber>;
    devBuySol: z.ZodOptional<z.ZodNumber>;
    airdropPercent: z.ZodOptional<z.ZodNumber>;
    airdropTier: z.ZodOptional<z.ZodEnum<{
        top100: "top100";
        top500: "top500";
        top1000: "top1000";
        top2500: "top2500";
        top5000: "top5000";
    }>>;
}, z.core.$strict>;
export type StonkLaunchInput = z.infer<typeof launchInput>;
export type StonkPreparedLaunch = {
    paymentTransaction: string;
    signedQuote: string;
    payment: Record<string, unknown>;
    [key: string]: unknown;
};
export declare class StonkApiError extends Error {
    status: number;
    code: string;
    retryAfter: string | null;
    details: unknown;
    constructor(status: number, code: string, message: string, retryAfter: string | null, details: unknown);
}
/** No credentials, signing, automatic payment or mutation retries. */
export declare class StonkClient {
    private fetchImpl;
    constructor(fetchImpl?: typeof fetch);
    private call;
    stats(): Promise<any>;
    pairs(): Promise<any>;
    tokens(input?: {
        q?: string;
        sort?: 'marketCap' | 'newest' | 'volume';
        page?: number;
    }): Promise<any>;
    token(mint: string): Promise<any>;
    fees(mint: string): Promise<any>;
    launchStatus(signature: string): Promise<any>;
    prepareLaunch(input: StonkLaunchInput): Promise<StonkPreparedLaunch>;
    /** Caller supplies an already reviewed and wallet-signed transaction. Never automatically retry. */
    submitLaunch(input: {
        signedQuote: string;
        signedTransaction: string;
        logo: string;
    }): Promise<any>;
    prepareClaim(mint: string, creatorWallet: string): Promise<any>;
    submitClaim(mint: string, input: {
        creatorWallet: string;
        intentId: string;
        signedTransaction: string;
    }): Promise<any>;
}
//# sourceMappingURL=stonk.d.ts.map