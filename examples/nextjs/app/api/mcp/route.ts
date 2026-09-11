import { createSolGPTMcpHandler } from "@x402solana/webmcp/mcp";
import { adapters } from "../../../lib/adapters";

const handler = createSolGPTMcpHandler(adapters);

export async function GET(request: Request) {
  return handler.fetch(request);
}

export async function POST(request: Request) {
  return handler.fetch(request);
}

export async function DELETE(request: Request) {
  return handler.fetch(request);
}
