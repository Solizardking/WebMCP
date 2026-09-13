/** Read one matching JSON-RPC reply from a Streamable HTTP response. */
export async function readMcpResponse(response, expectedId) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  if (!contentType.includes('text/event-stream') || !response.body) {
    throw new Error(`Unsupported MCP response content type: ${contentType}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += done ? decoder.decode() + '\n\n' : decoder.decode(value, { stream: true });
      let boundary;
      while ((boundary = /\r?\n\r?\n/.exec(pending))) {
        const event = pending.slice(0, boundary.index);
        pending = pending.slice(boundary.index + boundary[0].length);
        const data = event.split(/\r?\n/).filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).replace(/^ /, '')).join('\n');
        if (!data) continue;
        const message = JSON.parse(data);
        if (message.jsonrpc === '2.0' && message.id === expectedId) return message;
      }
      if (done) throw new Error(`MCP stream ended without reply ${expectedId}`);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
