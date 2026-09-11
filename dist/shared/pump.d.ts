/** Live Pump.fun launch tape. Public MCP is x402 agency on Fly: https://x402.life/pump/mcp */
export declare const CLAWD_WS_HTTP_DEFAULT = "https://clawd-ws.fly.dev";
export declare const CLAWD_WS_WS_DEFAULT = "wss://clawd-ws.fly.dev/ws";
export declare const X402_LIFE_ORIGIN = "https://x402.life";
export declare const X402_AGENCY_NAME = "x402 agency";
export declare const X402_PUMP_MCP_PATH = "/pump/mcp";
export declare const X402_PUMP_MCP_URL = "https://x402.life/pump/mcp";
export declare const PUMP_WIDGET_URI = "ui://widget/pump-fun.html";
export interface PumpLaunchRecord {
    signature: string;
    time: string;
    name: string;
    symbol: string;
    mint: string;
    creator: string;
    isV2?: boolean;
    marketCapSol?: number;
    imageUri?: string;
    description?: string;
    website?: string | null;
    twitter?: string | null;
    telegram?: string | null;
    hasGithub?: boolean;
    githubUrls?: string[];
    pumpfunUrl: string;
}
export interface PumpRelayHealth {
    status: string;
    solana?: boolean;
    clients?: number;
    totalLaunches?: number;
    githubLaunches?: number;
    uptime?: number;
    http: string;
    ws: string;
    mcp: string;
    agency: string;
    [key: string]: unknown;
}
export interface PumpLiveClient {
    fetchHealth(): Promise<PumpRelayHealth>;
    listLaunches(input?: {
        limit?: number;
        timeoutMs?: number;
    }): Promise<PumpLaunchRecord[]>;
}
export type PumpWebSocketLike = {
    new (url: string): {
        onopen: ((event: unknown) => void) | null;
        onmessage: ((event: {
            data: unknown;
        }) => void) | null;
        onerror: ((event: unknown) => void) | null;
        onclose: ((event: unknown) => void) | null;
        close(): void;
    };
};
export declare function clawdWsHttpBase(override?: string): string;
export declare function clawdWsUrl(override?: string): string;
export declare function pumpfunUrlForMint(mint: string): string;
export declare function parsePumpLaunchFrame(raw: unknown): PumpLaunchRecord | null;
export declare function fetchPumpRelayHealth(options?: {
    httpBase?: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
}): Promise<PumpRelayHealth>;
export declare function collectPumpLaunches(options?: {
    url?: string;
    limit?: number;
    timeoutMs?: number;
    WebSocketImpl?: PumpWebSocketLike;
}): Promise<PumpLaunchRecord[]>;
export declare function createDefaultPumpClient(options?: {
    httpBase?: string;
    wsUrl?: string;
    fetchImpl?: typeof fetch;
    WebSocketImpl?: PumpWebSocketLike;
}): PumpLiveClient;
//# sourceMappingURL=pump.d.ts.map