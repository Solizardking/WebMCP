import type { WebMCPTool } from "./types.js";
export interface RegisterWebMCPOptions {
    exposedTo?: string[];
    signal?: AbortSignal;
}
export declare function registerWebMCPTools(tools: WebMCPTool[], options?: RegisterWebMCPOptions): Promise<() => void>;
//# sourceMappingURL=register.d.ts.map