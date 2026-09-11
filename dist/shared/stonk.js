import { z } from 'zod';
export const STONK_API = 'https://www.stonkfun.xyz/api/public/v1';
const address = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
export const launchInput = z.object({
    creatorWallet: address, quoteMint: address,
    name: z.string().min(1).max(32), symbol: z.string().min(1).max(10),
    mode: z.enum(['standard', 'reward']), logo: z.string().min(1).max(2_000_000),
    feeTier: z.enum(['1%', '2%']).optional(),
    devBuyPercent: z.number().positive().max(50).optional(),
    devBuySol: z.number().positive().optional(),
    airdropPercent: z.number().positive().max(50).optional(),
    airdropTier: z.enum(['top100', 'top500', 'top1000', 'top2500', 'top5000']).optional(),
}).strict().superRefine((v, ctx) => {
    if (v.devBuyPercent !== undefined && v.devBuySol !== undefined)
        ctx.addIssue({ code: 'custom', message: 'Choose devBuyPercent or devBuySol, never both' });
    if (v.mode !== 'reward' && v.airdropPercent !== undefined)
        ctx.addIssue({ code: 'custom', message: 'Airdrops require reward mode' });
    if (v.mode === 'reward' && v.feeTier !== undefined)
        ctx.addIssue({ code: 'custom', message: 'feeTier requires standard mode' });
});
export class StonkApiError extends Error {
    status;
    code;
    retryAfter;
    details;
    constructor(status, code, message, retryAfter, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.retryAfter = retryAfter;
        this.details = details;
    }
}
/** No credentials, signing, automatic payment or mutation retries. */
export class StonkClient {
    fetchImpl;
    constructor(fetchImpl = fetch) {
        this.fetchImpl = fetchImpl;
    }
    async call(path, body) {
        const response = await this.fetchImpl(STONK_API + path, {
            method: body === undefined ? 'GET' : 'POST', redirect: 'error',
            headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
            signal: AbortSignal.timeout(30_000),
        });
        const json = await response.json();
        if (!response.ok || json.error)
            throw new StonkApiError(response.status, json.error?.code || 'upstream_error', json.error?.message || 'Stonk request failed', response.headers.get('retry-after'), json);
        if (!Object.hasOwn(json, 'data'))
            throw new Error('Malformed Stonk response');
        return json.data;
    }
    stats() { return this.call('/stats'); }
    pairs() { return this.call('/pairs?launchable=true'); }
    tokens(input = {}) {
        const parsed = z.object({ q: z.string().max(96).optional(),
            sort: z.enum(['marketCap', 'newest', 'volume']).optional(),
            page: z.number().int().positive().optional() }).strict().parse(input);
        const query = new URLSearchParams({ pageSize: '25' });
        for (const [key, value] of Object.entries(parsed))
            if (value !== undefined)
                query.set(key, String(value));
        return this.call('/tokens?' + query);
    }
    token(mint) { return this.call('/tokens/' + address.parse(mint)); }
    fees(mint) { return this.call('/tokens/' + address.parse(mint) + '/fees'); }
    launchStatus(signature) {
        return this.call('/launches/' + z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,88}$/).parse(signature));
    }
    async prepareLaunch(input) {
        const parsed = launchInput.parse(input);
        const stats = await this.stats();
        if (stats.network !== 'mainnet-beta' || stats.config?.paidLaunchesEnabled !== true)
            throw new Error('Stonk paid launches are unavailable');
        const result = await this.call('/launches/prepare', parsed);
        return z.object({ paymentTransaction: z.string().min(1), signedQuote: z.string().min(1),
            payment: z.record(z.string(), z.unknown()) }).passthrough().parse(result);
    }
    /** Caller supplies an already reviewed and wallet-signed transaction. Never automatically retry. */
    submitLaunch(input) {
        return this.call('/launches/submit', z.object({ signedQuote: z.string().min(1),
            signedTransaction: z.string().min(1).max(20_000), logo: z.string().min(1).max(2_000_000) }).strict().parse(input));
    }
    prepareClaim(mint, creatorWallet) {
        return this.call('/tokens/' + address.parse(mint) + '/fees/claim/prepare', { creatorWallet: address.parse(creatorWallet) });
    }
    submitClaim(mint, input) {
        return this.call('/tokens/' + address.parse(mint) + '/fees/claim/submit', z.object({
            creatorWallet: address, intentId: z.string().min(1), signedTransaction: z.string().min(1).max(20_000),
        }).strict().parse(input));
    }
}
//# sourceMappingURL=stonk.js.map