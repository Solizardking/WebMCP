import test from 'node:test';
import assert from 'node:assert/strict';
import { createClawdPluginMcpHandler } from '../dist/mcp/index.js';
import { createPumpMcpTool, DEFAULT_PUMP_MCP_URL, PUMP_READ_TOOLS, PUBLIC_CLAWD_REFERENCE_TOOLS } from '../dist/openai/index.js';
import { readMcpResponse } from '../scripts/mcp-response.mjs';

test('OpenAI default allowlist matches the actual public Clawd reference catalog', async () => {
  const response = await createClawdPluginMcpHandler().fetch(new Request('https://solgpt.trade/plugin/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
  }));
  assert.equal(response.status, 200);
  const catalog = await readMcpResponse(response, 1);
  const tool = createPumpMcpTool();
  assert.equal(DEFAULT_PUMP_MCP_URL, 'https://solgpt.trade/plugin/mcp');
  assert.equal(tool.server_url, DEFAULT_PUMP_MCP_URL);
  assert.deepEqual(tool.allowed_tools.toSorted(), catalog.result.tools.map(item => item.name).toSorted());
  assert.deepEqual(tool.allowed_tools, ['get-fee-tier', 'list-skills', 'get-skill']);
  assert.equal('authorization' in tool, false);
  assert.match(tool.server_description, /reference library/);
  assert.doesNotMatch(tool.server_description, /token information/);
  assert.equal(tool.require_approval, 'never');
});

test('OpenAI explicit public URLs still select the three-tool reference catalog', () => {
  for (const url of [DEFAULT_PUMP_MCP_URL, `${DEFAULT_PUMP_MCP_URL}/`, `${DEFAULT_PUMP_MCP_URL}?client=fixture`]) {
    const tool = createPumpMcpTool({ url });
    assert.deepEqual(tool.allowed_tools, [...PUBLIC_CLAWD_REFERENCE_TOOLS]);
    assert.equal(tool.server_url, url);
  }
});

test('OpenAI explicit private URL and authorization retain the legacy read catalog', () => {
  const tool = createPumpMcpTool({ url: 'https://private.example.test/mcp', authorization: 'fixture-private-token' });
  assert.equal(tool.server_url, 'https://private.example.test/mcp');
  assert.equal(tool.authorization, 'fixture-private-token');
  assert.deepEqual(tool.allowed_tools, [...PUMP_READ_TOOLS]);
  assert.deepEqual(tool.allowed_tools, ['get-token-info', 'get-fee-tier', 'list-skills', 'get-skill']);
  assert.match(tool.server_description, /token information/);
  assert.equal(tool.require_approval, 'never');
});

test('OpenAI custom MCP endpoints still require HTTPS without embedded credentials', () => {
  for (const url of ['http://private.example.test/mcp', 'https://fixture:fixture@private.example.test/mcp']) {
    assert.throws(() => createPumpMcpTool({ url }), /HTTPS URL without embedded credentials/);
  }
});
