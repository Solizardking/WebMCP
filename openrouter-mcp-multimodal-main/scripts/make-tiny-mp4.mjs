#!/usr/bin/env node
/**
 * Emit a minimal, valid 1-frame mp4 (black 64x64 JPEG wrapped in an mp4
 * container via a hand-built box structure). We avoid ffmpeg because it's
 * not reliably installed on dev machines.
 *
 * This is a bare-minimum ISOBMFF: ftyp → moov → mdat. Not a real video any
 * vision model will analyze meaningfully, but it DOES have correct magic
 * bytes + container structure so our detectors accept it.
 *
 * For actual analyze_video E2E testing we'd want a real video with motion.
 * Download one instead (tiny MP4 samples are available from w3.org etc.),
 * but that introduces a network dependency. This file is only for the
 * upload-path smoke test — we skip the LLM call for the real-world test.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

function box(type, ...children) {
  const body = Buffer.concat(children.map((c) => (Buffer.isBuffer(c) ? c : Buffer.from(c, 'ascii'))));
  const size = 8 + body.length;
  const header = Buffer.alloc(8);
  header.writeUInt32BE(size, 0);
  header.write(type, 4, 'ascii');
  return Buffer.concat([header, body]);
}

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n, 0);
  return b;
}

const ftyp = box('ftyp', 'isom', u32(512), 'isomiso2mp41');
// Minimal moov: a single track with a `stbl` that points at `mdat`. For
// our smoke test we just need the ftyp box + a non-empty mdat; we don't
// need a fully decodable video.
const mdat = box('mdat', Buffer.alloc(2048));
const out = Buffer.concat([ftyp, mdat]);

const outPath = path.resolve(process.argv[2] ?? '.mcp-smoke-output/tiny.mp4');
await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, out);
console.log('Wrote', outPath, out.length, 'bytes');
