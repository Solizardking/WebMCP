import { createMcpHandler } from "@modelcontextprotocol/server";
import { buildPumpMcpServer } from "./buildPumpServer.js";
import { buildSolGPTMcpServer } from "./buildSolGPTServer.js";
import { buildX402McpServer } from "./buildX402Server.js";
import { buildClawdPluginMcpServer } from "./buildClawdPluginServer.js";
export function createSolGPTMcpHandler(adapters) {
    return createMcpHandler(() => buildSolGPTMcpServer(adapters));
}
export function createX402McpHandler(adapters) {
    return createMcpHandler(() => buildX402McpServer(adapters));
}
export function createPumpMcpHandler(client) {
    return createMcpHandler(() => buildPumpMcpServer(client));
}
export function createClawdPluginMcpHandler(data) {
    return createMcpHandler(() => buildClawdPluginMcpServer(data));
}
//# sourceMappingURL=handlers.js.map