# Local sandbox development

Run these commands from `apps/sandbox-container`. Use Node.js 22 or newer and the repository's pinned pnpm version. Docker Desktop or Colima must be running; on this Mac use `colima start` if needed.

```sh
pnpm --filter 'containers-mcp...' install --frozen-lockfile
pnpm local:setup
pnpm dev
```

`local:setup` creates a random bearer token in the ignored `.dev.vars` with mode 0600, preserving existing configuration. `dev` builds and starts Docker Compose, waits for a healthy runtime, then starts Wrangler at `http://127.0.0.1:8976/mcp`. The health endpoint is `/healthz`.

Configure your MCP client for Streamable HTTP at that URL with `Authorization: Bearer <LOCAL_SANDBOX_TOKEN from .dev.vars>`. Keep the token private. `/sse` is a Streamable HTTP alias, not the retired SSE session transport. This local Worker authenticates one local operator; it does not require Cloudflare OAuth or an API token.

Commands run in a Linux container as uid 1000. The root filesystem is read-only, with writable temporary `/workdir` and `/tmp`, no mounted host directories, and no Docker socket. Outbound networking is available. Runtime port 8080 and MCP port 8976 bind to loopback. The runtime is a trusted local backend; local processes can access it directly. Do not forward either port publicly.

All local clients share one container. `container_initialize` checks and attaches to it; it does not erase the local filesystem. `pnpm local:reset` recreates the container and discards all its files. Stopping the container also discards its tmpfs files. Python packages can be installed into a venv under `/workdir`; Node packages can be installed into that working directory.

```sh
pnpm smoke:local       # Requires pnpm dev running; exercises all seven tools
pnpm test             # Worker transport and Node file utility tests
pnpm check:types
pnpm check:lint
pnpm exec tsc -p container/tsconfig.json
pnpm local:down       # Stops/removes Docker runtime; Ctrl-C stops Wrangler
```

`pnpm start:container` is a low-level runtime debugging command that executes directly on the host. Use `pnpm dev` for the Docker-backed setup.

The model-driven suites under `evals/` require AI Gateway/OpenAI credentials and are separate from the deterministic local smoke check. The existing `eval:server` uses the hosted OAuth development path and executes the runtime on the host; use it only when deliberately evaluating that path.

## Hosted deployments

`wrangler.local.jsonc` is exclusively for local development. The staging and production environments in `wrangler.jsonc` reference Cloudflare's upstream account, domains, KV namespaces, and private image registry. Provision your own account resources, OAuth application, cookie encryption key, routes, and published container image before deploying a fork. Local setup does not change or deploy those environments.

The Docker image copies only runtime source and its separately locked dependencies. After changing runtime dependencies, update both the app manifest/pnpm lockfile and `container/package.json`/`container/package-lock.json`, then rebuild with `pnpm local:up`.
