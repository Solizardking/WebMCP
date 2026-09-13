import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readMcpResponse } from '../scripts/mcp-response.mjs';

test('plugin smoke accepts JSON replies', async () => {
  const reply = { jsonrpc: '2.0', id: 3, result: { ok: true } };
  assert.deepEqual(await readMcpResponse(Response.json(reply), 3), reply);
});

test('plugin smoke accepts fragmented SSE, skips notifications, and cancels after its reply', async () => {
  let cancelled = false;
  const reply = { jsonrpc: '2.0', id: 3, result: { content: [{ type: 'text', text: 'Clawd guide' }] } };
  const text = ': ping\r\n\r\ndata: {"jsonrpc":"2.0","method":"notifications/message"}\r\n\r\n'
    + `event: message\r\ndata: ${JSON.stringify(reply)}\r\n\r\n`;
  const encoder = new TextEncoder();
  let cursor = 0;
  const response = new Response(new ReadableStream({
    pull(controller) {
      if (cursor < text.length) { controller.enqueue(encoder.encode(text.slice(cursor, cursor + 7))); cursor += 7; }
      // Leave the stream open: a reply must not wait for the SSE connection to close.
    },
    cancel() { cancelled = true; },
  }), { headers: { 'content-type': 'text/event-stream; charset=utf-8' } });
  assert.deepEqual(await readMcpResponse(response, 3), reply);
  assert.equal(cancelled, true);
});

test('plugin smoke rejects HTML and a stream without the requested reply', async () => {
  await assert.rejects(readMcpResponse(new Response('<html>hub</html>', { headers: { 'content-type': 'text/html' } }), 1), /Unsupported MCP/);
  await assert.rejects(readMcpResponse(new Response('data: {"jsonrpc":"2.0","id":2,"result":{}}\n\n', {
    headers: { 'content-type': 'text/event-stream' },
  }), 1), /without reply 1/);
});
