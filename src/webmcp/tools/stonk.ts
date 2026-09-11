import { StonkClient } from '../../shared/stonk.js';
import type { WebMCPTool } from '../types.js';

export function createStonkWebMCPTools(client = new StonkClient()): WebMCPTool[] {
  return [{
    name: 'stonk.market', title: 'Read Solana Stonk markets',
    description: 'Read live tokens, launchable pairs or platform availability. Never signs, submits or pays.',
    inputSchema: { type: 'object', properties: { resource: { type: 'string', enum: ['tokens', 'pairs', 'stats'] } }, required: ['resource'], additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true, consequentialHint: false },
    execute: async ({ resource }) => {
      if (resource !== 'tokens' && resource !== 'pairs' && resource !== 'stats') throw new Error('Invalid market resource');
      return client[resource]();
    },
  }];
}
