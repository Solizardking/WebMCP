import { McpServer } from '@modelcontextprotocol/server';
import type { ClawdReferenceData } from '../shared/clawd-reference-types.js';
export declare const CLAWD_PLUGIN_TOOLS: readonly ["get-fee-tier", "list-skills", "get-skill"];
export declare const CLAWD_PLUGIN_TOOL_ANNOTATIONS: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    openWorldHint: boolean;
};
/** Complete public Clawd reference catalog, independent of the private Pump server. */
export declare function buildClawdPluginMcpServer(data?: ClawdReferenceData): McpServer;
//# sourceMappingURL=buildClawdPluginServer.d.ts.map