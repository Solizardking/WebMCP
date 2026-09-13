# Clawd plugin

Clawd's plugin package for OpenAI-compatible plugin hosts. Version 0.1.0 provides three public, read-only MCP tools:

- `get-fee-tier`: documented Pump.fun and PumpSwap fee tables, not live quotes.
- `list-skills`: discover bundled Clawd/Solana guides.
- `get-skill`: read a guide by exact ID.

MCP endpoint: `https://solgpt.trade/plugin/mcp`

Human hub: [solgpt.trade/mc](https://solgpt.trade/mc). `/mc` is a web page; install this plugin using `/plugin/mcp`. The broader desk endpoint `/mcp` has a different catalog and is not this three-tool reference plugin.

The portable entry points are `plugin.json`, `mcp.json`, and `skills/`. `.codex-plugin/plugin.json` and `.mcp.json` provide compatibility with older Codex plugin loaders. Register the HTTPS endpoint in ChatGPT developer mode to test the MCP connection. The plugin does not need an OpenAI API key or wallet credential from its users.

The sibling library's server-only OpenAI integration uses the owner's `OPENAI_API_KEY` for the Responses API and a separate `CLAWD_PUMP_MCP_TOKEN` for the private original Pump server. Neither key belongs in this plugin bundle.

This package is a Clawd-authored release candidate. It has not been submitted to or approved for OpenAI's public plugin directory. See `submission.md` for the remaining publisher steps.
