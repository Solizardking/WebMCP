import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchSolgpt, DESK_ORIGIN } from '../deploy/x402-life-worker/solgpt-routes.js';

const origin = 'https://solgpt.trade';
test('human hub, HEAD, wrong methods and trailing slash preserve endpoint semantics', async () => {
  const hub = await fetchSolgpt(new Request(`${origin}/mc/`));
  assert.equal(hub.status, 200);
  assert.match(hub.headers.get('content-type'), /text\/html/);
  const html = await hub.text();
  assert.match(html, /https:\/\/solgpt\.trade\/plugin\/mcp/);
  assert.match(html, /codex mcp add solgpt --url https:\/\/solgpt\.trade\/mcp/);
  assert.match(html, /get-fee-tier/);
  assert.equal(await (await fetchSolgpt(new Request(`${origin}/mc`, { method: 'HEAD' }))).text(), '');
  const post = await fetchSolgpt(new Request(`${origin}/mc`, { method: 'POST', body: '{}' }));
  assert.equal(post.status, 405);
  assert.match(post.headers.get('allow'), /GET/);
  const neighbor = await fetchSolgpt(new Request(`${origin}/mcp-other`), async request => {
    assert.equal(request.url, `${origin}/mcp-other`);
    return new Response('Existing application response');
  });
  assert.equal(await neighbor.text(), 'Existing application response');
});

test('MCP proxy preserves protocol and auth while discarding unrelated cookies and spoofed identity', async () => {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
  const request = new Request(`${origin}/mcp?mode=read`, { method: 'POST', body, headers: {
    'content-type': 'application/json', accept: 'application/json, text/event-stream',
    authorization: 'Bearer fixture-session', 'mcp-session-id': 'fixture-id',
    'mcp-protocol-version': '2025-03-26', origin: 'https://client.fixture.invalid',
    cookie: 'unrelated-site-session=fixture', 'x-forwarded-host': 'attacker.invalid',
    'x-wallet-address': 'attacker-wallet',
  } });
  const response = await fetchSolgpt(request, async (url, init) => {
    assert.equal(url, `${DESK_ORIGIN}/mcp?mode=read`);
    assert.equal(init.redirect, 'manual');
    assert.equal(init.headers.get('authorization'), 'Bearer fixture-session');
    assert.equal(init.headers.get('mcp-session-id'), 'fixture-id');
    for (const key of ['cookie', 'x-forwarded-host', 'x-wallet-address']) assert.equal(init.headers.has(key), false);
    assert.equal(await new Response(init.body).text(), body);
    return Response.json({ jsonrpc: '2.0', id: 1, result: { tools: [] } }, {
      headers: { 'mcp-session-id': 'reply-id', 'cache-control': 'public, max-age=86400' },
    });
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('mcp-session-id'), 'reply-id');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://client.fixture.invalid');
  assert.deepEqual((await response.json()).result.tools, []);
});

test('preflight exposes MCP headers; rejected and failed upstream requests remain visible', async () => {
  const options = await fetchSolgpt(new Request(`${origin}/plugin/mcp`, { method: 'OPTIONS' }));
  assert.equal(options.status, 204);
  assert.match(options.headers.get('access-control-expose-headers'), /Mcp-Session-Id/);
  const denied = await fetchSolgpt(new Request(`${origin}/mcp`), async () => new Response('unauthorized', {
    status: 401, headers: { 'www-authenticate': 'Bearer realm="fixture"' },
  }));
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get('www-authenticate'), 'Bearer realm="fixture"');
  const failed = await fetchSolgpt(new Request(`${origin}/mcp`), async () => { throw new Error('private upstream detail'); });
  assert.equal(failed.status, 502);
  assert.equal(failed.headers.get('retry-after'), '5');
  assert.deepEqual(await failed.json(), { error: 'mcp_upstream_unavailable' });
});

test('public plugin is served directly with the complete exact tool catalog', async () => {
  const response = await fetchSolgpt(new Request(`${origin}/plugin/mcp`, {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
  }), async () => { throw new Error('The reference catalog must not proxy to a provider'); });
  assert.equal(response.status, 200);
  const text = await response.text();
  const json = JSON.parse(text.startsWith('event:') ? text.split('\n').find(line => line.startsWith('data: ')).slice(6) : text);
  assert.deepEqual(json.result.tools.map(tool => tool.name).sort(), ['get-fee-tier', 'get-skill', 'list-skills']);
});
