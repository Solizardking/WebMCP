# WebMCP upstream (optional local clone)

This path is **not** a git submodule. The desk already vendors WebMCP sources
under `clawd-webmcp/src`. Mapping the upstream repo in desk-root `.gitmodules`
made Vercel recurse-clone it on every deploy.

To work against upstream locally:

```bash
scripts/clone-clawd-webmcp-extras.sh webmcp
# or:
git clone --depth 1 https://github.com/Solizardking/WebMCP.git clawd-webmcp/WebMCP
```

Do not `git add` the clone as a gitlink (mode `160000`). Keep it untracked or
gitignored on your machine.

The canonical connection hub is [solgpt.trade/mc](https://solgpt.trade/mc). MCP clients use `https://solgpt.trade/mcp` for the desk or `https://solgpt.trade/plugin/mcp` for the public Clawd reference catalog.

The server-only OpenAI helper and `examples/node/ask.mjs` default to that public reference endpoint with exactly `get-fee-tier`, `list-skills`, and `get-skill`; no MCP token is needed. Explicit `CLAWD_PUMP_MCP_URL` / `CLAWD_PUMP_MCP_TOKEN` overrides remain compatible with private servers and their legacy four-tool read catalog, including `get-token-info`. Calling the example requires `OPENAI_API_KEY` and makes an OpenAI API request. See the [CLI README](cli/README.md) for the separate SIWX login and paper-loop commands.
