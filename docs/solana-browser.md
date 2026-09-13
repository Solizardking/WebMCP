# CLAWD Solana Browser

A runnable Solana workspace integrating the existing `@x402solana/webmcp` tool library, Jason McGhee's supplied browser/WebSocket implementation, the supplied WebMCP specification, and Cloudflare Browser Run. This project does not claim historical priority or W3C endorsement.

## Start locally

```sh
npm install
npm run start:browser
```

Open http://127.0.0.1:4173. The workspace reads live Solana RPC, resolves token identities, inspects exact-mint DEX Screener pools, reads a connected wallet, inspects transaction signatures, and stages swap tickets for human review. It does not sign or broadcast transactions. The first browser destination is `https://solana.com/`.

On browsers without native WebMCP, the UI and explicit `window.solanaWebMCP` application API remain available:

```js
solanaWebMCP.listTools()
await solanaWebMCP.executeTool('solana.get_network_status', {})
await solanaWebMCP.executeTool('solana.resolve_token', {query: 'SOL'})
```

This API is not a native WebMCP polyfill. Native registration prefers `document.modelContext` from the supplied draft, then `navigator.modelContext` from Chrome's early implementation. Chrome 152 currently expects JSON strings for `document.modelContext.executeTool`; the remote runner uses that format by default. Set `BROWSER_DOCUMENT_INPUT_MODE=object` for implementations matching the supplied draft object-input contract. Registration disposal aborts draft registrations and calls `unregisterTool` where supported. The token search form includes declarative `toolname`, `tooldescription`, and `toolparamdescription` attributes and `toolautosubmit` for this read-only search. Native API availability is shown separately from application tool availability.

## Cloudflare Browser Run

If Wrangler is already logged in, reuse that login without copying credentials into an environment file:

```sh
npm run start:browser:wrangler
npm run browser:run -- --wrangler
```

This uses Wrangler's `whoami --json` and `auth token --json` commands and keeps the resulting credential only in server memory. It selects the account automatically only when exactly one account is available; otherwise set `CLOUDFLARE_ACCOUNT_ID`. Install `browser-worker` dependencies first, or set `BROWSER_WRANGLER_CLI` to the path of your installed Wrangler entry point. Restart the server after an OAuth token expires. Production hosting should use a scoped API token.

Alternatively, set these variables in the server environment (never in browser JavaScript):

```sh
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-browser-rendering-edit-token
# Optional: add a deployed instance of this workspace to remote destinations.
BROWSER_RUN_ALLOWED_ORIGINS=https://your-workspace.example
# Optional: dedicated RPCs and Jupiter live quote support.
SOLANA_RPC_URL=https://your-mainnet-rpc.example
SOLANA_DEVNET_RPC_URL=https://your-devnet-rpc.example
JUPITER_API_KEY=your-jupiter-key
```

A `.env.example` is supplied; load your actual file with Node's `--env-file` flag:

```sh
npm run build:browser
node --env-file=.env apps/solana-browser/server/index.mjs
```

The Browser Run tab creates an authenticated CDP connection with `lab=true`, opens the selected Solana destination, discovers tools, and offers Live View, tool execution, screenshots, and structured human handoff. It re-discovers tools after execution. Handoffs suspend tool automation until Cloudflare reports completion. Sessions are closed after five minutes and capped at two. The browser receives only app-scoped session IDs and short-lived Live View URLs, never the Cloudflare token or authenticated CDP endpoint. Live View URLs themselves grant session access; share them only with the operator.

Quick Actions include rendered HTML, screenshots (with optional custom font CSS), visible same-domain links, structured JSON extraction, and bounded documentation crawls. Crawl uses three pages by default, depth one, `render:false`, `crawlPurposes:['search']`, and `contentUse:'reference'`. Results support refresh, pagination and cancellation. Content remains untrusted and is displayed as text, never injected as HTML. Cloudflare may reject requests based on permissions, quota, bot protection, robots.txt or Content Signals; those failures are surfaced without fabricated results. JSON extraction can consume Workers AI usage.

Run a first Cloudflare probe after setting credentials:

```sh
npm run browser:run
```

It creates a lab session at solana.com, discovers native tools, captures a screenshot, saves a redacted report under `artifacts/`, and closes the session. A missing configuration exits nonzero. A local browser test does not prove a Cloudflare run.

## Legacy MCP bridge

