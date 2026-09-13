# Railway remote MCP

This checkout supports authenticated Streamable HTTP at `/mcp` using the same
19 tools as the stdio entry point. Run locally with `npm run start:http` after
building. `npm start` continues to launch the stdio server.

Railway project: `176a5afd-f494-4f11-8295-1bfb56a58df0` (`openrouter-mcp`).
Service: `1e8dc339-2211-4f07-a188-2f2aa7d06977` (`openrouter-mcp`).

## Deployment configuration

`railway.json` builds the Dockerfile, starts `node dist/http.js`, configures
`/healthz`, enables automatic restarts, and disables idle sleeping. One replica
keeps the existing in-memory async job state consistent across requests.

Set these Railway service variables before deploying:

- `OPENROUTER_API_KEY`: the upstream key from the local `.env`.
- `MCP_AUTH_TOKEN`: a separate random token of at least 32 characters. A generated
  token is stored in the local Git-ignored `.env`; do not publish it.
- `OPENROUTER_DEFAULT_MODEL`: the model selected in `.env`.
- `OPENROUTER_MAX_TOKENS`: the cap selected in `.env`.
- `OPENROUTER_LOG_LEVEL=error`.
- `OPENROUTER_INPUT_DIR=/tmp/openrouter-input`.
- `OPENROUTER_OUTPUT_DIR=/tmp/openrouter-output`.
- `PORT=8080`.

Deploy only this project directory, excluding `.env`, client secrets, and sibling
projects. Generate a Railway public domain targeting port 8080. The endpoint is
`https://YOUR-DOMAIN/mcp`. Validate `/healthz`, unauthorized rejection, and an
authenticated MCP initialization and tool call before reporting it live.

## Client configuration

For clients supporting Streamable HTTP and bearer headers:

```json
{
  "mcpServers": {
    "openrouter-railway": {
      "url": "https://YOUR-DOMAIN/mcp",
      "headers": { "Authorization": "Bearer YOUR_MCP_AUTH_TOKEN" }
    }
  }
}
```

Use the separate MCP token, not the OpenRouter key. For VS Code, use `servers`
instead of `mcpServers` and add `"type": "http"` to the entry. Clients that require
OAuth discovery rather than custom bearer headers need a separate OAuth integration.

Browser origins are denied unless explicitly listed in the comma-separated
`MCP_ALLOWED_ORIGINS`. Native MCP clients without an Origin header are supported.

Local file paths refer to the container, not your laptop. Media and async job
files under `/tmp` are ephemeral and do not survive replacement deployments;
attach a Railway volume and change the paths if persistence is needed.

## Verification

`OPENROUTER_INTEGRATION_SKIP_PAID=1 npm run ci` passed on 2026-09-13:
1,026 unit tests, 7 regression tests, 14 integration cases, and 3 skipped paid
cases. The new HTTP tests cover authentication, origin rejection, health, and
concurrent client initialization/listing/ping. Integration tests permit upstream
soft failures and are not proof of successful model inference.

Deployment is pending approval to transfer the two credentials to Railway.
