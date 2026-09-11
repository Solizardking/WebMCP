"use client";

import { useEffect } from "react";
import type { ClawdAdapters } from "@x402solana/webmcp";
import {
  createClawdComputeWebMCPTools,
  createPumpWebMCPTools,
  createSolanaWebMCPTools,
  createSolGPTWebMCPTools,
  createX402WebMCPTools,
  registerWebMCPTools,
} from "@x402solana/webmcp/webmcp";

export function SolanaWebMCPBridge({ adapters }: { adapters: ClawdAdapters }) {
  useEffect(() => {
    const controller = new AbortController();

    const tools = [
      ...createSolanaWebMCPTools(adapters),
      ...createSolGPTWebMCPTools(adapters),
      ...createClawdComputeWebMCPTools(adapters),
      ...createX402WebMCPTools(adapters),
      ...createPumpWebMCPTools(),
    ];

    void registerWebMCPTools(tools, { signal: controller.signal }).catch((error) => {
      if (!controller.signal.aborted) console.error("WebMCP registration failed", error);
    });

    return () => controller.abort();
  }, [adapters]);

  return null;
}
