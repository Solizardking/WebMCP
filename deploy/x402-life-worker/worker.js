/**
 * x402.life origin: Streamable HTTP MCP from shipped @x402solana/webmcp handlers.
 * Cloudflare origin SSL to the zone target is 525, so this Worker is the live
 * origin. Desk/API traffic is proxied to the Vercel production alias.
 */
import { createPumpMcpHandler, createX402McpHandler } from '../../dist/mcp/index.js';
import { fetchSolgpt } from './solgpt-routes.js';

const DESK = 'https://solgpt-trading-desk.vercel.app';

const unavailable = async () => {
  throw new Error('x402 adapter not configured; staging fails closed');
};

const x402 = createX402McpHandler({
  getPaymentQuote: unavailable,
  stagePayment: unavailable,
});
const pump = createPumpMcpHandler();

const HUB = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>x402.life MCP hub</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #07080c; color: #e8eef7; }
    main { max-width: 720px; margin: 0 auto; padding: 48px 20px 80px; }
    h1 { font-size: 28px; letter-spacing: -0.03em; }
    p, li { line-height: 1.5; color: #b7c2d0; }
    code { color: #9be7c4; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin: 28px 0; }
    a.btn { display: inline-block; padding: 12px 16px; border-radius: 10px; background: #14f195; color: #06140c; font-weight: 700; text-decoration: none; }
    a.secondary { background: #1b2230; color: #e8eef7; }
    .card { border: 1px solid #1f2a3a; border-radius: 14px; padding: 16px 18px; margin: 14px 0; background: #0d121b; }
  </style>
</head>
<body>
  <main>
    <p>Human-facing MCP connection hub</p>
    <h1>Connect ChatGPT, Codex, and MCP Inspector</h1>
    <p>The protocol endpoint is <a href="/mcp"><code>/mcp</code></a>. This page does not replace Streamable HTTP — it documents how to attach a client.</p>
    <p>This host serves the <code>x402-life</code> payment catalog at <code>https://x402.life/mcp</code>.</p>
    <div class="actions">
      <a class="btn" href="https://chatgpt.com/">ChatGPT</a>
      <a class="btn secondary" href="https://chatgpt.com/codex">Codex</a>
      <a class="btn secondary" href="/mcp">Open /mcp</a>
    </div>
    <div class="card">
      <strong>MCP Inspector</strong>
      <p>Run <code>npx @modelcontextprotocol/inspector https://x402.life/mcp</code> then paste <code>https://x402.life/mcp</code>.</p>
    </div>
    <div class="card">
      <strong>Canonical Streamable HTTP URL</strong>
      <p><code>https://x402.life/mcp</code></p>
      <p>Initialize and <code>tools/list</code> against this path. Pump tape is <code>https://x402.life/pump/mcp</code>.</p>
    </div>
  </main>
</body>
</html>`;

async function firecrawlHmacHex(secret, raw) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, raw);
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function firecrawlSignatureHex(header) {
  const text = String(header || '');
  return text.includes('=') ? text.split('=').pop() || '' : text;
}

async function verifyFirecrawlSignature(secret, raw, header) {
  const signing = String(secret || '').trim();
  if (!signing) return { ok: false, status: 503, error: 'webhook_not_configured' };
  const hex = firecrawlSignatureHex(header);
  const expected = await firecrawlHmacHex(signing, raw);
  if (!hex || hex.length !== expected.length || hex.toLowerCase() !== expected) {
    return { ok: false, status: 401, error: 'invalid_signature' };
  }
  return { ok: true };
}

function cors(req, headers) {
  const origin = req.headers.get('origin') || '*';
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Mcp-Method');
  headers.set('Access-Control-Expose-Headers', 'Mcp-Session-Id, Mcp-Protocol-Version, WWW-Authenticate');
  return headers;
}

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    if (env.MCP_PUBLIC_ORIGIN === 'https://solgpt.trade' || url.hostname === 'solgpt.trade' || url.hostname === 'www.solgpt.trade') {
      return fetchSolgpt(request);
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(request, new Headers()) });
    }
    if (url.pathname === '/mc') {
      const headers = cors(request, new Headers({ 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }));
      return new Response(HUB, { status: 200, headers });
    }
    if (url.pathname === '/fire/hook' || url.pathname.startsWith('/webhook/firecrawl')) {
      if (request.method === 'GET' || request.method === 'HEAD') {
        const headers = cors(request, new Headers({
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
        }));
        const body = JSON.stringify({
          service: 'firecrawl-webhook-receiver',
          ok: true,
          path: '/fire/hook',
        });
        return new Response(request.method === 'HEAD' ? null : body, { status: 200, headers });
      }
      const raw = await request.arrayBuffer();
      const signing = String(
        env.FIRECRAWL_WEBHOOK_SECRET || env.FIRECRAWL_WEBHOOK_SIGNING_KEY || env.FIRECRAWL_SIGNING_SECRET || '',
      ).trim();
      const auth = await verifyFirecrawlSignature(
        signing,
        raw,
        request.headers.get('x-firecrawl-signature') || '',
      );
      const jsonHeaders = cors(request, new Headers({
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      }));
      if (!auth.ok) {
        return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: jsonHeaders });
      }
      // HMAC passed. Accept on this origin so a wallet-gated or crashing desk
      // cannot turn a valid Firecrawl delivery into 401 unauthorized.
      const destHook = new URL('/api/fire/hook' + url.search, DESK);
      const hookHeaders = new Headers(request.headers);
      hookHeaders.delete('host');
      hookHeaders.set('x-forwarded-host', url.host);
      hookHeaders.set('x-forwarded-proto', 'https');
      hookHeaders.set('x-x402-host', url.host);
      const hookRes = await fetch(destHook, {
        method: request.method,
        headers: hookHeaders,
        body: raw,
        redirect: 'manual',
      }).catch(() => null);
      if (hookRes && hookRes.ok) {
        const outHook = new Headers(hookRes.headers);
        return new Response(hookRes.body, { status: hookRes.status, headers: outHook });
      }
      return new Response(
        JSON.stringify({
          received: true,
          ok: true,
          path: '/fire/hook',
          service: 'firecrawl-webhook-receiver',
          forwarded: false,
        }),
        { status: 200, headers: jsonHeaders },
      );
    }
    const handler = url.pathname === '/pump/mcp' || url.pathname.startsWith('/pump/mcp/')
      ? pump
      : url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')
        ? x402
        : null;
    if (handler) {
      const response = await handler.fetch(request);
      const headers = cors(request, new Headers(response.headers));
      return new Response(response.body, { status: response.status, headers });
    }
    const dest = new URL(url.pathname + url.search, DESK);
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.set('x-forwarded-host', url.host);
    headers.set('x-forwarded-proto', 'https');
    headers.set('x-x402-host', url.host);
    const init = {
      method: request.method,
      headers,
      redirect: 'manual',
    };
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
      init.body = request.body;
      init.duplex = 'half';
    }
    const response = await fetch(dest, init);
    const out = new Headers(response.headers);
    const location = out.get('location');
    if (location) {
      out.set('location', location.replace('https://solgpt-trading-desk.vercel.app', url.origin));
    }
    return new Response(response.body, { status: response.status, headers: out });
  },
};
