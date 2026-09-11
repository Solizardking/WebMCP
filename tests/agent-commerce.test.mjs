import test from 'node:test';
import assert from 'node:assert/strict';
import { StonkClient, StonkApiError, launchInput, NoriClient } from '../dist/index.js';
const key = '11111111111111111111111111111111';
test('Launch validation forbids secrets and ambiguous developer buys', () => {
  const input = { creatorWallet: key, quoteMint: key, name: 'Test', symbol: 'T', mode: 'standard', logo: 'data:image/png;base64,YQ==' };
  assert.throws(() => launchInput.parse({ ...input, privateKey: 'never' }));
  assert.throws(() => launchInput.parse({ ...input, devBuySol: 1, devBuyPercent: 1 }));
});
test('Stonk preserves charged/conflict and Retry-After without retrying submissions', async () => {
  let calls = 0;
  const client = new StonkClient(async () => { calls++; return Response.json({ error: { code: 'conflict', message: 'recover' }, charged: true }, { status: 409, headers: { 'Retry-After': '30' } }); });
  await assert.rejects(client.submitLaunch({ signedQuote: 'quote', signedTransaction: 'signed', logo: 'logo' }), error =>
    error instanceof StonkApiError && error.status === 409 && error.retryAfter === '30' && error.details.charged === true);
  assert.equal(calls, 1);
});
test('Nori signs the handshake and stops on 402 without an automatic retry', async () => {
  const calls = []; let signedEnvelope;
  const client = new NoriClient('https://nori.example', key, {
    publicKey: key, signMessage: async bytes => { signedEnvelope = JSON.parse(new TextDecoder().decode(bytes)); return 'signature'; },
  }, async (url, init) => {
    calls.push(url);
    if (url.endsWith('/auth/challenge')) return Response.json({ nonce: 'challenge' });
    if (url.endsWith('/auth/handshake')) return Response.json({ token: 'bearer' });
    assert.equal(init.headers.Authorization, 'Bearer bearer');
    return Response.json({}, { status: 402 });
  });
  await assert.rejects(client.call('chat.completion', { messages: [] }), /402/);
  assert.equal(signedEnvelope.audience, 'https://nori.example');
  assert.equal(signedEnvelope.agentAsset, key);
  assert.equal(calls.length, 3);
});
test('Nori blockhash + delegate submit posts { transaction } once', async () => {
  const calls = [];
  const client = new NoriClient('https://nori.example', key, {
    publicKey: key, signMessage: async () => 'signature',
  }, async (url, init) => {
    calls.push(url);
    if (url.endsWith('/v1/solana/blockhash')) return Response.json({ blockhash: key });
    if (url.endsWith('/v1/delegate/submit')) {
      assert.equal(JSON.parse(init.body).transaction, 'dGVzdA==');
      return Response.json({ success: true, signature: 'sig' });
    }
    return Response.json({}, { status: 500 });
  });
  assert.equal(await client.blockhash(), key);
  assert.equal((await client.submitDelegation('dGVzdA==')).signature, 'sig');
  assert.equal(calls.length, 2);
});
