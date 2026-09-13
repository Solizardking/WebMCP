#!/usr/bin/env node
import 'dotenv/config';

const res = await fetch('https://openrouter.ai/api/v1/videos/models', {
  headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
});
if (!res.ok) {
  console.error('HTTP', res.status, await res.text());
  process.exit(1);
}
const body = await res.json();
const data = body.data ?? body.models ?? body;
console.log(JSON.stringify(data, null, 2).slice(0, 4000));
