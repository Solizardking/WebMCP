import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { createPumpMcpHandler, createSolGPTMcpHandler, createX402McpHandler } from '../../dist/mcp/index.js';
import { adapters } from './adapters.mjs';

const handlers = {
  '/mcp': createSolGPTMcpHandler(adapters),
  '/x402/mcp': createX402McpHandler(adapters),
  '/pump/mcp': createPumpMcpHandler(),
};
const port = Number(process.env.PORT || 3333);
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, mode: 'demo' }));
      return;
    }
    const handler = handlers[url.pathname];
    if (!handler) { res.writeHead(404); res.end(); return; }
    // Local demo is not a cross-origin browser API.
    if (req.headers.origin && req.headers.origin !== url.origin) {
      res.writeHead(403); res.end(); return;
    }
    const init = { method: req.method, headers: req.headers };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = Readable.toWeb(req);
      init.duplex = 'half';
    }
    const response = await handler.fetch(new Request(url, init));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body).pipe(res);
    else res.end();
  } catch {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Demo MCP: http://127.0.0.1:${port}/mcp (no live adapters)`));
