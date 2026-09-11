export class NoriClient {
    agentAsset;
    signer;
    fetchImpl;
    origin;
    token;
    constructor(url, agentAsset, signer, fetchImpl = fetch) {
        this.agentAsset = agentAsset;
        this.signer = signer;
        this.fetchImpl = fetchImpl;
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/')
            throw new Error('Nori requires a trusted HTTPS origin');
        this.origin = parsed.origin;
    }
    async request(path, body, token) {
        const response = await this.fetchImpl(this.origin + path, {
            method: body === undefined ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(60_000),
            headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
                ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        if (response.status === 401 || response.status === 402)
            this.token = undefined;
        if (!response.ok)
            throw new Error(`Nori HTTP ${response.status}; no automatic payment or retry was attempted`);
        return response.json();
    }
    async discover(expectedExecutive) {
        const card = await this.request('/.well-known/agent-card.json');
        if (!expectedExecutive || card.serviceExecutiveAddress !== expectedExecutive)
            throw new Error('Nori executive does not match the pinned address');
        return card;
    }
    rateCard() { return this.request('/rate-card'); }
    models() { return this.request('/v1/models'); }
    async blockhash() {
        const result = await this.request('/v1/solana/blockhash');
        const value = result?.blockhash ?? result?.blockHash;
        if (typeof value !== 'string' || !value)
            throw new Error('Nori returned no blockhash');
        return value;
    }
    /** Partially-signed delegateExecutionV1. Nori co-signs as fee payer and submits. */
    submitDelegation(transaction) {
        const payload = String(transaction || '').trim();
        if (!payload)
            throw new Error('expected { transaction: <base64> }');
        return this.request('/v1/delegate/submit', { transaction: payload });
    }
    async authenticate() {
        const { nonce } = await this.request('/auth/challenge');
        if (typeof nonce !== 'string' || !nonce.length || nonce.length > 512)
            throw new Error('Invalid Nori challenge');
        const now = Date.now();
        const handshake = { pubkey: this.signer.publicKey, agentAsset: this.agentAsset, audience: this.origin,
            nonce, issuedAt: new Date(now).toISOString(), expiresAt: new Date(now + 60_000).toISOString() };
        const signature = await this.signer.signMessage(new TextEncoder().encode(JSON.stringify(handshake)));
        const result = await this.request('/auth/handshake', { handshake, signature });
        if (typeof result.token !== 'string' || !result.token)
            throw new Error('Nori returned no bearer token');
        this.token = { value: result.token, expiresAt: now + 14 * 60_000 };
    }
    /** Explicit service invocation. Charges may occur under the on-chain delegation. */
    async call(skill, input) {
        const paths = { 'chat.completion': '/v1/chat/completions', 'image.generation': '/v1/images/generations', 'solana.rpc': '/v1/solana/rpc' };
        if (!Object.hasOwn(paths, skill) || input.stream === true)
            throw new Error('Unsupported Nori skill or streaming request');
        if (!this.token || this.token.expiresAt <= Date.now())
            await this.authenticate();
        return this.request(paths[skill], input, this.token.value);
    }
    async sendMessage(skill, input, requestId = crypto.randomUUID()) {
        if (!['chat.completion', 'image.generation', 'solana.rpc'].includes(skill) || input.stream === true)
            throw new Error('Unsupported Nori skill or streaming request');
        if (!this.token || this.token.expiresAt <= Date.now())
            await this.authenticate();
        return this.request('/a2a', { jsonrpc: '2.0', id: requestId, method: 'message/send',
            params: { requestId, message: { parts: [{ kind: 'data', data: { skill, input } }] } } }, this.token.value);
    }
    disconnect() { this.token = undefined; }
}
//# sourceMappingURL=nori.js.map