import assert from 'node:assert/strict';
import { readMcpResponse } from './mcp-response.mjs';
const endpoint = process.env.CLAWD_PLUGIN_URL || 'https://solgpt.trade/plugin/mcp';
let session;
let id = 0;
async function rpc(method, params = {}) {
  const requestId = ++id;
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(session ? { 'mcp-session-id': session } : {}) },
    body: JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params }), signal: AbortSignal.timeout(30_000),
  });
  assert.equal(response.status, 200);
  session = response.headers.get('mcp-session-id') || session;
  return readMcpResponse(response, requestId);
}
try {
  const init = await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'clawd-release-smoke', version: '0.1.0' } });
  assert.equal(init.result.serverInfo.name, 'clawd');
  const initialized = await fetch(endpoint, {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(session ? { 'mcp-session-id': session } : {}) },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }), signal: AbortSignal.timeout(30_000),
  });
  assert.equal(initialized.status, 202);
  const list = await rpc('tools/list');
  assert.deepEqual(list.result.tools.map(t => t.name).sort(), ['get-fee-tier', 'get-skill', 'list-skills']);
  assert.ok(list.result.tools.every(t => t.annotations.readOnlyHint === true && t.annotations.destructiveHint === false && t.annotations.openWorldHint === false));
  for (const [name, args] of [['get-fee-tier', {}], ['list-skills', {}], ['get-skill', { id: 'pumpfun' }]]) {
    const result = await rpc('tools/call', { name, arguments: args });
    assert.ok(!result.error && !result.result.isError);
    assert.ok(result.result.content[0].text.length > 20);
  }
  const unknown = await rpc('tools/call', { name: 'buy-token', arguments: {} });
  assert.ok(unknown.error || unknown.result?.isError);
  const traversal = await rpc('tools/call', { name: 'get-skill', arguments: { id: '../../.env' } });
  assert.ok(traversal.error || traversal.result?.isError);
  const missing = await rpc('tools/call', { name: 'get-skill', arguments: { id: 'clawd-nonexistent-review-fixture' } });
  assert.equal(missing.result?.isError, true);
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), ok: true, endpoint, tools: list.result.tools.map(t => t.name), readCalls: 3, rejectedTradingTool: true, rejectedTraversal: true, rejectedUnknownGuide: true, annotationsVerified: true }, null, 2));
} finally {
  if (session) await fetch(endpoint, { method: 'DELETE', headers: { 'mcp-session-id': session }, signal: AbortSignal.timeout(10_000) });
}
