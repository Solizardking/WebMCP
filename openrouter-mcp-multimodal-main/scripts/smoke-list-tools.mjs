#!/usr/bin/env node
/**
 * Smoke test: spawn the MCP server, send a ListTools request over stdio,
 * print the tool names + annotations. Exits non-zero if the server doesn't
 * respond within a 5-second budget.
 */
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const proc = spawn('node', ['dist/index.js'], {
  env: { ...process.env, OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ?? 'sk-or-v1-smoke' },
  stdio: ['pipe', 'pipe', 'pipe'],
});

let buf = '';
let done = false;

proc.stdout.on('data', (chunk) => {
  buf += chunk.toString('utf8');
  const lines = buf.split('\n');
  buf = lines.pop() ?? '';
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id === 2) {
        done = true;
        const tools = msg.result?.tools ?? [];
        console.log(`Listed ${tools.length} tools:`);
        for (const t of tools) {
          const a = t.annotations ?? {};
          const hints = `ro=${a.readOnlyHint ?? '-'} dest=${a.destructiveHint ?? '-'} idem=${a.idempotentHint ?? '-'}`;
          console.log(`  - ${t.name.padEnd(18)}  [${hints}]`);
        }
        proc.kill('SIGINT');
      }
    } catch {
      // ignore non-JSON
    }
  }
});

proc.stderr.on('data', (chunk) => {
  // Log server stderr verbatim so errors surface in CI output.
  process.stderr.write(chunk);
});

// Send initialize then tools/list.
proc.stdin.write(
  JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'smoke', version: '1.0' },
    },
  }) + '\n',
);
await delay(100);
proc.stdin.write(
  JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }) + '\n',
);

const start = Date.now();
while (!done && Date.now() - start < 5000) {
  await delay(50);
}

proc.kill('SIGINT');
await delay(100);

if (!done) {
  console.error('Smoke test FAILED — no tools/list response within 5 seconds.');
  process.exit(1);
}

console.log('\nSmoke test OK.');
