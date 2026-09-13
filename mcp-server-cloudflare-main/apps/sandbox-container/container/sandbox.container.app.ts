import { spawn } from 'node:child_process'
import * as fs from 'node:fs/promises'
import path from 'node:path'
import { serve } from '@hono/node-server'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { streamText } from 'hono/streaming'
import mime from 'mime'

import { ExecParams, FileWrite } from '../shared/schema.ts'
import {
	DIRECTORY_CONTENT_TYPE,
	get_file_name_from_path,
	get_mime_type,
	list_files_in_directory,
} from './fileUtils.ts'

import type { FileList } from '../shared/schema.ts'

const workdir = path.resolve(process.env.SANDBOX_WORKDIR ?? 'workdir')
await fs.mkdir(workdir, { recursive: true })
process.chdir(workdir)

const app = new Hono()
app.use('*', async (c, next) => {
	const hostname = new URL(c.req.url).hostname
	if (c.req.header('Origin') || !['127.0.0.1', 'localhost', 'host'].includes(hostname))
		return c.text('Forbidden', 403)
	await next()
})

app.get('/ping', (c) => c.text('pong!'))

/**
 * GET /files/ls
 *
 * Gets all files in a directory
 */
app.get('/files/ls', async (c) => {
	const directoriesToRead = ['.']
	const files: FileList = { resources: [] }

	while (directoriesToRead.length > 0) {
		const curr = directoriesToRead.pop()
		if (!curr) {
			throw new Error('Popped empty stack, error while listing directories')
		}
		const fullPath = path.join(process.cwd(), curr)
		const dir = await fs.readdir(fullPath, { withFileTypes: true })
		for (const dirent of dir) {
			const relPath = path.relative(process.cwd(), `${fullPath}/${dirent.name}`)
			if (dirent.isDirectory()) {
				directoriesToRead.push(path.join(curr, dirent.name))
				files.resources.push({
					uri: `file:///${relPath}`,
					name: dirent.name,
					mimeType: 'inode/directory',
				})
			} else {
				const mimeType = mime.getType(dirent.name)
				files.resources.push({
					uri: `file:///${relPath}`,
					name: dirent.name,
					mimeType: mimeType ?? undefined,
				})
			}
		}
	}

	return c.json(files)
})

/**
 * GET /files/contents/{filepath}
 *
 * Get the contents of a file or directory
 */
app.get('/files/contents/*', async (c) => {
	const reqPath = await get_file_name_from_path(c.req.path)
	try {
		const mimeType = await get_mime_type(reqPath)
		const headers = mimeType ? { 'Content-Type': mimeType } : undefined
		const contents = await fs.readFile(path.join(process.cwd(), reqPath))
		return c.newResponse(contents, 200, headers)
	} catch (e: any) {
		if (e.code) {
			if (e.code === 'EISDIR') {
				const files = await list_files_in_directory(reqPath)
				return c.newResponse(files.join('\n'), 200, {
					'Content-Type': DIRECTORY_CONTENT_TYPE,
				})
			}
			if (e.code === 'ENOENT') {
				return c.notFound()
			}
		}

		throw e
	}
})

/**
 * POST /files/contents
 *
 * Create or update file contents
 */
app.post('/files/contents', zValidator('json', FileWrite), async (c) => {
	const file = c.req.valid('json')
	const reqPath = await get_file_name_from_path(file.path)

	try {
		const destination = path.join(process.cwd(), reqPath)
		await fs.mkdir(path.dirname(destination), { recursive: true })
		await fs.writeFile(destination, file.text)
		return c.newResponse(null, 200)
	} catch (e) {
		return c.newResponse(`Error: ${e}`, 400)
	}
})

/**
 * DELETE /files/contents/{filepath}
 *
 * Delete a file or directory
 */
app.delete('/files/contents/*', async (c) => {
	const reqPath = await get_file_name_from_path(c.req.path)

	try {
		await fs.rm(path.join(process.cwd(), reqPath), { recursive: true })
		return c.newResponse('ok', 200)
	} catch (e: any) {
		if (e.code) {
			if (e.code === 'ENOENT') {
				return c.notFound()
			}
		}

		throw e
	}
})

/**
 * POST /exec
 *
 * Execute a command in a shell
 */
app.post('/exec', zValidator('json', ExecParams), (c) => {
	const execParams = c.req.valid('json')
	const proc = spawn('/bin/sh', ['-c', execParams.args], { detached: true })
	const timer = setTimeout(() => {
		if (proc.pid) {
			try {
				process.kill(-proc.pid, 'SIGKILL')
			} catch {
				// The process may have exited before the timeout fired.
			}
		}
	}, execParams.timeout ?? 30_000)
	return streamText(c, async (stream) => {
		return new Promise((resolve, reject) => {
			if (proc.stdout) {
				// Stream data from stdout
				proc.stdout.on('data', async (data) => {
					await stream.write(data.toString())
				})
			} else {
				void stream.write('WARNING: no stdout stream for process')
			}

			if (execParams.streamStderr) {
				if (proc.stderr) {
					proc.stderr.on('data', async (data) => {
						await stream.write(data.toString())
					})
				} else {
					void stream.write('WARNING: no stderr stream for process')
				}
			}

			// Handle process exit
			proc.on('close', async (code, signal) => {
				clearTimeout(timer)
				await stream.write(`Process exited with code: ${code}${signal ? ` (${signal})` : ''}`)
				await stream.close()
				resolve()
			})

			proc.on('error', (err) => {
				clearTimeout(timer)
				console.error('Error with process: ', err)
				reject(err)
			})
		})
	})
})

serve({
	fetch: app.fetch,
	port: 8080,
	hostname: process.env.SANDBOX_HOST ?? '127.0.0.1',
})
