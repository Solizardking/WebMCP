import { mcpHandler } from './sandbox.server.app'

import type { Env } from './sandbox.server.context'

export { ContainerManager, UserContainer } from './sandbox.server.app'

// Single-operator local development only; never configured by the hosted Worker.
export default {
	async fetch(
		request: Request,
		env: Env & { LOCAL_SANDBOX_TOKEN?: string },
		ctx: ExecutionContext
	) {
		const url = new URL(request.url)
		const allowed = new Set(['127.0.0.1', 'localhost'])
		if (env.ENVIRONMENT !== 'dev' || !allowed.has(url.hostname))
			return new Response('Local only', { status: 403 })
		const origin = request.headers.get('Origin')
		if (origin && origin !== url.origin) return new Response('Forbidden origin', { status: 403 })
		if (url.pathname === '/healthz')
			return Response.json({ service: 'sandbox-container-local', authentication: 'bearer' })
		if (!['/mcp', '/sse'].includes(url.pathname)) return new Response('Not found', { status: 404 })
		if (
			!env.LOCAL_SANDBOX_TOKEN ||
			request.headers.get('Authorization') !== `Bearer ${env.LOCAL_SANDBOX_TOKEN}`
		) {
			return new Response('Local bearer token required', {
				status: 401,
				headers: { 'WWW-Authenticate': 'Bearer realm="sandbox-local"' },
			})
		}
		const localContext = {
			props: {
				type: 'user_token',
				accessToken: 'local-only',
				user: { id: 'local-operator', email: 'operator@localhost' },
				accounts: [],
			},
			waitUntil: ctx.waitUntil.bind(ctx),
			passThroughOnException: ctx.passThroughOnException.bind(ctx),
		} as ExecutionContext
		return mcpHandler.fetch(request, env, localContext)
	},
}
