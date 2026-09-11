# @x402solana/webmcp

SVM agent and commerce integration: [implementation and setup](../docs/svm-agents.md).
The SOLGPT MCP catalog includes `stonk_market`, `stonk_token`, and `stonk_launch_status`.
`StonkClient`, `NoriClient`, and `createStonkWebMCPTools` are exported for wallet apps and agent runtimes.
Launch submission stays in the wallet application; public MCP tools cannot sign or spend.

Shared WebMCP + MCP starter kit for the Clawd Solana agent network.

## Surfaces

- **solgpt.us** — consumer Solana AI / trading agent
- **clawdcompute.us** — compute, models, inference, verification
- **x402.life** — x402 payment + agent-commerce interface
- **x402.life/mcp** — x402 MCP endpoint
- **solgpt.us/mcp** — canonical SOLGPT MCP endpoint
- **solgpt.us/mc** — human-facing connection hub
- **Cheshire Terminal** — advanced trading + portfolio surface

## Design rule

The agent may inspect, resolve, quote, simulate, compare, and stage. The starter kit deliberately does **not** expose seed/private-key access or silent transaction signing/broadcasting. Final Solana authorization belongs to the user's wallet and your normal application confirmation flow.

## Install

```bash
npm install @x402solana/webmcp
```

From this repo:

```bash
npm install
npm run build
```

The code targets the current MCP TypeScript SDK v2 package split:

```bash
npm install @modelcontextprotocol/server zod
```

## What WebMCP is

WebMCP is a browser surface: a page registers JavaScript tools on `document.modelContext` (name, description, JSON Schema, `execute`) so agents call page functions instead of scraping. Tools run in the same visible UI as the human. If `document.modelContext` is missing, registration is a no-op.

This kit also serves Streamable HTTP MCP at `/mcp` (and the `/mc` hub). Named tool packs: `solana.*`, `solgpt.*`, `clawd.*`, `x402.*`, `pump.*`. Agents may inspect, resolve, quote, simulate, compare, and stage. They do not silent-sign or spend. Staging still requires the user's wallet confirmation.

Humans: the interactive desk guide is `/webmcp` (catalog from these factories, try-it `execute()`, ChatGPT / Codex / MCP Inspector snippets, and `@x402solana/cli`). Agents: `/agent/webmcp`. Authenticate MCP POST with `npx -p @x402solana/cli x402 authorize`. Paper `ooda` does not spend.

## WebMCP

Create the tools from your existing app logic and register them in the **top-level page**:

```ts
import {
  createSolanaWebMCPTools,
  createSolGPTWebMCPTools,
  createClawdComputeWebMCPTools,
  createX402WebMCPTools,
  registerWebMCPTools,
} from "@x402solana/webmcp";

const tools = [
  ...createSolanaWebMCPTools(adapters),
  ...createSolGPTWebMCPTools(adapters),
  ...createClawdComputeWebMCPTools(adapters),
  ...createX402WebMCPTools(adapters),
];

const dispose = await registerWebMCPTools(tools);
```

### Initial WebMCP tool set

```text
solana.get_wallet_context
solana.resolve_token
solana.get_swap_quote
solana.stage_swap
solana.simulate_transaction   # when adapter supplied
solana.inspect_transaction    # when adapter supplied

solgpt.ask

clawd.get_models
clawd.run_inference

x402.get_payment_quote
x402.stage_payment
x402.get_receipt              # when adapter supplied

pump.get_relay_health
pump.list_launches
```

## MCP

Three server factories are provided:

```ts
import {
  createSolGPTMcpHandler,
  createX402McpHandler,
  createPumpMcpHandler,
} from "@x402solana/webmcp/mcp";

const solgpt = createSolGPTMcpHandler(adapters);
const x402 = createX402McpHandler(adapters);
const pumpfun = createPumpMcpHandler();
```

Expose them as Streamable HTTP endpoints:

```text
https://solgpt.us/mcp
https://x402.life/mcp
https://x402.life/pump/mcp
```

x402 agency live tools are served on Fly at `https://x402.life/pump/mcp`: `pump_get_relay_health`, `pump_list_launches`, `pump_get_launch`, and `render_pump_widget`. They never sign or trade.

The SDK's `createMcpHandler()` is Web-standard, so the same handler can be wrapped for Vercel, Cloudflare-compatible runtimes, Node middleware, or other Fetch-style servers.

## Adapter boundary

This package intentionally does not duplicate your existing trading or payment logic. Implement `ClawdAdapters` using the exact functions already powering the human UI:

- wallet context
- token resolution
- Jupiter/Raydium/ClawdRouter quote
- swap-ticket staging
- Solana simulation/inspection
- x402 quote/staging/receipts
- clawdcompute.us model routing
- SOLGPT intelligence

That keeps WebMCP and MCP as controlled agent interfaces over the same application permissions and validation the human interface already uses.

## Production routing

See [`deploy/domain-map.md`](./deploy/domain-map.md).

## Next integration step

Replace `examples/nextjs/lib/adapters.ts` placeholders with your real SOLGPT/Cheshire/x402/Clawd Compute functions. In particular, wire `stageSwap()` to the same state/store action used by the visible swap ticket so a WebMCP call visibly updates the page for user review.

## Verified local setup and Clawd plugin

Run commands from this directory:

```sh
npm ci
npm test
npm start                  # loopback demo at 127.0.0.1:3333/mcp
npm run ask -- "Use get-fee-tier and explain the documented fees."
```

`npm start` is an explicitly labelled protocol fixture. It has no live wallet, quote, payment or inference adapters. The Next.js files are integration templates, not a standalone Next.js app. Unconfigured adapters fail explicitly.

`npm run ask` reads the parent `.env.local` using Node's env-file support. It calls OpenAI's Responses API with `OPENAI_API_KEY`, defaults to `gpt-6-astra`, and connects the original `PUMP-MCP-main` server. Optional settings: `OPENAI_MODEL`, `CLAWD_PUMP_MCP_URL`, and `CLAWD_PUMP_MCP_TOKEN`. The host desk enables this connection with `CLAWD_PUMP_MCP_ENABLED=true`. Its existing `MCP_HTTP_AUTH_TOKEN` remains separate because that token may belong to another MCP server.

Browser components should import from `@x402solana/webmcp/webmcp`; server-only OpenAI code is exported from `@x402solana/webmcp/openai`. Never pass keys into client components.

The portable Clawd plugin is in [`plugins/clawd`](plugins/clawd/README.md). Its public catalog provides fee tables and guides; the private Responses integration additionally permits token-information lookup. Public plugin submission requires publisher verification and directory review.

API references: [OpenAI MCP and Connectors](https://developers.openai.com/api/docs/guides/tools-connectors-mcp), [MCP TypeScript SDK v2](https://ts.sdk.modelcontextprotocol.io/v2/), [WebMCP specification](https://webmachinelearning.github.io/webmcp/).

## Release commands

```sh
npm run smoke:plugin       # test the deployed public MCP endpoint
npm run package:plugin     # deterministic ZIP and SHA-256 checksum in releases/
```

The packager checks that portable and compatibility manifests agree, verifies MCP wiring, and includes only the eight named plugin files. Python 3 is required for packaging. It does not include environment files, keys, node_modules, or the private Pump server.
