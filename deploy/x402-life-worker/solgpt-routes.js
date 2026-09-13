import { createClawdPluginMcpHandler, createPumpMcpHandler } from '../../dist/mcp/index.js';

export const SOLGPT_ORIGIN = 'https://solgpt.trade';
export const DESK_ORIGIN = 'https://solgpt-nl-trading-desk-5.vercel.app';
const plugin = createClawdPluginMcpHandler();
const pump = createPumpMcpHandler();

export const SOLGPT_HUB = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>SOLGPT · Connect your agent</title><meta name="description" content="Connect ChatGPT, Codex and MCP clients to SOLGPT and the Clawd reference library.">
<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#080b10;color:#eaf3ee;font:16px/1.6 system-ui,sans-serif}main{max-width:850px;margin:auto;padding:60px 22px}a{color:#80f5bc}h1{font-size:clamp(32px,6vw,52px);line-height:1.1;letter-spacing:-.04em}h2{font-size:20px}p{color:#b8c9c1}.brand{font-weight:800;letter-spacing:.14em;color:#80f5bc}.cards{display:grid;gap:18px;margin:32px 0}.card{min-width:0;border:1px solid #293c33;border-radius:14px;padding:24px;background:#101812}code,pre{font:14px/1.6 ui-monospace,monospace}pre{max-width:100%;padding:14px;background:#070d09;border-radius:8px;overflow:auto}code{overflow-wrap:anywhere}.links{display:flex;flex-wrap:wrap;gap:18px}footer{margin-top:36px;color:#9db1a6}</style></head>
<body><main><a class="brand" href="/">SOLGPT</a><h1>Connect your agent.</h1>
<p>Use the Solana desk from an MCP client, or connect the Clawd reference library for integration guides and fee documentation.</p>
<div class="cards"><section class="card"><h2>Solana desk</h2><p>Token discovery, quotes, models and market tools. Wallet identity and restricted actions require the appropriate authenticated session. A quote never signs or submits a trade.</p>
<pre>https://solgpt.trade/mcp</pre><p>Transport: Streamable HTTP</p>
<pre>codex mcp add solgpt --url https://solgpt.trade/mcp</pre></section>
<section class="card"><h2>Clawd reference library</h2><p>Public read-only tools: <code>get-fee-tier</code>, <code>list-skills</code> and <code>get-skill</code>. Browse the bundled guides without connecting a wallet.</p>
<pre>https://solgpt.trade/plugin/mcp</pre>
<pre>codex mcp add clawd --url https://solgpt.trade/plugin/mcp</pre></section>
<section class="card"><h2>ChatGPT and MCP Inspector</h2><p>In your client's connector settings, add the appropriate URL above. This page is the connection guide; MCP requests belong on the protocol endpoints.</p>
<pre>npx @modelcontextprotocol/inspector</pre><p>Choose Streamable HTTP, paste an endpoint and connect. Initialize, then list tools.</p>
<div class="links"><a href="https://chatgpt.com/">Open ChatGPT</a><a href="https://chatgpt.com/codex">Open Codex</a><a href="/pump/mcp">Pump MCP</a></div></section>
<section class="card"><h2>Command-line tools</h2><p>The CLI includes SIWX authorization and a paper OODA loop. Inspect help before supplying a local wallet credential.</p>
<pre>npx -p @x402solana/cli x402 --help
npx -p @x402solana/cli ooda --ticks 8 --seed 42 --sleep 0</pre>
<p>Authorization defaults to <code>https://x402.life/authorize</code>. The paper loop does not submit trades.</p></section></div>
<footer>Keep private keys in your wallet or local credential store. Review and sign transactions yourself.</footer></main></body></html>`;

function responseHeaders(request, initial) {
  const headers = new Headers(initial);
  headers.set('Access-Control-Allow-Origin', request.headers.get('Origin') || '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Mcp-Method, Last-Event-ID');
  headers.set('Access-Control-Expose-Headers', 'Mcp-Session-Id, Mcp-Protocol-Version, WWW-Authenticate');
  headers.append('Vary', 'Origin');
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return headers;
}

export async function fetchSolgpt(request, fetchUpstream = fetch) {
  const url = new URL(request.url);
  const route = url.pathname.replace(/\/+$/, '') || '/';
  const supported = ['/mc', '/mcp', '/plugin/mcp', '/pump/mcp'].includes(route);
  if (!supported) {
    // A trailing wildcard is needed for Cloudflare query-string matching.
    // Neighboring application paths caught by it still reach their existing origin.
    if (url.hostname === 'solgpt.trade' || url.hostname === 'www.solgpt.trade') return fetchUpstream(request);
    return new Response('Not found', { status: 404 });
  }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: responseHeaders(request) });
  if (route === '/mc') {
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Use /mcp for MCP requests.', {
      status: 405, headers: responseHeaders(request, { Allow: 'GET, HEAD, OPTIONS' }),
    });
    return new Response(request.method === 'HEAD' ? null : SOLGPT_HUB, {
      headers: responseHeaders(request, { 'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': "default-src 'none'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'" }),
    });
  }
  if (route === '/plugin/mcp' || route === '/pump/mcp') {
    const response = await (route === '/plugin/mcp' ? plugin : pump).fetch(request);
    return new Response(response.body, { status: response.status, headers: responseHeaders(request, response.headers) });
  }
  if (!['GET', 'HEAD', 'POST', 'DELETE'].includes(request.method)) return new Response('Method not allowed', {
    status: 405, headers: responseHeaders(request, { Allow: 'GET, HEAD, POST, DELETE, OPTIONS' }),
  });
  // The fixed desk origin owns provider credentials and verifies scoped identity.
  // Never forward unrelated site cookies or caller-controlled proxy identity headers.
  const headers = new Headers();
  for (const key of ['accept', 'content-type', 'authorization', 'mcp-session-id', 'mcp-protocol-version', 'mcp-method', 'last-event-id', 'origin']) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  request.signal.addEventListener('abort', abort, { once: true });
  if (request.signal.aborted) controller.abort();
  const timer = setTimeout(abort, 20_000);
  try {
    const response = await fetchUpstream(`${DESK_ORIGIN}/mcp${url.search}`, {
      method: request.method, headers, redirect: 'manual', signal: controller.signal,
      ...(!['GET', 'HEAD'].includes(request.method) && request.body ? { body: request.body, duplex: 'half' } : {}),
    });
    return new Response(response.body, { status: response.status, headers: responseHeaders(request, response.headers) });
  } catch {
    return new Response(JSON.stringify({ error: 'mcp_upstream_unavailable' }), {
      status: 502, headers: responseHeaders(request, { 'Content-Type': 'application/json', 'Retry-After': '5' }),
    });
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener('abort', abort);
  }
}
