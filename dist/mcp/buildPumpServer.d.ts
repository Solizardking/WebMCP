import { McpServer } from "@modelcontextprotocol/server";
import { type PumpLiveClient } from "../shared/pump.js";
export declare const PUMPFUN_MCP_SERVER_NAME = "x402-agency";
export declare const PUMPFUN_MCP_TOOLS: readonly ["pump_get_relay_health", "pump_list_launches", "pump_get_launch", "render_pump_widget"];
export declare function buildPumpMcpServer(client?: PumpLiveClient): McpServer;
//# sourceMappingURL=buildPumpServer.d.ts.map