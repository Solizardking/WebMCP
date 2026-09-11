/** Live Pump.fun launch tape. Public MCP is x402 agency on Fly: https://x402.life/pump/mcp */
export const CLAWD_WS_HTTP_DEFAULT = "https://clawd-ws.fly.dev";
export const CLAWD_WS_WS_DEFAULT = "wss://clawd-ws.fly.dev/ws";
export const X402_LIFE_ORIGIN = "https://x402.life";
export const X402_AGENCY_NAME = "x402 agency";
export const X402_PUMP_MCP_PATH = "/pump/mcp";
export const X402_PUMP_MCP_URL = `${X402_LIFE_ORIGIN}${X402_PUMP_MCP_PATH}`;
export const PUMP_WIDGET_URI = "ui://widget/pump-fun.html";
export function clawdWsHttpBase(override) {
    return (override || CLAWD_WS_HTTP_DEFAULT).replace(/\/$/, "");
}
export function clawdWsUrl(override) {
    return override?.trim() || CLAWD_WS_WS_DEFAULT;
}
export function pumpfunUrlForMint(mint) {
    return `https://pump.fun/coin/${mint}`;
}
export function parsePumpLaunchFrame(raw) {
    let parsed = raw;
    if (typeof raw === "string") {
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    if (!parsed || typeof parsed !== "object")
        return null;
    const row = parsed;
    if (row.type !== "token-launch")
        return null;
    const mint = typeof row.mint === "string" ? row.mint.trim() : "";
    if (!mint)
        return null;
    const githubUrls = Array.isArray(row.githubUrls)
        ? row.githubUrls.filter((url) => typeof url === "string")
        : [];
    return {
        signature: typeof row.signature === "string" && row.signature ? row.signature : mint,
        time: typeof row.time === "string" && row.time ? row.time : new Date().toISOString(),
        name: typeof row.name === "string" && row.name ? row.name : "Unnamed",
        symbol: typeof row.symbol === "string" && row.symbol ? row.symbol : "???",
        mint,
        creator: typeof row.creator === "string" ? row.creator : "",
        isV2: Boolean(row.isV2),
        marketCapSol: typeof row.marketCapSol === "number" && Number.isFinite(row.marketCapSol)
            ? row.marketCapSol
            : undefined,
        imageUri: typeof row.imageUri === "string" ? row.imageUri : undefined,
        description: typeof row.description === "string" ? row.description : undefined,
        website: typeof row.website === "string" ? row.website : null,
        twitter: typeof row.twitter === "string" ? row.twitter : null,
        telegram: typeof row.telegram === "string" ? row.telegram : null,
        hasGithub: Boolean(row.hasGithub) || githubUrls.length > 0,
        githubUrls,
        pumpfunUrl: pumpfunUrlForMint(mint),
    };
}
export async function fetchPumpRelayHealth(options = {}) {
    const http = clawdWsHttpBase(options.httpBase);
    const fetchImpl = options.fetchImpl ?? fetch;
    const response = await fetchImpl(`${http}/health`, {
        signal: AbortSignal.timeout(options.timeoutMs ?? 8_000),
    });
    if (!response.ok)
        throw new Error(`Pump relay health returned ${response.status}`);
    const data = (await response.json());
    return {
        ...data,
        status: typeof data.status === "string" ? data.status : "unknown",
        http,
        ws: CLAWD_WS_WS_DEFAULT,
        mcp: X402_PUMP_MCP_URL,
        agency: X402_AGENCY_NAME,
    };
}
export async function collectPumpLaunches(options = {}) {
    const url = clawdWsUrl(options.url);
    const limit = Math.min(Math.max(options.limit ?? 8, 1), 24);
    const timeoutMs = options.timeoutMs ?? 4_000;
    const Socket = options.WebSocketImpl ?? globalThis.WebSocket;
    if (!Socket)
        throw new Error("WebSocket is not available for the Pump.fun launch relay");
    return new Promise((resolve, reject) => {
        const launches = [];
        const seen = new Set();
        let settled = false;
        let socket = null;
        const finish = (error) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            try {
                socket?.close();
            }
            catch {
                /* already closed */
            }
            if (error && launches.length === 0)
                reject(error);
            else
                resolve(launches);
        };
        const timer = setTimeout(() => finish(), timeoutMs);
        try {
            socket = new Socket(url);
        }
        catch (error) {
            finish(error instanceof Error ? error : new Error(String(error)));
            return;
        }
        socket.onmessage = (event) => {
            const parsed = parsePumpLaunchFrame(typeof event.data === "string" ? event.data : String(event.data ?? ""));
            if (!parsed || seen.has(parsed.mint))
                return;
            seen.add(parsed.mint);
            launches.push(parsed);
            if (launches.length >= limit)
                finish();
        };
        socket.onerror = () => finish(new Error("Pump.fun launch relay WebSocket error"));
        socket.onclose = () => finish();
    });
}
export function createDefaultPumpClient(options = {}) {
    return {
        fetchHealth: () => fetchPumpRelayHealth({
            httpBase: options.httpBase,
            fetchImpl: options.fetchImpl,
        }),
        listLaunches: (input) => collectPumpLaunches({
            url: options.wsUrl,
            limit: input?.limit,
            timeoutMs: input?.timeoutMs,
            WebSocketImpl: options.WebSocketImpl,
        }),
    };
}
//# sourceMappingURL=pump.js.map