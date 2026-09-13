#!/usr/bin/env node
/**
 * Mock-backed E2E: drive the built MCP server with a short-circuited
 * OpenRouter API client so we verify the full generate_video → poll →
 * download → save pipeline without burning real credits.
 *
 * Strategy: spawn the server with a local HTTP proxy that intercepts calls
 * to openrouter.ai and serves canned responses. The server's
 * OpenRouterAPIClient points at BASE_URL which is hardcoded; so this
 * mock would require an env override we don't have. Instead we invoke the
 * handler directly via dist/tool-handlers/generate-video.js and mock the
 * OpenRouterAPIClient class directly — which is a unit-test-level check
 * but runs against the SAME COMPILED CODE the MCP server uses at runtime.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

const { handleGenerateVideo } = await import('../dist/tool-handlers/generate-video.js');

const sandbox = await fs.mkdtemp(path.join(tmpdir(), 'mcp-mock-'));
process.env.OPENROUTER_OUTPUT_DIR = sandbox;

const fakeMp4 = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x20]),
  Buffer.from('ftypisom', 'ascii'),
  Buffer.alloc(256), // pretend payload
]);

let pollCount = 0;
const apiClient = {
  async submitVideoJob(body) {
    console.log('[submit]', JSON.stringify(body).slice(0, 120));
    return {
      id: 'vid_mock_1',
      status: 'pending',
      polling_url: 'https://openrouter.ai/api/v1/videos/vid_mock_1',
    };
  },
  async pollVideoJob(id) {
    pollCount += 1;
    console.log(`[poll #${pollCount}] id=${id}`);
    if (pollCount < 3) return { id, status: 'processing', progress: pollCount / 3 };
    return {
      id,
      status: 'completed',
      unsigned_urls: ['https://openrouter.ai/api/v1/videos/vid_mock_1/content?index=0'],
      usage: { duration_s: 4, resolution: '720p' },
    };
  },
  async downloadVideoContent(id, index, maxBytes) {
    console.log(`[download] id=${id} idx=${index} cap=${maxBytes}`);
    return { buffer: fakeMp4, contentType: 'video/mp4' };
  },
};

const progress = vi => (u) => console.log('[progress]', JSON.stringify(u));

const result = await handleGenerateVideo(
  {
    params: {
      arguments: {
        prompt: 'mock run',
        save_path: 'out/mock-video.mp4',
        poll_interval_ms: 100,
        max_wait_ms: 5000,
      },
    },
  },
  apiClient,
  (u) => console.log('[progress]', JSON.stringify(u)),
);

console.log('\nResult:');
console.log('  isError:', !!result.isError);
console.log('  _meta:', JSON.stringify(result._meta));
console.log('  content types:', result.content?.map((c) => c.type));

if (result._meta?.save_path) {
  const stat = await fs.stat(result._meta.save_path);
  console.log('  saved file size:', stat.size, 'bytes');
  console.log('  saved path within sandbox:', result._meta.save_path.startsWith(await fs.realpath(sandbox)));
}

await fs.rm(sandbox, { recursive: true, force: true });
