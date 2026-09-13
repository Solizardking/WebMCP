import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const vars = await readFile(new URL('../.dev.vars', import.meta.url), 'utf8')
const token = vars.match(/^LOCAL_SANDBOX_TOKEN=(.+)$/m)?.[1]?.trim()
assert.ok(token, 'Run pnpm local:setup first')
const endpoint = 'http://127.0.0.1:8976/mcp'
const headers = {
	Authorization: `Bearer ${token}`,
	'Content-Type': 'application/json',
	Accept: 'application/json, text/event-stream',
	'MCP-Protocol-Version': '2025-11-25',
}
async function rpc(method, params = {}) {
	const response = await fetch(endpoint, {
		method: 'POST',
		headers,
		body: JSON.stringify({ jsonrpc: '2.0', id: crypto.randomUUID(), method, params }),
		signal: AbortSignal.timeout(15000),
	})
	assert.equal(
		response.status,
		200,
		`${method}: ${await (!response.ok ? response.text() : Promise.resolve(''))}`
	)
	const raw = await response.text()
	const document = JSON.parse(
		raw.startsWith('event:') || raw.startsWith('data:')
			? raw
					.split('\n')
					.find((line) => line.startsWith('data:'))
					.slice(5)
			: raw
	)
	assert.ok(!document.error, JSON.stringify(document.error))
	assert.ok(!document.result.isError, JSON.stringify(document.result))
	return document.result
}
async function call(name, args) {
	return rpc('tools/call', { name, arguments: args ? { args } : {} })
}
assert.equal((await fetch(endpoint)).status, 401)
assert.equal(
	(await fetch(endpoint, { headers: { ...headers, Origin: 'https://example.com' } })).status,
	403
)
await rpc('initialize', {
	protocolVersion: '2025-11-25',
	capabilities: {},
	clientInfo: { name: 'sandbox-smoke', version: '1.0.0' },
})
const tools = await rpc('tools/list')
assert.equal(tools.tools.length, 7)
await call('container_initialize')
assert.match(JSON.stringify(await call('container_ping')), /pong!/)
const folder = `smoke-${crypto.randomUUID()}`
const path = `file:///${folder}/nested/hello.txt`
try {
	await call('container_file_write', { path, text: 'sandbox-roundtrip' })
	assert.match(JSON.stringify(await call('container_file_read', { path })), /sandbox-roundtrip/)
	assert.match(JSON.stringify(await call('container_files_list')), /nested\/hello.txt/)
	const execution = JSON.stringify(
		await call('container_exec', {
			args: 'python3 -c "print(6*7)" && node -e "console.log(process.platform)" && id -u',
			timeout: 5000,
		})
	)
	assert.match(execution, /42/)
	assert.match(execution, /linux/)
	assert.match(execution, /1000/)
	const start = Date.now()
	assert.match(
		JSON.stringify(await call('container_exec', { args: 'sleep 30', timeout: 200 })),
		/SIGKILL/
	)
	assert.ok(Date.now() - start < 5000, 'Timeout did not terminate the process group')
} finally {
	await call('container_file_delete', { path: `file:///${folder}` })
}
console.log(
	'PASS: bearer/origin checks, all 7 tools, nested file roundtrip, Python/Node in Linux as uid 1000, timeout, cleanup.'
)
