import { randomBytes } from 'node:crypto'
import { chmod, readFile, writeFile } from 'node:fs/promises'

const file = new URL('../.dev.vars', import.meta.url)
let source = await readFile(file, 'utf8').catch((error) => {
	if (error.code === 'ENOENT') return ''
	throw error
})
if (!/^LOCAL_SANDBOX_TOKEN=.+$/m.test(source)) {
	source = source.replace(/^LOCAL_SANDBOX_TOKEN=.*\n?/gm, '')
	await writeFile(
		file,
		`${source.trimEnd()}\nLOCAL_SANDBOX_TOKEN=${randomBytes(32).toString('hex')}\n`,
		{ mode: 0o600 }
	)
}
await chmod(file, 0o600)
console.log('Local bearer token configured in .dev.vars (value hidden).')
