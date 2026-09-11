import type { McpServer } from "@modelcontextprotocol/server";
import type { ClawdAdapters } from "../shared/adapters.js";
export declare const FACTORY_CATALOG_TOOL = "factory_catalog";
export declare const FACTORY_WHOAMI_TOOL = "factory_whoami";
export declare const REQUIRED_FACTORY_IDS: readonly ["birdeye", "blockrun", "cache", "clawd-ws", "copy-trade", "dflow", "filters", "helpers", "jupiter", "listeners", "modes", "polymarket", "pumpbot", "pumpfun", "raydium-volume-bot-master", "snipe", "telegram", "transactions", "volume", "wallet-check", "xai"];
export declare function registerFactoryCatalogTool(server: McpServer, adapters: ClawdAdapters): void;
//# sourceMappingURL=factoryTools.d.ts.map