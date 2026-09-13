import { config } from 'dotenv';
import { createHttpServer } from './http-server.js';

config({ quiet: true });
const port = Number(process.env.PORT || 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const { http, closeMcp } = createHttpServer({
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
  token: process.env.MCP_AUTH_TOKEN ?? '',
  defaultModel:
    process.env.OPENROUTER_DEFAULT_MODEL ||
    process.env.DEFAULT_MODEL ||
    'google/gemma-4-26b-a4b-it:free',
  allowedOrigins: (process.env.MCP_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
});
http.listen(port, process.env.HOST || '0.0.0.0', () => {
  console.error(`OpenRouter MCP HTTP listening on port ${port} at /mcp`);
});
http.on('error', () => {
  console.error('HTTP listener failed');
  process.exit(1);
});
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  http.close(() => process.exit(0));
  void closeMcp();
  setTimeout(() => process.exit(0), 10_000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