The entire `WebMCP-main 3` tree remains present, including config, tokens, stdio MCP server, WebSocket server, widget, build, Docker files, CNAME, package metadata and MIT license. Changes fix the bundled ESM entrypoint, explicitly bind to loopback, limit WebSocket messages, check browser origins, remove token logging, and allow an isolated configuration directory.

```sh
npm --prefix "WebMCP-main 3" install
npm run build:legacy
npm run start:legacy
# In another terminal:
npm run authorize:legacy
```

In the Agent tools tab, select **Enable legacy widget**, then paste the generated one-use connection token into the widget. The same Solana tools, a wallet/network context resource, and a token-research prompt are registered. Configure a stdio MCP client with Node and the absolute path to `WebMCP-main 3/build/index.js`, passing `--mcp`. No API token is needed in that client configuration. `WEBMCP_CONFIG_DIR` can isolate state; otherwise the upstream `.webmcp` directory is used. Do not expose this compatibility daemon publicly. It remains a legacy protocol rather than W3C conformance.

Docker runs the supplied bridge build with host port 4797 published only on loopback. Container-internal binding uses `WEBMCP_BIND_HOST=0.0.0.0` deliberately; the default outside Docker remains localhost.

## Specification and complete artifacts

`webmcp-main 2` remains the complete supplied specification tree. Its `w3c.json`, contribution rules, `.github` workflows, preview configuration, Bikeshed source and Makefile, assets, service-worker discussion, security/privacy questionnaire, implementation status, declarative explainer and W3C license are retained. Governance metadata describes the upstream group; it is not a product configuration file.

`npm run build:browser` includes both upstream trees in `build/solana-browser/spec` and `legacy-source` and produces `integration-manifest.json` with per-file SHA-256 values. Only dependency directories, build outputs, git internals and environment secrets are excluded. Source files beginning with a dot remain in the artifact but are not served over HTTP. Original CNAME and workflow files are preserved as source reference, not activated as this product's deployment settings.

The spec is served as source and explainers. Rendering the Bikeshed specification uses the upstream Makefile and its documented dependencies; the app build does not require Bikeshed. Service workers are documentation, not an implemented background-wallet agent.

## Hosting and boundaries

The server defaults to loopback. To host it, set `BROWSER_HOST=0.0.0.0`, a strong `BROWSER_APP_TOKEN`, and `BROWSER_PUBLIC_HOSTS` to your public hostnames behind HTTPS. The UI prompts for the app token and holds it only in page memory. Same-origin checks and per-process CSRF tokens protect API mutations. Destinations are restricted to the Solana presets plus explicitly configured HTTPS origins. This is a single-operator workspace; multiple tenants require isolated instances and separate credentials.

Public RPC endpoints can rate-limit; configure a dedicated RPC for sustained use. Failures display an unavailable state. Market data includes its observation time and selected pool, and is an on-demand snapshot. Mainnet swap quotes currently support SOL/USDC amount precision and require a Jupiter key. Devnet is available for network, wallet, and transaction reads; mainnet token metadata is explicitly labeled and swaps require mainnet.

## Validation

```sh
npm test
npm run build:browser
npm run build:legacy
npm run smoke:legacy
npm run smoke:browser
```

Browser evidence and remote probe reports live in `artifacts/`. Fixture tests validate wiring and failure handling; only successful live probes establish current external-service behavior.

## Browser foundations

The [Chrome and Chromium excerpt](references/chrome-chromium.md) includes Sam Dutton’s author image, profile links, browser comparison, Chrome credits image, and related reading. The [reference collection](references/README.md) preserves all nine supplied Browser Run and Blink document snapshots with source links and checksums.

## References

- [Cloudflare WebMCP](https://developers.cloudflare.com/browser-run/features/webmcp/)
- [Browser Run CDP](https://developers.cloudflare.com/browser-run/cdp/)
- [Live View](https://developers.cloudflare.com/browser-run/features/live-view/)
- [Human in the Loop](https://developers.cloudflare.com/browser-run/features/human-in-the-loop/)
- [Quick Actions](https://developers.cloudflare.com/browser-run/quick-actions/)
- [Solana RPC](https://solana.com/docs/rpc)
- [Supplied specification](../webmcp-main%202/README.md)
- [Supplied legacy implementation](../WebMCP-main%203/README.md)

Native browser smoke requires installed Google Chrome and uses WebMCP testing flags. Set `BROWSER_TEST_URL` to test a non-default local port. It records native JavaScript and declarative execution, live RPC, review-ticket state, mobile overflow, and legacy widget initialization.
