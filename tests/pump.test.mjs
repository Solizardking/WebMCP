import test from 'node:test';
import assert from 'node:assert/strict';
import { createPumpMcpHandler } from '../dist/mcp/index.js';
import {
  CLAWD_WS_HTTP_DEFAULT,
  CLAWD_WS_WS_DEFAULT,
  PUMP_WIDGET_URI,
  collectPumpLaunches,
  fetchPumpRelayHealth,
  parsePumpLaunchFrame,
} from '../dist/shared/pump.js';
import { PUMPFUN_MCP_SERVER_NAME, PUMPFUN_MCP_TOOLS } from '../dist/mcp/buildPumpServer.js';
import { pumpFunWidgetHtml } from '../dist/mcp/pumpWidget.js';
import { createPumpFunMcpTool, PUMPFUN_LIVE_TOOLS } from '../dist/openai/index.js';
import { createPumpWebMCPTools } from '../dist/webmcp/index.js';

const MINT = '7nYxQ2pumpLaunchMintOutsideKnownTable11111111';
const launch = {
  type: 'token-launch',
  signature: 'sig1',
  time: '2026-09-10T00:00:00.000Z',
  name: 'Tape Token',
  symbol: 'TAPE',
  mint: MINT,
  creator: 'Creator11111111111111111111111111111111111',
  marketCapSol: 12.4,
};

async function rpc(handler, method, params = {}, id = 1) {
  const response = await handler.fetch(new Request('http://localhost/pump/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-11-25' },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  }));
  assert.equal(response.status, 200);
  const text = await response.text();
  return JSON.parse(text.startsWith('event:') || text.startsWith('data:') ? text.split('\n').find(line => line.startsWith('data:')).slice(5) : text);
}

class FakeWebSocket {
  constructor(url) {
    this.url = url;
    queueMicrotask(() => {
      this.onopen?.({});
      this.onmessage?.({ data: JSON.stringify(launch) });
    });
  }
  close() {}
}

test('parsePumpLaunchFrame only accepts token-launch frames with a mint', () => {
  const parsed = parsePumpLaunchFrame(JSON.stringify(launch));
  assert.equal(parsed.mint, MINT);
  assert.equal(parsed.symbol, 'TAPE');
  assert.equal(parsed.pumpfunUrl, `https://pump.fun/coin/${MINT}`);
  assert.equal(parsePumpLaunchFrame(JSON.stringify({ type: 'status', connected: true })), null);
  assert.equal(parsePumpLaunchFrame('{'), null);
});

test('fetchPumpRelayHealth calls https://clawd-ws.fly.dev/health', async () => {
  let requested;
  const health = await fetchPumpRelayHealth({
    fetchImpl: async (url) => {
      requested = String(url);
      return Response.json({ status: 'ok', solana: true, clients: 4, totalLaunches: 11 });
    },
  });
  assert.equal(requested, 'https://clawd-ws.fly.dev/health');
  assert.equal(health.status, 'ok');
  assert.equal(health.http, CLAWD_WS_HTTP_DEFAULT);
  assert.equal(health.ws, CLAWD_WS_WS_DEFAULT);
  assert.equal(health.mcp, 'https://x402.life/pump/mcp');
  assert.equal(health.agency, 'x402 agency');
  assert.equal(health.totalLaunches, 11);
});

test('collectPumpLaunches parses live frames through the shipped WebSocket path', async () => {
  const launches = await collectPumpLaunches({ limit: 1, timeoutMs: 1000, WebSocketImpl: FakeWebSocket });
  assert.equal(launches.length, 1);
  assert.equal(launches[0].mint, MINT);
  assert.equal(launches[0].symbol, 'TAPE');
});

test('Pump.fun MCP lists live tools, serves the widget, and executes health/list/render', async () => {
  const client = {
    fetchHealth: async () => ({ status: 'ok', solana: true, clients: 2, totalLaunches: 8, http: CLAWD_WS_HTTP_DEFAULT, ws: CLAWD_WS_WS_DEFAULT }),
    listLaunches: async () => [parsePumpLaunchFrame(launch)],
  };
  const handler = createPumpMcpHandler(client);
  const init = await rpc(handler, 'initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  assert.equal(init.result.serverInfo.name, PUMPFUN_MCP_SERVER_NAME);
  const list = await rpc(handler, 'tools/list');
  const names = list.result.tools.map((tool) => tool.name);
  assert.deepEqual(names, [...PUMPFUN_MCP_TOOLS]);
  assert.ok(list.result.tools.every((tool) => tool.annotations.readOnlyHint === true && tool.annotations.destructiveHint === false));
  const renderTool = list.result.tools.find((tool) => tool.name === 'render_pump_widget');
  assert.equal(renderTool._meta.ui.resourceUri, PUMP_WIDGET_URI);
  assert.equal(renderTool._meta['openai/outputTemplate'], PUMP_WIDGET_URI);

  const health = await rpc(handler, 'tools/call', { name: 'pump_get_relay_health', arguments: {} });
  assert.equal(health.result.structuredContent.status, 'ok');
  assert.equal(health.result.structuredContent.http, 'https://clawd-ws.fly.dev');

  const listed = await rpc(handler, 'tools/call', { name: 'pump_list_launches', arguments: { limit: 1 } });
  assert.equal(listed.result.structuredContent.launches[0].mint, MINT);
  assert.equal(listed.result.structuredContent.source, CLAWD_WS_WS_DEFAULT);

  const rendered = await rpc(handler, 'tools/call', {
    name: 'render_pump_widget',
    arguments: { launches: listed.result.structuredContent.launches },
  });
  assert.equal(rendered.result.structuredContent.launches[0].symbol, 'TAPE');

  const resources = await rpc(handler, 'resources/list');
  assert.ok(resources.result.resources.some((row) => row.uri === PUMP_WIDGET_URI));
  const widget = await rpc(handler, 'resources/read', { uri: PUMP_WIDGET_URI });
  const html = widget.result.contents[0].text;
  assert.match(html, /clawd-ws\.fly\.dev/);
  assert.match(html, /ui\/initialize/);
  assert.equal(html.includes(pumpFunWidgetHtml().slice(0, 40)), true);

  const unknown = await rpc(handler, 'tools/call', { name: 'buy-token', arguments: {} });
  assert.ok(unknown.error || unknown.result?.isError);
});

test('OpenAI Pump.fun connector and page WebMCP names stay on the live tools', () => {
  const tool = createPumpFunMcpTool();
  assert.equal(tool.server_url, 'https://x402.life/pump/mcp');
  assert.deepEqual(tool.allowed_tools, [...PUMPFUN_LIVE_TOOLS]);
  assert.match(tool.server_description, /x402\.life/);
  const names = createPumpWebMCPTools().map((row) => row.name);
  assert.deepEqual(names, ['pump.get_relay_health', 'pump.list_launches']);
});
