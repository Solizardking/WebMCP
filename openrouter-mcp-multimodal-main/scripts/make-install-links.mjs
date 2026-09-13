#!/usr/bin/env node
/**
 * Generate canonical one-click MCP install URLs for Kiro, Cursor, and
 * VS Code. Uses HTTPS redirector endpoints only — custom protocols
 * (cursor://, vscode:) get stripped by GitHub Markdown's link sanitizer
 * so they don't survive when embedded in a README.
 *
 * Sources (accessed 2026-04-20):
 *   Kiro    — https://kiro.dev/docs/mcp/servers  (URL-encoded JSON in `config`)
 *   Cursor  — https://cursor.com/en/install-mcp?name=&config=<base64>
 *             (pattern used by github/github-mcp-server)
 *   VS Code — https://insiders.vscode.dev/redirect/mcp/install?name=&config=<url-enc JSON>
 *             (pattern used by modelcontextprotocol/servers; append
 *             &quality=insiders for VS Code Insiders)
 */

const NAME = 'openrouter';

// Base server config (no name — that goes in the URL).
const CONFIG = {
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@stabgan/openrouter-mcp-multimodal'],
  env: { OPENROUTER_API_KEY: 'sk-or-v1-...' },
};

// Kiro config expects disabled/autoApprove fields, no `type`.
const KIRO_CONFIG = {
  command: CONFIG.command,
  args: CONFIG.args,
  env: CONFIG.env,
  disabled: false,
  autoApprove: [],
};

// --- Kiro (URL-encoded JSON) ---
const kiroUrl = `https://kiro.dev/launch/mcp/add?name=${encodeURIComponent(
  NAME,
)}&config=${encodeURIComponent(JSON.stringify(KIRO_CONFIG))}`;

// --- Cursor (base64-encoded JSON, via cursor.com HTTPS redirector) ---
const cursorB64 = Buffer.from(JSON.stringify(CONFIG), 'utf8').toString('base64');
const cursorUrl = `https://cursor.com/en/install-mcp?name=${encodeURIComponent(
  NAME,
)}&config=${encodeURIComponent(cursorB64)}`;

// --- VS Code (URL-encoded JSON, via insiders.vscode.dev HTTPS redirector) ---
const vscEncoded = encodeURIComponent(JSON.stringify(CONFIG));
const vscodeUrl = `https://insiders.vscode.dev/redirect/mcp/install?name=${encodeURIComponent(
  NAME,
)}&config=${vscEncoded}`;
const vscodeInsidersUrl = `${vscodeUrl}&quality=insiders`;

// Cursor publishes a badge image on cursor.com:
const cursorBadge = 'https://cursor.com/deeplink/mcp-install-dark.svg';

console.log('=== Install URLs ===\n');
console.log('Kiro:             ', kiroUrl);
console.log();
console.log('Cursor:           ', cursorUrl);
console.log('Cursor badge:     ', cursorBadge);
console.log();
console.log('VS Code:          ', vscodeUrl);
console.log('VS Code Insiders: ', vscodeInsidersUrl);

console.log('\n=== Decoded payloads ===\n');
console.log('Kiro config (URL-encoded) →');
console.log(JSON.stringify(KIRO_CONFIG, null, 2));
console.log('\nCursor config (base64) →');
console.log(JSON.stringify(CONFIG, null, 2));
console.log('\nVS Code config (URL-encoded JSON) →');
console.log(JSON.stringify(CONFIG, null, 2));

console.log('\n=== Why HTTPS redirectors? ===');
console.log('GitHub Markdown strips custom protocols like cursor:// and vscode:');
console.log('from <a href=""> attributes as a security policy. Only HTTPS URLs');
console.log('survive. Both Cursor (cursor.com/en/install-mcp) and VS Code');
console.log('(insiders.vscode.dev/redirect/mcp/install) publish HTTPS endpoints');
console.log('that hand off to the native protocol handler on the user\'s machine.');
