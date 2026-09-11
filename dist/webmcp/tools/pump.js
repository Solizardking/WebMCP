import { X402_LIFE_ORIGIN, X402_PUMP_MCP_URL, createDefaultPumpClient, } from "../../shared/pump.js";
export function createPumpWebMCPTools(client = createDefaultPumpClient()) {
    return [
        {
            name: "pump.get_relay_health",
            title: "Get Pump.fun relay health",
            description: "Read live Pump.fun relay health through x402 agency at https://x402.life/pump/mcp. Does not sign or trade.",
            inputSchema: { type: "object", properties: {}, additionalProperties: false },
            annotations: { readOnlyHint: true, untrustedContentHint: true, consequentialHint: false },
            execute: async () => client.fetchHealth(),
        },
        {
            name: "pump.list_launches",
            title: "List live Pump.fun launches",
            description: "Collect recent pump.fun token launches through x402 agency at https://x402.life/pump/mcp. Read-only live tape.",
            inputSchema: {
                type: "object",
                properties: {
                    limit: { type: "integer", minimum: 1, maximum: 24 },
                    timeoutMs: { type: "integer", minimum: 250, maximum: 15000 },
                },
                additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true, consequentialHint: false },
            execute: async ({ limit, timeoutMs }) => {
                const launches = await client.listLaunches({
                    limit: typeof limit === "number" ? limit : undefined,
                    timeoutMs: typeof timeoutMs === "number" ? timeoutMs : undefined,
                });
                return { source: X402_PUMP_MCP_URL, http: X402_LIFE_ORIGIN, launches };
            },
        },
    ];
}
//# sourceMappingURL=pump.js.map