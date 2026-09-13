#!/usr/bin/env node
import { Readable } from 'node:stream';
import { config } from 'dotenv';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { logger } from './logger.js';
import { createMcpServer } from './server.js';

config({ quiet: true }); // stdio transport owns stdout

const DEFAULT_MODEL = 'google/gemma-4-26b-a4b-it:free';

// Log whitelisted fields only — avoid leaking auth headers from SDK errors.
function logFatal(kind: string, err: unknown): void {
  const e = err as { message?: string; name?: string; stack?: string } | null;
  logger.error('fatal', {
    kind,
    name: e?.name ?? 'unknown',
    msg: e?.message ?? String(err),
    stack: e?.stack?.split('\n').slice(0, 10).join('\n'),
  });
}
process.on('uncaughtException', (err) => {
  logFatal('uncaughtException', err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  logFatal('unhandledRejection', err);
  process.exit(1);
});

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error('OPENROUTER_API_KEY is required');
  process.exit(1);
}

const defaultModel =
  process.env.OPENROUTER_DEFAULT_MODEL || process.env.DEFAULT_MODEL || DEFAULT_MODEL;

const server = createMcpServer(apiKey, defaultModel);
server.onerror = (error) => logFatal('mcpError', error);

async function shutdown(): Promise<void> {
  await server.close();
  process.exit(0);
}
process.on('SIGINT', () => {
  void shutdown();
});
process.on('SIGTERM', () => {
  void shutdown();
});

// Stdin may arrive as strings on some MCP hosts; re-wrap as raw Buffers for the SDK.
const stdinStream = process.stdin as NodeJS.ReadStream & {
  setEncoding?(encoding?: BufferEncoding | null): NodeJS.ReadStream;
};
stdinStream.setEncoding?.(undefined as unknown as BufferEncoding);

const safeStdin = new Readable({
  read() {},
});
process.stdin.on('data', (chunk: Buffer | string) => {
  safeStdin.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk);
});
process.stdin.on('end', () => safeStdin.push(null));
process.stdin.on('error', (err) => safeStdin.destroy(err));

const transport = new StdioServerTransport(safeStdin, process.stdout);
server
  .connect(transport)
  .then(() => {
    console.error(`OpenRouter MCP server running (model: ${defaultModel})`);
  })
  .catch((err) => {
    console.error('[Fatal] Server failed to start:', err);
    process.exit(1);
  });
