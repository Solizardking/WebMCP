import { DurableObject } from "cloudflare:workers";
import puppeteer from "@cloudflare/puppeteer";

export default {
  async fetch(request, env): Promise<Response> {
    if (new URL(request.url).pathname === "/screenshots") {
      return env.BROWSER.getByName("browser").fetch(request);
    }
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET" } });
    }
    const input = new URL(request.url).searchParams.get("url");
    if (!input) {
      return new Response("Please add an ?url=https://example.com/ parameter", { status: 400 });
    }

    let url: string;
    try {
      const target = new URL(input);
      if (!["http:", "https:"].includes(target.protocol) || target.username || target.password) {
        throw new Error("Invalid URL");
      }
      url = target.toString();
    } catch {
      return new Response("Please provide a valid HTTP or HTTPS URL without credentials", { status: 400 });
    }
    // KV keys have a byte limit; hashing also supports long target URLs.
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url));
    const key = "jpeg:" + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");

    try {
      let img = await env.BROWSER_KV_DEMO.get(key, { type: "arrayBuffer" });
      const cached = img !== null;
      if (img === null) {
        const browser = await puppeteer.launch(env.MYBROWSER);
        try {
          const page = await browser.newPage();
          await page.goto(url, { waitUntil: "networkidle2", timeout: 30_000 });
          const screenshot = await page.screenshot({ type: "jpeg" });
          img = new Uint8Array(screenshot).buffer;
          await env.BROWSER_KV_DEMO.put(key, img, { expirationTtl: 60 * 60 * 24 });
        } finally {
          await browser.close();
        }
      }
      return new Response(img, {
        headers: { "content-type": "image/jpeg", "x-screenshot-cache": cached ? "HIT" : "MISS" },
      });
    } catch {
      return new Response("Unable to capture or cache screenshot. Please try again.", { status: 502 });
    }
  },
} satisfies ExportedHandler<Env>;

// Retain the original migration class for existing deployments.
export class MyDurableObject extends DurableObject<Env> {
  async sayHello(name: string): Promise<string> { return `Hello, ${name}!`; }
}

const IDLE_MS = 60_000;
const VIEWPORTS = [
  { width: 1920, height: 1080 }, { width: 1366, height: 768 },
  { width: 1536, height: 864 }, { width: 360, height: 640 },
  { width: 414, height: 896 },
];

export class Browser extends DurableObject<Env> {
  private browser?: Awaited<ReturnType<typeof puppeteer.launch>>;
  private busy = false;
  private lastUsed = 0;

  async fetch(request: Request): Promise<Response> {
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET" } });
    }
    // Avoid interleaving viewport changes and launching duplicate browsers.
    if (this.busy) return new Response("Screenshot capture in progress", { status: 429 });
    this.busy = true;
    let page: Awaited<ReturnType<NonNullable<typeof this.browser>["newPage"]>> | undefined;
    const files: string[] = [];
    try {
      // Arm cleanup before launching, including on failure paths.
      await this.ctx.storage.setAlarm(Date.now() + 10_000);
      const reused = Boolean(this.browser?.isConnected());
      if (!reused) this.browser = await puppeteer.launch(this.env.MYBROWSER);
      page = await this.browser!.newPage();
      const folder = `${new Date(Math.floor(Date.now() / 300_000) * 300_000).toISOString()}/${crypto.randomUUID()}`;
      for (const viewport of VIEWPORTS) {
        await page.setViewport(viewport);
        await page.goto("https://workers.cloudflare.com/", { waitUntil: "networkidle2", timeout: 30_000 });
        const screenshot = await page.screenshot({ type: "jpeg" });
        const key = `${folder}/screenshot_${viewport.width}x${viewport.height}.jpg`;
        await this.env.BUCKET.put(key, screenshot, { httpMetadata: { contentType: "image/jpeg" } });
        files.push(key);
      }
      return Response.json({ success: true, reusedBrowser: reused, files });
    } catch (error) {
      console.error("R2 screenshot capture failed", error);
      return Response.json({ success: false, error: "Screenshot capture failed", files }, { status: 502 });
    } finally {
      try { await page?.close(); } catch { /* Browser may have disconnected. */ }
      this.lastUsed = Date.now();
      this.busy = false;
      await this.ctx.storage.setAlarm(Date.now() + 10_000);
    }
  }

  async alarm(): Promise<void> {
    if (this.busy || Date.now() - this.lastUsed < IDLE_MS) {
      await this.ctx.storage.setAlarm(Date.now() + 10_000);
      return;
    }
    const browser = this.browser;
    this.browser = undefined;
    try { await browser?.close(); } catch { /* Already disconnected. */ }
  }
}
