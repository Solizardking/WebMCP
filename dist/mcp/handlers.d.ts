import type { ClawdAdapters, X402Adapters } from "../shared/adapters.js";
import type { PumpLiveClient } from "../shared/pump.js";
export declare function createSolGPTMcpHandler(adapters: ClawdAdapters): import("@modelcontextprotocol/server").McpHttpHandler;
export declare function createX402McpHandler(adapters: X402Adapters): import("@modelcontextprotocol/server").McpHttpHandler;
export declare function createPumpMcpHandler(client?: PumpLiveClient): import("@modelcontextprotocol/server").McpHttpHandler;
//# sourceMappingURL=handlers.d.ts.map