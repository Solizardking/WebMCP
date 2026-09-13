#!/usr/bin/env node
/**
 * Standalone live test: submit a real video-gen job, poll until completion,
 * save the output. Expensive ($1.60 for 4s 720p no-audio via Veo 3.1), so
 * we only run this on explicit opt-in. NEVER committed to CI.
 *
 * Usage: RUN_PAID=1 node scripts/live-video-gen.mjs
 */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { once } from 'node:events';

if (process.env.RUN_PAID !== '1') {
  console.log('Set RUN_PAID=1 to run the paid video-generation smoke (~$1.60 per run).');
  process.exit(0);
}

const proc = spawn('node', ['dist/index.js'], {
  env: {
    ...process.env,
    OPENROUTER_OUTPUT_DIR: '.mcp-smoke-output',
    OPENROUTER_LOG_LEVEL: 'info',
  },
  stdio: ['pipe', 'pipe', 'pipe'],
});
proc.stderr.on('data', (c) => process.stderr.write(c));

let buf = '';
const pending = new Map();
let nextId = 1;
proc.stdout.on('data', (chunk) => {
  buf += chunk.toString('utf8');
  const lines = buf.split('\n');
  buf = lines.pop() ?? '';
  for (const line of lines) {
    if (!line.trim()) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg);
    }
  }
});

function request(method, params) {
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, { resolve });
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

try {
  await request('initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'paid-smoke', version: '1.0' },
  });

  console.log('→ submitting generate_video …');
  const started = Date.now();
  const resp = await request('tools/call', {
    name: 'generate_video',
    arguments: {
      prompt: 'A single yellow sunflower slowly swaying in a gentle breeze, minimal plain background.',
      model: 'google/veo-3.1',
      resolution: '720p',
      aspect_ratio: '16:9',
      duration: 4,
      save_path: 'sunflower.mp4',
      max_wait_ms: 10 * 60 * 1000,
      poll_interval_ms: 15_000,
    },
  });
  const ms = Date.now() - started;
  const res = resp.result;
  console.log(`← done in ${(ms / 1000).toFixed(1)}s`);
  console.log('isError:', !!res.isError);
  console.log('_meta:', JSON.stringify(res._meta, null, 2));
  const text = res.content?.find((c) => c.type === 'text')?.text;
  if (text) console.log('text:', text);
  const video = res.content?.find((c) => c.type === 'video');
  if (video) console.log('inline video (', video.data.length, 'base64 bytes)');
} finally {
  proc.kill('SIGINT');
  await delay(200);
  try {
    await once(proc, 'exit');
  } catch {
    /* ignore */
  }
}
