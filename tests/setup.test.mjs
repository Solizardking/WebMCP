import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSolGPTMcpHandler, createX402McpHandler } from '../dist/mcp/index.js';
import { registerWebMCPTools } from '../dist/webmcp/index.js';
import { adapters } from '../examples/node/adapters.mjs';

const webmcpRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

async function rpc(handler, method, params = {}) {
  const response = await handler.fetch(new Request('http://localhost/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-11-25' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  }));
  assert.equal(response.status, 200);
  const text = await response.text();
  return JSON.parse(text.startsWith('event:') || text.startsWith('data:') ? text.split('\n').find(line => line.startsWith('data:')).slice(5) : text);
}

test('MCP initializes, discovers tools, executes and validates decimal swap amounts', async () => {
  let calls = 0;
  const handler = createSolGPTMcpHandler({ ...adapters, getSwapQuote: async input => { calls++; return { ...input, quoteId: 'fixture' }; } });
  const init = await rpc(handler, 'initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  assert.equal(init.result.serverInfo.name, 'solgpt-solana-agent');
  const list = await rpc(handler, 'tools/list');
  const names = list.result.tools.map((tool) => tool.name);
  for (const name of [
    'solana_get_wallet_context',
    'solana_resolve_token',
    'solana_get_swap_quote',
    'solgpt_ask',
    'stonk_market',
    'stonk_token',
    'stonk_launch_status',
    'factory_catalog',
    'factory_whoami',
  ]) {
    assert.ok(names.includes(name), name);
  }
  assert.ok(!names.some((name) => /stonk.*submit|buy-token|create-token/.test(name)));
  const wallet = await rpc(handler, 'tools/call', { name: 'solana_get_wallet_context', arguments: {} });
  assert.equal(wallet.result.structuredContent.connected, false);
  const args = { inputMint: 'A'.repeat(32), outputMint: 'B'.repeat(32), amount: '1.25', swapMode: 'ExactIn', slippageBps: 50 };
  const quote = await rpc(handler, 'tools/call', { name: 'solana_get_swap_quote', arguments: args });
  assert.equal(quote.result.structuredContent.quoteId, 'fixture');
  await rpc(handler, 'tools/call', { name: 'solana_get_swap_quote', arguments: { ...args, amount: 'bad' } });
  assert.equal(calls, 1);
});

test('x402 exposes tools and unconfigured payment fails instead of claiming staging', async () => {
  const handler = createX402McpHandler(adapters);
  const list = await rpc(handler, 'tools/list');
  const names = list.result.tools.map((tool) => tool.name);
  assert.equal(list.result.tools.length, 2);
  assert.ok(names.includes('x402_get_payment_quote'));
  assert.ok(names.includes('x402_stage_payment'));
  const result = await rpc(handler, 'tools/call', { name: 'x402_stage_payment', arguments: { quoteId: 'missing' } });
  assert.equal(result.result.isError, true);
});

test('WebMCP packs expose the production tool names', async () => {
  const {
    createSolanaWebMCPTools,
    createSolGPTWebMCPTools,
    createClawdComputeWebMCPTools,
    createX402WebMCPTools,
    createPumpWebMCPTools,
    registerWebMCPTools,
  } = await import('../dist/webmcp/index.js');
  const names = [];
  const pageAdapters = {
    ...adapters,
    stageSwap: async () => ({ staged: true, ticketId: 't', requiresUserSignature: true, summary: 'staged' }),
    stagePayment: async () => ({ staged: true, ticketId: 'p', requiresUserSignature: true, summary: 'staged' }),
  };
  const tools = [
    ...createSolanaWebMCPTools(pageAdapters),
    ...createSolGPTWebMCPTools(pageAdapters),
    ...createClawdComputeWebMCPTools(pageAdapters),
    ...createX402WebMCPTools(pageAdapters),
    ...createPumpWebMCPTools(),
  ];
  globalThis.document = {
    modelContext: {
      registerTool: async (tool) => { names.push(tool.name); },
    },
  };
  try {
    await registerWebMCPTools(tools);
    for (const name of [
      'solana.get_wallet_context',
      'solana.resolve_token',
      'solana.get_swap_quote',
      'solana.stage_swap',
      'solgpt.ask',
      'clawd.get_models',
      'clawd.run_inference',
      'x402.get_payment_quote',
      'x402.stage_payment',
      'pump.get_relay_health',
      'pump.list_launches',
    ]) {
      assert.ok(names.includes(name), name);
    }
  } finally {
    delete globalThis.document;
  }
});

test('browser cleanup works with external signals and registration failures', async () => {
  const signals = [];
  globalThis.document = { modelContext: { registerTool: async (_, options) => { signals.push(options.signal); } } };
  try {
    const external = new AbortController();
    const dispose = await registerWebMCPTools([{ name: 'test' }], { signal: external.signal });
    dispose();
    assert.equal(signals[0].aborted, true);
    await registerWebMCPTools([{ name: 'test' }], { signal: external.signal });
    external.abort();
    assert.equal(signals[1].aborted, true);
    document.modelContext.registerTool = async (_, options) => { signals.push(options.signal); throw new Error('failure'); };
    await assert.rejects(registerWebMCPTools([{ name: 'test' }]));
    assert.equal(signals[2].aborted, true);
  } finally { delete globalThis.document; }
});

test('OpenAI uses Responses with only the read-only Pump tools and keeps auth server-side', async () => {
  const { askOpenAI, PUMP_READ_TOOLS } = await import('../dist/openai/index.js');
  let body;
  const result = await askOpenAI({ apiKey: 'test-openai', prompt: 'fees', pump: { authorization: 'test-pump' }, fetch: async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(init.headers.Authorization, 'Bearer test-openai');
    body = JSON.parse(init.body);
    return Response.json({ id: 'test', status: 'completed', output: [{ type: 'mcp_call', name: 'get-fee-tier' }, { type: 'message', content: [{ type: 'output_text', text: 'Reference fees' }] }] });
  } });
  assert.deepEqual(body.tools[0].allowed_tools, [...PUMP_READ_TOOLS]);
  assert.equal(body.tools[0].authorization, 'test-pump');
  assert.equal(body.store, false);
  assert.equal(result.answer, 'Reference fees');
  assert.ok(!JSON.stringify(result).includes('test-pump'));
});

