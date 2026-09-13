/**
 * Help text and copy-paste snippets for @x402solana/cli.
 * Kept free of wallet/secret imports so the desk SPA can reuse it.
 */
export const CLI_NPM_NAME = '@x402solana/cli';
export const CLI_BINS = ['x402', 'ooda'] as const;

export function x402HelpText(): string {
  return (
    'x402 authorize --origin https://x402.life --secret-key <base58>\n' +
    '  One-shot SIWX login against /authorize. Prints JSON {token,walletAddress,userId}.\n' +
    '  Key input: --secret-key / X402_SECRET_KEY, or --keypair / X402_KEYPAIR.\n' +
    '  --origin overrides X402_ORIGIN; the default remains https://x402.life.\n' +
    '  Desk hub: https://solgpt.trade/mc. MCP clients use /mcp; this command is a login helper.\n'
  );
}

export function oodaHelpText(): string {
  return (
    'ooda --ticks 8 --seed 42 --sleep 0 [--llm]\n' +
    '  Paper OODA loop. Exits with the loop exitCode.\n' +
    '  Writes OODA_JOURNAL_PATH, or ./ooda-journal/ticks.jsonl.\n' +
    '  Configured memory integrations and --llm may make provider requests.\n'
  );
}

export function npxCli(bin: (typeof CLI_BINS)[number]): string {
  return `npx -p ${CLI_NPM_NAME} ${bin}`;
}

export function cliGuideSnippets(origin: string): {
  packageName: string;
  mcpUrl: string;
  x402Help: string;
  oodaHelp: string;
  authorize: string;
  authorizeEnv: string;
  ooda: string;
  bearer: string;
} {
  const originClean = String(origin || '').replace(/\/$/, '') || 'https://x402.life';
  const mcpUrl = `${originClean}/mcp`;
  return {
    packageName: CLI_NPM_NAME,
    mcpUrl,
    x402Help: x402HelpText(),
    oodaHelp: oodaHelpText(),
    authorize: `${npxCli('x402')} authorize --origin ${originClean} --secret-key <base58>`,
    authorizeEnv: `X402_SECRET_KEY=... ${npxCli('x402')} --origin ${originClean}`,
    ooda: `${npxCli('ooda')} --ticks 8 --seed 42 --sleep 0`,
    bearer: [
      `# token from \`${npxCli('x402')} authorize\``,
      `Authorization: Bearer <token>`,
      `POST ${mcpUrl}`,
    ].join('\n'),
  };
}
