import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { CLAWD_WS_HTTP_DEFAULT, CLAWD_WS_WS_DEFAULT, createDefaultPumpClient, } from "../shared/pump.js";
import { PUMP_WIDGET_URI, pumpFunWidgetHtml } from "./pumpWidget.js";
import { toolResult } from "./toolResults.js";
const launchSchema = z.object({
    signature: z.string(),
    time: z.string(),
    name: z.string(),
    symbol: z.string(),
    mint: z.string(),
    creator: z.string(),
    isV2: z.boolean().optional(),
    marketCapSol: z.number().optional(),
    imageUri: z.string().optional(),
    description: z.string().optional(),
    website: z.string().nullable().optional(),
    twitter: z.string().nullable().optional(),
    telegram: z.string().nullable().optional(),
    hasGithub: z.boolean().optional(),
    githubUrls: z.array(z.string()).optional(),
    pumpfunUrl: z.string(),
});
export const PUMPFUN_MCP_SERVER_NAME = "x402-agency";
export const PUMPFUN_MCP_TOOLS = [
    "pump_get_relay_health",
    "pump_list_launches",
    "pump_get_launch",
    "render_pump_widget",
];
export function buildPumpMcpServer(client = createDefaultPumpClient()) {
    const server = new McpServer({ name: PUMPFUN_MCP_SERVER_NAME, version: "0.1.0" }, {
        capabilities: { tools: {}, resources: {} },
        instructions: "x402 agency live Pump.fun tape on https://x402.life/pump/mcp (Fly). Call pump_get_relay_health or pump_list_launches for data, then render_pump_widget. These tools never sign, buy, sell, or launch tokens.",
    });
    server.registerResource("pump-fun-widget", PUMP_WIDGET_URI, {
        title: "Pump.fun live tape",
        description: "Pop-out live launch tape sourced from clawd-ws.fly.dev.",
        mimeType: "text/html;profile=mcp-app",
    }, async (uri) => ({
        contents: [
            {
                uri: uri.href,
                mimeType: "text/html;profile=mcp-app",
                text: pumpFunWidgetHtml(),
                _meta: { ui: { prefersBorder: true } },
            },
        ],
    }));
    server.registerTool("pump_get_relay_health", {
        title: "Get Pump.fun relay health",
        description: "Read live health from the Pump.fun launch relay at https://clawd-ws.fly.dev/health. Use this when the user asks if the tape is up, how many launches have been seen, or whether Solana ingest is connected.",
        inputSchema: z.object({}),
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    }, async () => {
        const health = await client.fetchHealth();
        return toolResult(health, `x402 agency relay ${health.status} via https://x402.life/pump/mcp (tape ${CLAWD_WS_HTTP_DEFAULT}).`);
    });
    server.registerTool("pump_list_launches", {
        title: "List live Pump.fun launches",
        description: "Collect recent token-launch frames from wss://clawd-ws.fly.dev/ws. Use this when the user asks what just launched on pump.fun. Returns chainable structured launches for render_pump_widget. Does not trade.",
        inputSchema: z.object({
            limit: z.number().int().min(1).max(24).optional(),
            timeoutMs: z.number().int().min(250).max(15_000).optional(),
        }),
        outputSchema: z.object({
            source: z.string(),
            launches: z.array(launchSchema),
        }),
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    }, async ({ limit, timeoutMs }) => {
        const launches = await client.listLaunches({ limit, timeoutMs });
        return toolResult({ source: CLAWD_WS_WS_DEFAULT, launches }, launches.length
            ? `Collected ${launches.length} live Pump.fun launch(es) from clawd-ws.`
            : "Relay connected but no token-launch frames arrived in the wait window.");
    });
    server.registerTool("pump_get_launch", {
        title: "Get a live Pump.fun launch",
        description: "Look up one mint in the live clawd-ws.fly.dev launch tape. Call pump_list_launches first when the mint is unknown. Read-only.",
        inputSchema: z.object({
            mint: z.string().min(32).max(64),
            timeoutMs: z.number().int().min(250).max(15_000).optional(),
        }),
        outputSchema: z.object({
            found: z.boolean(),
            launch: launchSchema.optional(),
        }),
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    }, async ({ mint, timeoutMs }) => {
        const launches = await client.listLaunches({ limit: 24, timeoutMs });
        const launch = launches.find((row) => row.mint === mint);
        return toolResult(launch ? { found: true, launch } : { found: false }, launch ? `Found ${launch.symbol} (${launch.mint}).` : `Mint ${mint} was not in the live tape window.`);
    });
    server.registerTool("render_pump_widget", {
        title: "Render Pump.fun tape widget",
        description: "Render the Pump.fun pop-out tape. First call pump_list_launches (or pump_get_launch), then pass those launches here. Presentation only — no trading.",
        inputSchema: z.object({
            launches: z.array(launchSchema).max(24),
        }),
        outputSchema: z.object({
            source: z.string(),
            launches: z.array(launchSchema),
        }),
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        _meta: {
            ui: { resourceUri: PUMP_WIDGET_URI },
            "openai/outputTemplate": PUMP_WIDGET_URI,
            "openai/toolInvocation/invoking": "Opening Pump.fun tape…",
            "openai/toolInvocation/invoked": "Showed Pump.fun tape.",
        },
    }, async ({ launches }) => toolResult({ source: CLAWD_WS_WS_DEFAULT, launches: launches }, `Showing ${launches.length} Pump.fun launch(es) from clawd-ws.fly.dev.`));
    return server;
}
//# sourceMappingURL=buildPumpServer.js.map