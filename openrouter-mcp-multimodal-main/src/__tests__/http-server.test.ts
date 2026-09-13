import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createHttpServer } from '../http-server.js';

describe('authenticated HTTP MCP endpoint', () => {
  const token = 'local-test-token-'.repeat(4);
  const { http, closeMcp } = createHttpServer({
    apiKey: 'test-key',
    token,
    defaultModel: 'test/model',
    allowedOrigins: ['https://client.example'],
  });
  let base: string;
  beforeAll(async () => {
    await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
    const address = http.address();
    if (!address || typeof address === 'string') throw new Error('Missing listen address');
    base = `http://127.0.0.1:${address.port}`;
  });
  afterAll(async () => {
    await closeMcp();
    http.closeAllConnections();
    await new Promise<void>((resolve) => http.close(() => resolve()));
  });

  it('fails closed when required configuration is missing', () => {
    expect(() => createHttpServer({ apiKey: '', token, defaultModel: 'test/model' })).toThrow(
      'OPENROUTER_API_KEY',
    );
    expect(() =>
      createHttpServer({ apiKey: 'test', token: '', defaultModel: 'test/model' }),
    ).toThrow('MCP_AUTH_TOKEN');
  });
  it('exposes only minimal health data without authentication', async () => {
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
  it('rejects missing and incorrect credentials before processing a body', async () => {
    for (const authorization of ['', 'Bearer invalid']) {
      const res = await fetch(`${base}/mcp`, {
        method: 'POST',
        headers: { authorization },
        body: 'invalid-json',
      });
      expect(res.status).toBe(401);
      expect(await res.text()).not.toContain(token);
    }
  });
  it('rejects untrusted browser origins, permits configured preflight', async () => {
    const denied = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, origin: 'https://attacker.example' },
    });
    expect(denied.status).toBe(403);
    const allowed = await fetch(`${base}/mcp`, {
      method: 'OPTIONS',
      headers: { origin: 'https://client.example' },
    });
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('https://client.example');
  });
  it('supports independent MCP clients, initialization, listing and ping', async () => {
    await Promise.all(
      [1, 2].map(async (id) => {
        const client = new Client({ name: `http-test-${id}`, version: '1.0' });
        try {
          await client.connect(
            new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
              requestInit: { headers: { Authorization: `Bearer ${token}` } },
            }),
          );
          expect(client.getServerVersion()?.version).toBe('5.0.1');
          const result = await client.listTools();
          expect(result.tools).toHaveLength(19);
          await client.ping();
        } finally {
          await client.close();
        }
      }),
    );
  });
});
