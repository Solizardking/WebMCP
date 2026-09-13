/**
 * Paper OODA loop — same path the desk / tests drive.
 *
 *   npx -p @x402solana/cli ooda --ticks 8 --seed 42 --sleep 0
 *   npx -p @x402solana/cli ooda --ticks 8 --llm
 */
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { runOodaLoop } from '../../../src/lib/ooda/loop.ts';
import { oodaHelpText } from './help.ts';

export { oodaHelpText, CLI_NPM_NAME, cliGuideSnippets, npxCli } from './help.ts';

export type OodaCliOptions = {
  ticks: number;
  seed: number;
  sleepMs: number;
  useLlm: boolean;
};

export function parseOodaCli(argv: string[] = process.argv.slice(2)): { help: boolean; options: OodaCliOptions } {
  if (argv.includes('--help') || argv.includes('-h')) {
    return { help: true, options: { ticks: 8, seed: 42, sleepMs: 0, useLlm: false } };
  }
  const { values } = parseArgs({
    args: argv,
    options: {
      ticks: { type: 'string', default: '8' },
      sleep: { type: 'string', default: '0' },
      seed: { type: 'string', default: '42' },
      llm: { type: 'boolean', default: false },
    },
    strict: false,
  });
  return {
    help: false,
    options: {
      ticks: parseInt(String(values.ticks), 10) || 8,
      seed: parseInt(String(values.seed), 10),
      sleepMs: Math.round(parseFloat(String(values.sleep)) * 1000) || 0,
      useLlm: Boolean(values.llm),
    },
  };
}

export async function runOodaCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const parsed = parseOodaCli(argv);
  if (parsed.help) {
    process.stdout.write(oodaHelpText());
    return 0;
  }
  const result = await runOodaLoop(parsed.options);
  return result.exitCode;
}

function isDirectRun(): boolean {
  return process.argv.some((arg) => {
    const entry = String(arg || '').replace(/\\/g, '/');
    if (/(?:^|\/)(?:cli\/)?(?:dist\/)?ooda\.(?:ts|js)$/.test(entry) || /(?:^|\/)ooda$/.test(entry)) return true;
    try {
      return import.meta.url === pathToFileURL(arg).href;
    } catch {
      return false;
    }
  });
}

if (isDirectRun()) {
  runOodaCli()
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
      process.exit(1);
    });
}
