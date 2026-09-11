/** Server-only OpenAI integration. Never import into a browser entry point. */
export declare const PUMP_READ_TOOLS: readonly ["get-token-info", "get-fee-tier", "list-skills", "get-skill"];
export declare const DEFAULT_PUMP_MCP_URL = "https://solgpt-pump-mcp-original.fly.dev/mcp";
export declare const PUMPFUN_LIVE_TOOLS: readonly ["pump_get_relay_health", "pump_list_launches", "pump_get_launch", "render_pump_widget"];
export declare const DEFAULT_PUMPFUN_MCP_URL = "https://x402.life/pump/mcp";
export declare function createPumpMcpTool(options?: {
    url?: string;
    authorization?: string;
}): {
    allowed_tools: ("get-token-info" | "get-fee-tier" | "list-skills" | "get-skill")[];
    require_approval: "never";
    authorization?: string | undefined;
    type: "mcp";
    server_label: string;
    server_description: string;
    server_url: string;
};
export declare function createPumpFunMcpTool(options?: {
    url?: string;
    authorization?: string;
}): {
    allowed_tools: ("pump_get_relay_health" | "pump_list_launches" | "pump_get_launch" | "render_pump_widget")[];
    require_approval: "never";
    authorization?: string | undefined;
    type: "mcp";
    server_label: string;
    server_description: string;
    server_url: string;
};
export declare function askOpenAI(options: {
    apiKey: string;
    prompt: string;
    model?: string;
    pump?: {
        url?: string;
        authorization?: string;
    };
    fetch?: typeof fetch;
}): Promise<{
    answer: string;
    responseId: string;
    toolCalls: (string | undefined)[];
}>;
//# sourceMappingURL=index.d.ts.map