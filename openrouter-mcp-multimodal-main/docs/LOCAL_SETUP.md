# Local setup

Open this `openrouter-mcp-multimodal-main` folder as your editor workspace.
Dependencies are installed with `npm ci`; compile the server with `npm run build`.
Node.js 22 or newer is required. Python and Docker are optional alternative launchers.

Put your OpenRouter API key in `.env` as `OPENROUTER_API_KEY=...`.
The existing `.env` is preserved; `.env.example` supplies a reusable template.
Never copy your key into an MCP configuration or commit it.

The local `.vscode/mcp.json` and `.cursor/mcp.json` register `openrouter` using
`scripts/start-local.sh`. Start/enable it in your editor's MCP controls.
These configurations contain absolute paths for this machine; update them if you
move the checkout or change the Node.js installation. If you open the parent
WebMCP folder instead, merge the entry into that workspace's corresponding config.

The launcher changes to the project directory before starting Node, so `.env`
and the default media sandbox resolve consistently. You can also run it manually:

```sh
sh scripts/start-local.sh
```

This is a stdio MCP server: an idle terminal is normal; it does not serve a web page.
Your MCP client launches it on demand, so a background daemon is unnecessary.

## Verification

```sh
npm run build
node scripts/smoke-list-tools.mjs
npm test
npm run test:regression
OPENROUTER_INTEGRATION_SKIP_PAID=1 npm run ci
```

The tool-list smoke uses a dummy key and verifies local startup only. The full CI
command also runs live integration tests and needs a valid OpenRouter key and
network access. The skip-paid flag omits paid generation tests. Upstream model
availability and rate limits can affect live tests; some integration cases permit
soft failures, so a passing suite alone does not prove successful inference.

## Setup verification on 2026-09-13

- Node.js 24.15.0; dependencies installed from the lockfile.
- Lint, formatting, version synchronization, and TypeScript build passed.
- 1,021 unit tests and 7 regression tests passed.
- Integration suite: 14 passed, 3 paid cases skipped. The local key was still a
  placeholder; permitted upstream soft failures mean this does not verify authentication.
- The configured launcher started from `/tmp`, completed MCP initialization as
  version 5.0.1, listed 19 tools, and answered a ping using a dummy smoke key.
- Tests needing loopback HTTP fixtures passed with network access enabled.

Remaining: replace the placeholder key in `.env` and verify an authenticated
OpenRouter request before relying on inference tools.
