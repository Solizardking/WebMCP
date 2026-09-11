import { chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const common = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  banner: {
    js: '#!/usr/bin/env node\nimport { createRequire } from \'node:module\';\nconst require = createRequire(import.meta.url);\n',
  },
  legalComments: 'none',
  logLevel: 'info',
};

await esbuild.build({
  ...common,
  absWorkingDir: root,
  entryPoints: ['cli/x402.ts'],
  outfile: 'cli/dist/x402.js',
  external: ['@solana/web3.js'],
});
await esbuild.build({
  ...common,
  absWorkingDir: root,
  entryPoints: ['cli/ooda.ts'],
  outfile: 'cli/dist/ooda.js',
});

chmodSync(join(root, 'cli/dist/x402.js'), 0o755);
chmodSync(join(root, 'cli/dist/ooda.js'), 0o755);
