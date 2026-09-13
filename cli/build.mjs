import { chmodSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const cliRoot = dirname(fileURLToPath(import.meta.url));
// This checkout lives at <desk>/clawd-webmcp/WebMCP/cli. A standalone WebMCP
// checkout can build against the same reviewed desk sources via an explicit root.
const deskRoot = resolve(process.env.SOLGPT_DESK_ROOT || join(cliRoot, '../../..'));
const deskSources = [
  'src/services/x402Authorize.ts',
  'src/services/x402Siwx.ts',
  'src/lib/ooda/loop.ts',
];
for (const source of deskSources) {
  if (!existsSync(join(deskRoot, source))) {
    throw new Error(`Missing desk source ${source}. Set SOLGPT_DESK_ROOT to the SOLGPT trading-desk checkout before building this CLI.`);
  }
}

const deskSourcePlugin = {
  name: 'solgpt-desk-sources',
  setup(build) {
    build.onResolve({ filter: /^\.\.\/\.\.\/\.\.\/src\// }, args => {
      if (args.resolveDir !== cliRoot) return;
      const source = args.path.slice('../../../'.length);
      if (!deskSources.includes(source)) throw new Error(`Unexpected desk import: ${source}`);
      return { path: join(deskRoot, source) };
    });
  },
};

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
  absWorkingDir: cliRoot,
  plugins: [deskSourcePlugin],
};

await esbuild.build({
  ...common,
  entryPoints: ['x402.ts'],
  outfile: 'dist/x402.js',
  external: ['@solana/web3.js'],
});
await esbuild.build({
  ...common,
  entryPoints: ['ooda.ts'],
  outfile: 'dist/ooda.js',
});

chmodSync(join(cliRoot, 'dist/x402.js'), 0o755);
chmodSync(join(cliRoot, 'dist/ooda.js'), 0o755);
