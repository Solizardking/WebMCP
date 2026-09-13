export const TOKENS = [
  { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Wrapped SOL', decimals: 9 },
  { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
];
export function address(value) {
  if (typeof value !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) throw new Error('Expected a Solana base58 address');
  let n = 0n;
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  for (const c of value) n = n * 58n + BigInt(alphabet.indexOf(c));
  const bytes = (n ? Math.ceil(n.toString(16).length / 2) : 0) + (value.match(/^1*/)[0].length);
  if (bytes !== 32) throw new Error('Solana address must decode to 32 bytes');
  return value;
}
export function validateSwap(input) {
  address(input.inputMint); address(input.outputMint);
  if (input.inputMint === input.outputMint) throw new Error('Choose two different token mints');
  if (typeof input.amount !== 'string' || !/^[0-9]{1,18}(\.[0-9]{1,9})?$/.test(input.amount) || Number(input.amount) <= 0) throw new Error('Amount must be a positive decimal string');
  if (!['ExactIn', 'ExactOut'].includes(input.swapMode)) throw new Error('Invalid swap mode');
  if (!Number.isInteger(input.slippageBps) || input.slippageBps < 1 || input.slippageBps > 500) throw new Error('Slippage must be 1–500 basis points');
  return input;
}
export function createSolanaService(env = process.env, fetcher = fetch) {
  async function json(url, options = {}) {
    const r = await fetcher(url, { ...options, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`Upstream request failed (${r.status})`);
    return r.json();
  }
  async function rpc(method, params = [], network = 'mainnet-beta') {
    if (!['mainnet-beta', 'devnet'].includes(network)) throw new Error('Unknown network');
    const endpoint = network === 'devnet' ? (env.SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com') : (env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    const data = await json(endpoint, { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({jsonrpc:'2.0',id:1,method,params}) });
    if (data.error) throw new Error(`Solana RPC: ${data.error.message}`);
    if (!('result' in data)) throw new Error('Malformed RPC response');
    return data.result;
  }
  return {
    async network(network) {
      const [slot, version] = await Promise.all([rpc('getSlot', [{commitment:'confirmed'}], network), rpc('getVersion', [], network)]);
      return {network, slot, version:version['solana-core'], source:'Solana JSON-RPC', observedAt:new Date().toISOString()};
    },
    async wallet(publicKey, network) {
      address(publicKey);
      const balance = await rpc('getBalance', [publicKey, {commitment:'confirmed'}], network);
      return {publicKey, network, lamports:String(balance.value), solBalance:balance.value / 1e9, slot:balance.context.slot, observedAt:new Date().toISOString()};
    },
    async resolve(query) {
      if (typeof query !== 'string' || !query.trim() || query.length > 96) throw new Error('Enter a symbol or exact mint (1–96 characters)');
      const known = TOKENS.filter(t => [t.symbol.toLowerCase(),t.mint,t.name.toLowerCase()].includes(query.trim().toLowerCase()) || t.mint === query.trim());
      if (known.length) return known.map(t => ({...t, source:'Bundled canonical token identities', network:'mainnet-beta'}));
      const data = await json(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`);
      const seen = new Set();
      return (data.pairs || []).filter(p => p.chainId === 'solana').flatMap(p => [p.baseToken,p.quoteToken]).filter(t => t && !seen.has(t.address) && seen.add(t.address)).slice(0,12).map(t => ({mint:t.address, name:t.name, symbol:t.symbol, source:'DEX Screener; verify exact mint', network:'mainnet-beta'}));
    },
    async market(mint) {
      address(mint);
      const data = await json(`https://api.dexscreener.com/token-pairs/v1/solana/${mint}`);
      const pair = data.filter(p => p.chainId === 'solana' && p.baseToken.address === mint && p.liquidity?.usd > 0).sort((a,b) => b.liquidity.usd - a.liquidity.usd)[0];
      return {mint, pair:pair || null, source:'DEX Screener', observedAt:new Date().toISOString()};
    },
    async inspect(signature, network) {
      if (typeof signature !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature)) throw new Error('Expected a transaction signature');
      return {signature, network, transaction:await rpc('getTransaction', [signature, {encoding:'jsonParsed',maxSupportedTransactionVersion:0,commitment:'confirmed'}], network), observedAt:new Date().toISOString()};
    },
    async quote(input) {
      validateSwap(input);
      if (input.network && input.network !== 'mainnet-beta') throw new Error('Swap quotes are mainnet-only');
      if (!env.JUPITER_API_KEY) throw Object.assign(new Error('Set JUPITER_API_KEY on the server to enable live swap quotes'), {status:503});
      const mint = input.swapMode === 'ExactIn' ? input.inputMint : input.outputMint;
      const token = TOKENS.find(t => t.mint === mint);
      if (!token) throw new Error('Quote amount units currently support SOL and USDC only');
      const [whole, fraction = ''] = input.amount.split('.');
      if (fraction.length > token.decimals) throw new Error('Amount exceeds token precision');
      const amount = BigInt(whole) * 10n ** BigInt(token.decimals) + BigInt(fraction.padEnd(token.decimals,'0'));
      const params = new URLSearchParams({inputMint:input.inputMint,outputMint:input.outputMint,amount:String(amount),swapMode:input.swapMode,slippageBps:String(input.slippageBps)});
      const quote = await json(`https://api.jup.ag/swap/v1/quote?${params}`, {headers:{'x-api-key':env.JUPITER_API_KEY}});
      return {...quote, observedAt:new Date().toISOString(), source:'Jupiter', amountUnit:'base units', requestedUiAmount:input.amount};
    },
  };
}
