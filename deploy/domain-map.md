# Production domain map

Verified 2026-09-13 for the SOLGPT MCP deployment below. Worker version: `86081cb9-e191-47d9-9dbe-509c9ab880f3`. [Machine-readable live evidence](./solgpt-live-verification-2026-09-13.json).

The deployed hub passes 390px and 1440px Chromium checks with no overflow, console errors or failed assets. Live read tools return 18 models, one SOL token candidate and relay status `ok`. The plugin smoke passes its exact catalog, three read calls and invalid-tool/guide rejection checks. No wallet login, payment or signed trade was performed.

## Live SOLGPT endpoints

| URL | Purpose | Verified behavior |
| --- | --- | --- |
| https://solgpt.trade/mc | Human connection hub | HTTP 200; separate client connection instructions |
| https://solgpt.trade/mcp | SOLGPT Streamable HTTP MCP | Initialization and exact 10-tool catalog |
| https://solgpt.trade/plugin/mcp | Public Clawd reference plugin | Three tools, 57 bundled guides, fee reference tables |
| https://solgpt.trade/pump/mcp | Public Pump Streamable HTTP MCP | Four tools and live relay health |

`/mc` is HTML for people. Clients send MCP requests to the relevant protocol URL. Both JSON and SSE replies are supported by the release smoke checker. The public Clawd plugin exposes only `get-fee-tier`, `list-skills` and `get-skill`; it does not sign, trade or read local files.

## Deployment ownership

The `solgpt-webmcp` Cloudflare Worker handles only `solgpt.trade/mc*`, `solgpt.trade/plugin/mcp*` and `solgpt.trade/pump/mcp*`. Exact paths are checked inside the Worker; neighboring paths captured by a wildcard pass through to the existing origin. `www` and the existing gateway Worker were not changed.

The apex CNAME still targets `ce36ee1b610ab3e7.vercel-dns-017.com`; Cloudflare proxying is enabled so Worker Routes execute. The zone already had Full SSL and an active apex/wildcard certificate. The homepage remains the existing Next.js/Vercel application and returned HTTP 200 after deployment.

The Solana MCP catalog proxies to the verified desk origin `https://solgpt-nl-trading-desk-5.vercel.app/mcp`. That backend retains provider credentials and verifies scoped identity. The proxy preserves authorization/protocol headers and excludes unrelated site cookies and caller-supplied proxy identity headers. The Clawd reference catalog and Pump handler execute inside the Worker.

Deploy from this package root:

```sh
npm run build
npx --yes wrangler@4.131.1 deploy --env solgpt --config deploy/x402-life-worker/wrangler.toml
node scripts/smoke-plugin.mjs
```

The default Wrangler environment remains the historical `x402-life-origin` configuration. Use `--env solgpt` for this deployment. Both checked-in package copies contain matching SOLGPT worker modules/configuration. The deploy artifact is bundled source; `.wrangler` state and local credentials are not published.

The old `solgpt-pump-mcp-original.fly.dev/plugin/mcp` endpoint failed its connection probe and is no longer the plugin default. The portable handler preserves all three tool names and all 57 original guide bodies. Regenerate its checked-in reference data with `node scripts/bundle-clawd-reference.mjs` from a workspace containing `PUMP-MCP-main`; the deployed runtime has no filesystem or Fly dependency.

## Other documented surfaces

- `https://x402.life/mcp` remains the payment catalog; the CLI authorization default is `https://x402.life/authorize`.
- `https://solgpt.us`, `https://clawdcompute.us`, `https://x402.life` and Cheshire Terminal are separately documented WebMCP application surfaces. This deployment does not independently certify those hosts.
- Register WebMCP tools in top-level page JavaScript rather than an iframe.

A working public plugin endpoint is separate from directory publication. Publisher identity, legal/support URLs and any portal-issued domain challenge still require the actual listing review; this deployment makes no directory approval claim.
