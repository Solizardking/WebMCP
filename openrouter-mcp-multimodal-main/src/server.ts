import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ToolHandlers } from './tool-handlers.js';
import { SERVER_VERSION } from './version.js';
import { SERVER_ICON } from './tool-icons.js';

export function createMcpServer(apiKey: string, defaultModel: string): Server {
  const server = new Server(
    {
      name: 'openrouter-multimodal-server',
      version: SERVER_VERSION,
      title: 'OpenRouter MCP Multimodal',
      description:
        'MCP server for OpenRouter — chat with 300+ LLMs, analyze/generate images, audio, and video.',
      websiteUrl: 'https://github.com/stabgan/openrouter-mcp-multimodal',
      icons: SERVER_ICON,
    },
    { capabilities: { tools: {} } },
  );

  new ToolHandlers(server, apiKey, defaultModel);

  return server;
}