test('OpenAI quota and MCP failures are surfaced', async () => {
  const { askOpenAI } = await import('../dist/openai/index.js');
  await assert.rejects(askOpenAI({ apiKey: 'test', prompt: 'fees', fetch: async () => new Response('', { status: 429 }) }), /HTTP 429/);
  await assert.rejects(askOpenAI({ apiKey: 'test', prompt: 'fees', fetch: async () => Response.json({ status: 'completed', output: [{ type: 'mcp_call', error: 'failed' }] }) }), /tool execution failed/);
});

test('@x402solana/webmcp is public and npm pack includes dist exports', () => {
  const pkg = JSON.parse(readFileSync(join(webmcpRoot, 'package.json'), 'utf8'));
  assert.notEqual(pkg.private, true);
  assert.equal(pkg.name, '@x402solana/webmcp');
  assert.ok(pkg.exports['.']);
  assert.ok(pkg.exports['/webmcp'] || pkg.exports['./webmcp']);
  assert.ok(pkg.exports['./mcp']);
  assert.ok(pkg.exports['./openai']);
  const packed = spawnSync('npm', ['pack', '--dry-run'], {
    cwd: webmcpRoot,
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.equal(packed.status, 0, packed.stderr || packed.stdout);
  const listing = packed.stdout + packed.stderr;
  assert.match(listing, /dist\/index\.js/);
  assert.match(listing, /dist\/mcp\/index\.js/);
  assert.match(listing, /dist\/webmcp\/index\.js/);
  assert.match(listing, /dist\/openai\/index\.js/);
  assert.doesNotMatch(listing, /node_modules/);
});
