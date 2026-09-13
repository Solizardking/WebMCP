import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const cliRoot = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

test('packed CLI commands run from an isolated directory with no desk source, credentials or network', t => {
  const scratch = mkdtempSync(join(tmpdir(), 'solgpt-cli-package-'));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));
  const npmConfig = join(scratch, 'npmrc');
  writeFileSync(npmConfig, '');
  const env = {
    PATH: process.env.PATH,
    TMPDIR: scratch,
    npm_config_userconfig: npmConfig,
    npm_config_globalconfig: join(scratch, 'global-npmrc'),
    npm_config_cache: join(scratch, 'npm-cache'),
    npm_config_update_notifier: 'false',
    HONCHO_ENABLED: 'false',
    OODA_JOURNAL_PATH: join(scratch, 'paper', 'ticks.jsonl'),
  };
  writeFileSync(env.npm_config_globalconfig, '');
  const report = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', scratch], {
    cwd: cliRoot, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }));
  const [packed] = Array.isArray(report) ? report : Object.values(report);
  assert.deepEqual(packed.files.map(file => file.path).sort(), ['README.md', 'dist/ooda.js', 'dist/x402.js', 'package.json']);
  execFileSync('tar', ['-xzf', join(scratch, packed.filename), '-C', scratch]);
  const installed = join(scratch, 'package');
  // Supply the declared runtime dependency from this checkout. The packed
  // commands themselves must not depend on unshipped desk source or esbuild.
  mkdirSync(join(installed, 'node_modules', '@solana'), { recursive: true });
  symlinkSync(dirname(require.resolve('@solana/web3.js/package.json')), join(installed, 'node_modules', '@solana', 'web3.js'));
  const blocker = join(scratch, 'deny-network.mjs');
  writeFileSync(blocker, `import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { syncBuiltinESMExports } from 'node:module';
const deny = () => { throw new Error('Network is forbidden in CLI package checks'); };
globalThis.fetch = deny;
http.request = http.get = https.request = https.get = net.connect = net.createConnection = deny;
syncBuiltinESMExports();
`);
  const run = (bin, args) => spawnSync(process.execPath, ['--import', blocker, join(installed, 'dist', `${bin}.js`), ...args], {
    cwd: scratch, env, encoding: 'utf8', timeout: 15_000,
  });
  for (const bin of ['x402', 'ooda']) {
    assert.ok(statSync(join(installed, 'dist', `${bin}.js`)).mode & 0o111, `${bin} must be executable`);
    const result = run(bin, ['--help']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, bin === 'x402' ? /authorize --origin https:\/\/x402\.life/ : /Paper OODA loop/);
    assert.doesNotMatch(result.stdout + result.stderr, /Network is forbidden/);
  }
  const missingKey = run('x402', []);
  assert.equal(missingKey.status, 1);
  assert.match(missingKey.stderr, /Pass --secret-key/);
  assert.doesNotMatch(missingKey.stderr, /Network is forbidden/);
  const paper = run('ooda', ['--ticks', '2', '--seed', '42', '--sleep', '0']);
  assert.equal(paper.status, 0, paper.stderr);
  const entries = readFileSync(env.OODA_JOURNAL_PATH, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  assert.equal(entries.length, 2);
  assert.match(paper.stderr, /paper ticks=2 seed=42 llm=false/);
  assert.match(paper.stderr, /honcho=false supermemory=false/);
});

test('a missing desk source root produces an actionable build failure', t => {
  const scratch = mkdtempSync(join(tmpdir(), 'solgpt-cli-missing-source-'));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, [join(cliRoot, 'build.mjs')], {
    cwd: scratch, env: { PATH: process.env.PATH, SOLGPT_DESK_ROOT: scratch }, encoding: 'utf8', timeout: 15_000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing desk source src\/services\/x402Authorize\.ts/);
  assert.match(result.stderr, /Set SOLGPT_DESK_ROOT/);
});
