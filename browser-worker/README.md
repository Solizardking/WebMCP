# Browser screenshot Worker

Run `npm install`, `npm run cf-typegen`, then `npm run dev` from this directory.
Deploy with `npm run deploy`.

- `GET /?url=https://example.com/`: JPEG screenshot cached in `BROWSER_KV_DEMO` for 24 hours. `X-Screenshot-Cache` reports `MISS` or `HIT`.
- `GET /screenshots`: captures `https://workers.cloudflare.com/` at 1920×1080, 1366×768, 1536×864, 360×640, and 414×896. Returns the saved R2 object keys and `reusedBrowser`.

`BUCKET` binds to `screenshots`, with `screenshots-test` as its preview bucket. The browser binding uses a real remote browser during local development. KV and R2 are simulated locally by default. Remote development uses preview storage.

The `Browser` Durable Object keeps a browser available for 60 seconds after capture finishes. Concurrent captures return HTTP 429. Each batch uses a unique folder. Failed batches report any object keys already saved.

The original `MyDurableObject` class and v1 migration are retained for compatibility; v2 adds `Browser`.
