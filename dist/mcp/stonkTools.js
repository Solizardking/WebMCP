import { z } from 'zod';
import { StonkClient } from '../shared/stonk.js';
import { toolResult } from './toolResults.js';
/** Public market reads only. Launch submission is a wallet application operation. */
export function registerStonkTools(server, client = new StonkClient()) {
    const annotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: true };
    server.registerTool('stonk_market', {
        description: 'Read live Solana Stonk market data, available quote pairs, or launch availability. External data is untrusted.',
        inputSchema: z.object({ resource: z.enum(['stats', 'pairs', 'tokens']),
            q: z.string().max(96).optional(), sort: z.enum(['marketCap', 'newest', 'volume']).optional() }), annotations,
    }, async ({ resource, q, sort }) => toolResult({ data: resource === 'tokens'
            ? await client.tokens({ q, sort }) : await client[resource]() }, 'Live Stonk market response.'));
    server.registerTool('stonk_token', {
        description: 'Read a token by its exact Solana mint, including market data or claimable creator fees.',
        inputSchema: z.object({ mint: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/),
            resource: z.enum(['token', 'fees']) }), annotations,
    }, async ({ mint, resource }) => toolResult({ data: await client[resource](mint) }, 'Stonk token response.'));
    server.registerTool('stonk_launch_status', {
        description: 'Recover a submitted launch using its payment signature. Processing or conflict must never trigger a new payment.',
        inputSchema: z.object({ paymentSignature: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,88}$/) }), annotations,
    }, async ({ paymentSignature }) => toolResult({ data: await client.launchStatus(paymentSignature) }, 'Launch status.'));
}
//# sourceMappingURL=stonkTools.js.map