import { createMcpHandler } from "@modelcontextprotocol/server";
import { buildPumpMcpServer } from "./buildPumpServer.js";
import { buildSolGPTMcpServer } from "./buildSolGPTServer.js";
import { buildX402McpServer } from "./buildX402Server.js";
export function createSolGPTMcpHandler(adapters) {
    return createMcpHandler(() => buildSolGPTMcpServer(adapters));
}
export function createX402McpHandler(adapters) {
    return createMcpHandler(() => buildX402McpServer(adapters));
}
export function createPumpMcpHandler(client) {
    return createMcpHandler(() => buildPumpMcpServer(client));
}
//# sourceMappingURL=handlers.js.map