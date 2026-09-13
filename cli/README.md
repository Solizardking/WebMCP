# @x402solana/cli

Node CLIs for SOLGPT / x402.life: one-shot SIWX login (`x402`) and the paper OODA loop (`ooda`).

Source: [https://github.com/Solizardking/solgpt---nl-trading-desk--5-](https://github.com/Solizardking/solgpt---nl-trading-desk--5-)

```bash
npx -p @x402solana/cli x402 --origin https://x402.life
npx -p @x402solana/cli ooda --ticks 8 --seed 42 --sleep 0

npx -p @x402solana/cli x402 --help
npx -p @x402solana/cli x402 authorize --origin https://x402.life --secret-key <base58>
X402_SECRET_KEY=... npx -p @x402solana/cli x402 --origin https://x402.life

npx -p @x402solana/cli ooda --help
```

`x402` prints JSON `{ ok, token, walletAddress, userId }` then the Bearer token.
`ooda` runs the paper loop and exits with that loop's `exitCode`.

Use the Bearer on `POST /mcp`. `/mc` is the human-facing MCP hub; MCP clients connect to `/mcp`, not `/mc`. The canonical desk hub is [solgpt.trade/mc](https://solgpt.trade/mc). The CLI retains `https://x402.life` as its authorization default; `--origin` or `X402_ORIGIN` selects another server that provides `/authorize`.

The desk WebMCP guide at `/webmcp` copies these same shipped commands. `x402` explicitly signs the login challenge using the supplied key; it does not submit a trade or payment. `ooda` is paper-only. Configured Honcho/Supermemory integrations may read or write memory, and `--llm` may call the configured model provider.

## Build and install from this checkout

This directory reuses the trading desk's SIWX and paper-loop source code. In the normal `<desk>/clawd-webmcp/WebMCP/cli` layout, the builder finds `<desk>/src` automatically. For a standalone WebMCP checkout, set `SOLGPT_DESK_ROOT` to an installed trading-desk source checkout; it must contain `src/services/x402Authorize.ts`, `src/services/x402Siwx.ts`, and `src/lib/ooda/loop.ts`. The build fails clearly if these inputs are missing.

```bash
# From clawd-webmcp/WebMCP/cli, with the parent desk dependencies installed:
npm run build
node dist/x402.js --help
node dist/ooda.js --help
npm pack

# A standalone WebMCP checkout can use an explicit desk source location:
SOLGPT_DESK_ROOT=/path/to/solgpt-trading-desk npm run build

# Install the packed commands locally; no repository source is needed at runtime:
npm install -g ./x402solana-cli-0.1.0.tgz
```

The tarball includes `dist/`, this README, and package metadata. `@solana/web3.js` is the only external runtime dependency; shared desk code and other required modules are bundled. Rebuilding or packing locally does not update the version already published on npm.
