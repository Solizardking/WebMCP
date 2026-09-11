# Production domain map

## WebMCP surfaces

- `https://solgpt.us` — consumer Solana AI + live WebMCP tools
- `https://clawdcompute.us` — compute/model dashboard + live WebMCP tools
- `https://x402.life` — x402 routing/payment UI + live WebMCP tools
- Cheshire Terminal — advanced trading UI + live WebMCP tools

Register WebMCP tools in top-level page JavaScript. Do not hide the registration inside an iframe.

## MCP surfaces

- `https://x402.life/mcp` — canonical x402 MCP Streamable HTTP endpoint
- `https://solgpt.us/mcp` — canonical SOLGPT/Solana MCP Streamable HTTP endpoint
- `https://solgpt.us/mc` — branded human-facing connection hub; link or redirect to `/mcp`

## Recommended routing

`solgpt.us/mc` should render documentation / connection buttons for ChatGPT, Codex, and MCP Inspector.
It should not itself replace the protocol endpoint unless you intentionally support MCP traffic on both routes.

## Clawd release candidate

The implemented public Clawd plugin endpoint is `https://solgpt-pump-mcp-original.fly.dev/plugin/mcp`, served by `PUMP-MCP-main/src/plugin.ts` through its existing HTTP service. It has its own MCP sessions and a three-tool reference catalog. The existing `/mcp` still requires its bearer credential and retains its private tools.

The branded domain routes above are targets, not evidence of deployment. A public listing needs the publisher's verified identity, approved legal/support URLs, and the portal-issued domain challenge. Secure MCP Tunnel is for private testing and is not a public submission endpoint.
