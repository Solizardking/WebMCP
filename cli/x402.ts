/**
 * First-party x402 CLI: one-shot SIWX login against /authorize.
 *
 *   npx -p @x402solana/cli x402 authorize --origin https://x402.life --secret-key <base58>
 *   X402_SECRET_KEY=... npx -p @x402solana/cli x402 --origin http://127.0.0.1:3000
 *
 * Prints JSON `{ ok, token, walletAddress, userId }` then the Bearer token.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Keypair } from '@solana/web3.js';
import { authorizeWithSiwx } from '../../../src/services/x402Authorize.ts';
import { DEFAULT_AUTHORIZE_ORIGIN } from '../../../src/services/x402Siwx.ts';
import { x402HelpText } from './help.ts';

export { x402HelpText, CLI_NPM_NAME, cliGuideSnippets, npxCli } from './help.ts';

export type X402CliResult = {
  ok: true;
  token: string;
  walletAddress: string;
  userId: string;
};

const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const B58_MAP: Record<string, number> = {};
for (let i = 0; i < B58_ALPHABET.length; i++) B58_MAP[B58_ALPHABET[i]] = i;

function flagValue(argv: string[], name: string): string | undefined {
  const eq = `--${name}=`;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === `--${name}`) return argv[i + 1];
    if (arg.startsWith(eq)) return arg.slice(eq.length);
  }
  return undefined;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(`--${name}`) || argv.includes(`-${name}`);
}

function decodeBase58(str: string): Uint8Array {
  if (str.length === 0) return new Uint8Array(0);
  const bytes: number[] = [0];
  for (const ch of str) {
    const val = B58_MAP[ch];
    if (val === undefined) throw new Error('Non-base58 character in secret key');
    let carry = val;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < str.length && str[i] === '1'; i++) bytes.push(0);
  return new Uint8Array(bytes.reverse());
}

function decodeSecretKey(raw: string): Uint8Array {
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    const arr = JSON.parse(trimmed) as number[];
    if (!Array.isArray(arr) || arr.length < 32) throw new Error('keypair JSON must be a Solana secret-key array');
    return Uint8Array.from(arr);
  }
  const decoded = decodeBase58(trimmed);
  if (decoded.length === 32) return Keypair.fromSeed(decoded).secretKey;
  if (decoded.length !== 64) throw new Error(`secret key must be 32 or 64 bytes, got ${decoded.length}`);
  return decoded;
}

export function loadSecretKey(opts: { secretKey?: string; keypairPath?: string }): Uint8Array {
  const fromFlag = opts.secretKey || process.env.X402_SECRET_KEY || '';
  if (fromFlag) return decodeSecretKey(fromFlag);
  const path = opts.keypairPath || process.env.X402_KEYPAIR || '';
  if (path) return decodeSecretKey(readFileSync(path, 'utf8'));
  throw new Error('Pass --secret-key (base58) or --keypair <solana.json>, or set X402_SECRET_KEY / X402_KEYPAIR');
}

export async function runX402Cli(argv: string[] = process.argv.slice(2)): Promise<X402CliResult> {
  if (hasFlag(argv, 'help') || argv.includes('-h')) {
    process.stdout.write(x402HelpText());
    return { ok: true, token: '', walletAddress: '', userId: '' };
  }
  const origin = flagValue(argv, 'origin') || process.env.X402_ORIGIN || DEFAULT_AUTHORIZE_ORIGIN;
  const secretKey = loadSecretKey({
    secretKey: flagValue(argv, 'secret-key') || flagValue(argv, 'secretKey'),
    keypairPath: flagValue(argv, 'keypair'),
  });
  const session = await authorizeWithSiwx({ origin, secretKey });
  if (!session.token) throw new Error('authorize succeeded without a session token');
  const payload: X402CliResult = {
    ok: true,
    token: session.token,
    walletAddress: session.walletAddress,
    userId: session.userId,
  };
  process.stdout.write(`${JSON.stringify(payload)}\n${payload.token}\n`);
  return payload;
}

function isDirectRun(): boolean {
  return process.argv.some((arg) => {
    const entry = String(arg || '').replace(/\\/g, '/');
    if (/(?:^|\/)(?:cli\/)?(?:dist\/)?x402\.(?:ts|js)$/.test(entry) || /(?:^|\/)x402$/.test(entry)) return true;
    try {
      return import.meta.url === pathToFileURL(arg).href;
    } catch {
      return false;
    }
  });
}

if (isDirectRun()) {
  runX402Cli().catch((err) => {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
