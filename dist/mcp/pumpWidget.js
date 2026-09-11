import { CLAWD_WS_HTTP_DEFAULT, CLAWD_WS_WS_DEFAULT, PUMP_WIDGET_URI, X402_AGENCY_NAME, X402_LIFE_ORIGIN, X402_PUMP_MCP_URL, } from "../shared/pump.js";
/** MCP Apps HTML for the Pump.fun live tape. Hosts render this in an iframe. */
export function pumpFunWidgetHtml() {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>x402 agency live tape</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #090b0e; color: #eef2f5; }
    header { display: flex; justify-content: space-between; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #28323e; }
    header a { color: #14F195; text-decoration: none; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; }
    #rows { display: flex; flex-direction: column; gap: 8px; padding: 10px; }
    .card { border: 1px solid #28323e; border-radius: 8px; padding: 10px; background: #101419; }
    .sym { color: #ffcc00; font-weight: 700; }
    .name { color: #fff; }
    .meta { color: #9ba7b5; font-size: 11px; margin-top: 4px; }
    .card a { color: #7ab8ff; }
    #empty { color: #9ba7b5; padding: 16px; font-size: 12px; }
  </style>
</head>
<body data-x402-agency="${X402_AGENCY_NAME}" data-x402-mcp="${X402_PUMP_MCP_URL}" data-clawd-ws-host="${CLAWD_WS_HTTP_DEFAULT}/" data-clawd-ws-url="${CLAWD_WS_WS_DEFAULT}">
  <header>
    <a href="${X402_LIFE_ORIGIN}/" target="_blank" rel="noopener noreferrer">${X402_AGENCY_NAME} · x402.life</a>
    <span id="count"></span>
  </header>
  <div id="empty">Waiting for launches from x402.life/pump/mcp…</div>
  <div id="rows" hidden></div>
  <script>
    const rowsEl = document.getElementById('rows');
    const emptyEl = document.getElementById('empty');
    const countEl = document.getElementById('count');
    const pending = new Map();
    let nextId = 1;
    function esc(value) {
      const node = document.createElement('div');
      node.textContent = value == null ? '' : String(value);
      return node.innerHTML;
    }
    function render(payload) {
      const launches = Array.isArray(payload?.launches) ? payload.launches : [];
      countEl.textContent = launches.length ? launches.length + ' coins' : '';
      if (!launches.length) {
        emptyEl.hidden = false;
        rowsEl.hidden = true;
        rowsEl.innerHTML = '';
        return;
      }
      emptyEl.hidden = true;
      rowsEl.hidden = false;
      rowsEl.innerHTML = launches.map((row) => {
        const mint = esc(row.mint || '');
        const href = esc(row.pumpfunUrl || ('https://pump.fun/coin/' + (row.mint || '')));
        const mcap = row.marketCapSol != null ? Number(row.marketCapSol).toFixed(2) + ' SOL' : '';
        return '<article class="card"><div><span class="name">' + esc(row.name) + '</span> <span class="sym">$' + esc(row.symbol) + '</span></div><div class="meta">' + esc(mcap) + ' · <a href="' + href + '" target="_blank" rel="noopener noreferrer">' + mint.slice(0, 6) + '…</a></div></article>';
      }).join('');
    }
    function request(method, params) {
      const id = nextId++;
      window.parent.postMessage({ jsonrpc: '2.0', id, method, params }, '*');
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    }
    window.addEventListener('message', (event) => {
      if (event.source !== window.parent) return;
      const message = event.data;
      if (!message || message.jsonrpc !== '2.0') return;
      if (message.id !== undefined && pending.has(message.id)) {
        const waiter = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) waiter.reject(message.error);
        else waiter.resolve(message.result);
        return;
      }
      if (message.method === 'ui/notifications/tool-result') {
        render(message.params && message.params.structuredContent);
      }
    }, { passive: true });
    request('ui/initialize', {}).catch(() => {});
  </script>
</body>
</html>`;
}
export { PUMP_WIDGET_URI };
//# sourceMappingURL=pumpWidget.js.map