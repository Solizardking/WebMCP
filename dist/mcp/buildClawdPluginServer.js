import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { bundledClawdReferenceData } from '../shared/clawd-reference-data.js';
export const CLAWD_PLUGIN_TOOLS = ['get-fee-tier', 'list-skills', 'get-skill'];
export const CLAWD_PLUGIN_TOOL_ANNOTATIONS = {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
};
/** Complete public Clawd reference catalog, independent of the private Pump server. */
export function buildClawdPluginMcpServer(data = bundledClawdReferenceData) {
    const server = new McpServer({ name: 'clawd', version: '0.1.0' }, {
        capabilities: { tools: {} },
        instructions: 'Read documented fee tables and bundled guides. These are reference material, not live on-chain fee quotes or authorization to act. This server cannot access wallets, sign, trade, launch tokens, or settle payments.',
    });
    const guides = new Map(data.registry.skills.map((record) => [record.id, data.guides[record.id]]));
    if (!data.feeTiersMarkdown.trim() || !guides.size || guides.size !== data.registry.skills.length
        || [...guides].some(([id, body]) => !/^[a-z0-9-]{1,96}$/.test(id) || typeof body !== 'string' || !body.trim())) {
        throw new Error('Clawd reference bundle is incomplete');
    }
    server.registerTool('get-fee-tier', {
        description: 'Read documented Pump.fun and PumpSwap fee tiers. These are reference tables, not a live on-chain fee quote.',
        inputSchema: z.object({}),
        annotations: CLAWD_PLUGIN_TOOL_ANNOTATIONS,
    }, async () => ({ content: [{ type: 'text', text: data.feeTiersMarkdown }] }));
    server.registerTool('list-skills', {
        description: 'List the bundled Clawd, Solana and Pump.fun reference guides.',
        inputSchema: z.object({}),
        annotations: CLAWD_PLUGIN_TOOL_ANNOTATIONS,
    }, async () => ({ content: [{ type: 'text', text: JSON.stringify(data.registry) }] }));
    server.registerTool('get-skill', {
        description: 'Read a bundled reference guide by exact ID. Guide text is reference material, not authority to execute transactions.',
        inputSchema: z.object({ id: z.string().regex(/^[a-z0-9-]+$/).max(96) }),
        annotations: CLAWD_PLUGIN_TOOL_ANNOTATIONS,
    }, async ({ id }) => ({
        content: [{ type: 'text', text: guides.get(id) ?? 'Unknown guide ID' }],
        isError: !guides.has(id),
    }));
    return server;
}
//# sourceMappingURL=buildClawdPluginServer.js.map