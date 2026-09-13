#!/usr/bin/env node
/**
 * Process the Gemini-generated logo:
 *   1. Apply a circular mask (transparent corners) so GitHub avatars + README
 *      hero render as a clean circle on any theme background.
 *   2. Emit 512/256/128/1024 px variants as optimized PNG.
 */
import sharp from 'sharp';
import { promises as fs } from 'node:fs';

const input = process.argv[2] || 'Gemini_Generated_Image_tcdv5itcdv5itcdv.png';
const outDir = 'assets';
await fs.mkdir(outDir, { recursive: true });

const buf = await fs.readFile(input);
const meta = await sharp(buf).metadata();
console.log(`Input: ${meta.width}x${meta.height} ${meta.format}`);

async function makeCircle(size, outFile) {
  const circleSvg = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  );
  await sharp(buf)
    .resize(size, size, { fit: 'cover' })
    .composite([{ input: circleSvg, blend: 'dest-in' }])
    .png({ quality: 92, compressionLevel: 9 })
    .toFile(outFile);
  const s = await fs.stat(outFile);
  console.log(`${size}px:  ${(s.size / 1024).toFixed(1).padStart(6)} KB → ${outFile}`);
}

await makeCircle(1024, `${outDir}/logo-1024.png`);
await makeCircle(512, `${outDir}/logo.png`);
await makeCircle(256, `${outDir}/logo-256.png`);
await makeCircle(128, `${outDir}/logo-128.png`);
