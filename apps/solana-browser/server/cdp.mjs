import WebSocket from 'ws';
import { EventEmitter } from 'node:events';
export class CDP extends EventEmitter {
  constructor(url, headers = {}) {
    super(); this.pending = new Map(); this.id = 0;
    this.socket = new WebSocket(url, {headers,handshakeTimeout:15000,maxPayload:16*1024*1024});
    this.ready = new Promise((resolve,reject) => { this.socket.once('open',resolve); this.socket.once('error',error => reject(new Error(/^Unexpected server response: [0-9]+$/.test(error.message) ? `Cloudflare CDP: ${error.message}` : `Browser CDP connection failed${error.code ? ` (${error.code})` : ''}`))); });
    this.socket.on('message', raw => {
      let data; try {data = JSON.parse(raw);} catch {return;}
      const p = this.pending.get(data.id);
      if (p) {clearTimeout(p.timer);this.pending.delete(data.id);data.error ? p.reject(new Error(data.error.message)) : p.resolve(data.result);}
      else if (data.method) this.emit(data.method, data.params, data.sessionId);
    });
    this.socket.on('close', () => { for (const p of this.pending.values()) {clearTimeout(p.timer);p.reject(new Error('Browser session closed'));} this.pending.clear(); });
    this.socket.on('error', () => {});
  }
  async send(method, params = {}, sessionId) {
    await this.ready;
    if (this.socket.readyState !== WebSocket.OPEN) throw new Error('Browser session closed');
    return new Promise((resolve,reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => {this.pending.delete(id);reject(new Error(`Browser command timed out: ${method}`));},30000);
      this.pending.set(id,{resolve,reject,timer});
      this.socket.send(JSON.stringify({id,method,params,...(sessionId ? {sessionId} : {})}));
    });
  }
  close() {this.socket.close();}
}
export const discoverExpression = `(async () => {
  const metadata = tools => tools.map(({name,title,description,inputSchema,annotations,origin}) => ({name,title,description,inputSchema,annotations,origin}));
  if (document.modelContext?.getTools) return {mode:'document',tools:metadata(await document.modelContext.getTools())};
  if (navigator.modelContextTesting?.listTools) return {mode:'navigator',tools:metadata(await navigator.modelContextTesting.listTools())};
  return {mode:'unavailable',tools:[]};
})()`;
