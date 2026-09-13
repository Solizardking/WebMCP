import { createMcpHandler } from "@modelcontextprotocol/server";
import type { ClawdAdapters, X402Adapters } from "../shared/adapters.js";
import { buildPumpMcpServer } from "./buildPumpServer.js";
import { buildSolGPTMcpServer } from "./buildSolGPTServer.js";
import { buildX402McpServer } from "./buildX402Server.js";
import { buildClawdPluginMcpServer } from "./buildClawdPluginServer.js";
import type { ClawdReferenceData } from "../shared/clawd-reference-types.js";
import type { PumpLiveClient } from "../shared/pump.js";

export function createSolGPTMcpHandler(adapters: ClawdAdapters) {
  return createMcpHandler(() => buildSolGPTMcpServer(adapters));
}

export function createX402McpHandler(adapters: X402Adapters) {
  return createMcpHandler(() => buildX402McpServer(adapters));
}

export function createPumpMcpHandler(client?: PumpLiveClient) {
  return createMcpHandler(() => buildPumpMcpServer(client));
}

export function createClawdPluginMcpHandler(data?: ClawdReferenceData) {
  return createMcpHandler(() => buildClawdPluginMcpServer(data));
}
