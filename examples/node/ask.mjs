import { askOpenAI } from '../../dist/openai/index.js';
// Defaults to the public reference catalog at https://solgpt.trade/plugin/mcp.
// URL/token overrides remain available for a private MCP server.
try {
  const result = await askOpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-6-astra',
    prompt: process.argv.slice(2).join(' ') || 'Use get-fee-tier with bondingCurve true, and briefly explain the documented fees.',
    pump: { url: process.env.CLAWD_PUMP_MCP_URL, authorization: process.env.CLAWD_PUMP_MCP_TOKEN },
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
