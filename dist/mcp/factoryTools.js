import * as z from "zod/v4";
import { toolResult } from "./toolResults.js";
export const FACTORY_CATALOG_TOOL = "factory_catalog";
export const FACTORY_WHOAMI_TOOL = "factory_whoami";
export const REQUIRED_FACTORY_IDS = [
    "birdeye",
    "blockrun",
    "cache",
    "clawd-ws",
    "copy-trade",
    "dflow",
    "filters",
    "helpers",
    "jupiter",
    "listeners",
    "modes",
    "polymarket",
    "pumpbot",
    "pumpfun",
    "raydium-volume-bot-master",
    "snipe",
    "telegram",
    "transactions",
    "volume",
    "wallet-check",
    "xai",
];
const FALLBACK_AGENTS = REQUIRED_FACTORY_IDS.map((id) => ({
    id,
    title: id.replace(/-/g, " "),
    summary: `Factory specialty ${id}`,
}));
function hasWhoamiScope(scopes) {
    return scopes.includes("tool:whoami");
}
export function registerFactoryCatalogTool(server, adapters) {
    server.registerTool(FACTORY_CATALOG_TOOL, {
        title: "List factory catalog agents",
        description: "List mintable trading-bot factory agents hosted on this desk. Read-only; does not execute trades or expose pump write tools.",
        inputSchema: z.object({
            id: z.string().min(1).max(64).optional(),
        }),
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    }, async ({ id }) => {
        if (id) {
            const produced = adapters.produceFactoryAgent?.(id) ?? null;
            const record = produced;
            if (record?.id) {
                return toolResult({ ids: [record.id], agent: produced }, JSON.stringify(produced));
            }
            const fallback = FALLBACK_AGENTS.find((item) => item.id === id) ?? null;
            if (!fallback) {
                return toolResult({ ids: [], agent: null }, `Unknown factory agent: ${id}`);
            }
            return toolResult({ ids: [fallback.id], agent: fallback }, JSON.stringify(fallback));
        }
        const listed = adapters.listFactoryAgents?.() ?? FALLBACK_AGENTS;
        const ids = listed.map((item) => item.id);
        const payload = adapters.factoryBoardPayload?.() ?? { agents: listed };
        return toolResult({ ids, agents: payload.agents }, ids.join("\n"));
    });
    server.registerTool(FACTORY_WHOAMI_TOOL, {
        title: "Factory Auth0 whoami",
        description: "Return the Auth0 identity on the MCP bearer token. Public catalog remains usable without a token. Scope tool:whoami is required for a populated identity.",
        inputSchema: z.object({}),
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    }, async () => {
        const identity = adapters.currentFactoryIdentity?.() ?? null;
        if (!identity) {
            return toolResult({ authenticated: false, sub: null, scopes: [] }, "anonymous");
        }
        if (!hasWhoamiScope(identity.scopes)) {
            return {
                isError: true,
                content: [{ type: "text", text: "Missing required scopes: tool:whoami" }],
                structuredContent: { authenticated: true, error: "missing_scope", scopes: identity.scopes },
            };
        }
        return toolResult({
            authenticated: true,
            sub: identity.sub,
            clientId: identity.clientId,
            scopes: identity.scopes,
            email: identity.email || null,
        }, `authenticated as ${identity.sub}`);
    });
}
//# sourceMappingURL=factoryTools.js.map