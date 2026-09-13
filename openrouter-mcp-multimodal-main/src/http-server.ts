import { createHash, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './server.js';

export interface HttpOptions {
  apiKey: string;
  token: string;
  defaultModel: string;
  allowedOrigins?: string[];
}

export function createHttpServer(options: HttpOptions) {
  if (!options.apiKey.trim()) throw new Error('OPENROUTER_API_KEY is required');
  if (options.token.length < 32) throw new Error('MCP_AUTH_TOKEN must have at least 32 characters');
  const expected = createHash('sha256').update(`Bearer ${options.token}`).digest();
  const origins = new Set(options.allowedOrigins ?? []);
  const active = new Set<ReturnType<typeof createMcpServer>>();

  function reply(res: ServerResponse, status: number, message: string) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ error: message }));
  }

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const path = req.url?.split('?')[0];
    if (path === '/healthz' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (path !== '/mcp') return reply(res, 404, 'Not found');
    const origin = req.headers.origin;
    if (origin && !origins.has(origin)) return reply(res, 403, 'Origin not allowed');
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type, MCP-Protocol-Version',
      );
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }
    const supplied = createHash('sha256')
      .update(req.headers.authorization ?? '')
      .digest();
    if (!timingSafeEqual(expected, supplied)) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="openrouter-mcp"');
      return reply(res, 401, 'Unauthorized');
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST, OPTIONS');
      return reply(res, 405, 'Use Streamable HTTP POST');
    }
    if (active.size >= 32) return reply(res, 503, 'Too many active requests');
    const server = createMcpServer(options.apiKey, options.defaultModel);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    active.add(server);
    res.once('close', () => {
      active.delete(server);
      void server.close().catch(() => {});
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch {
      // Never echo SDK errors: they may contain upstream request details.
      if (!res.headersSent) reply(res, 500, 'MCP request failed');
      else res.end();
      active.delete(server);
      await server.close().catch(() => {});
    }
  }

  const http = createServer((req, res) => {
    void handle(req, res).catch(() => {
      if (!res.headersSent) reply(res, 500, 'Internal error');
      else res.end();
    });
  });
  http.requestTimeout = 120_000;
  http.headersTimeout = 30_000;
  return { http, closeMcp: () => Promise.allSettled([...active].map((s) => s.close())) };
}
