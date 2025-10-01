import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
interface MCPServerConfig {
  name: string;
  type: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  sseUrl?: string;
  disabled?: boolean;
}
// New MCP Server configurations
const MCP_SERVERS: MCPServerConfig[] = [
  {
    name: 'shadcn',
    type: 'stdio',
    command: 'npx',
    args: ['shadcn@latest', 'mcp']
  },
  {
    name: 'sequentialthinking',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking']
  },
  {
    name: 'fetch-mcp',
    type: 'stdio',
    command: 'npx',
    args: ['mcp-fetch-server']
  },
  {
    name: 'context7-mcp',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp']
  },
  {
    name: 'brave',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search']
  },
  {
    name: 'cloudflare',
    type: 'sse',
    sseUrl: 'https://docs.mcp.cloudflare.com/sse'
  }
];
export class MCPManager {
  private clients: Map<string, Client> = new Map();
  private toolMap: Map<string, string> = new Map();
  private initialized = false;
  async initialize() {
    if (this.initialized) return;
    for (const serverConfig of MCP_SERVERS) {
      if (serverConfig.disabled) continue;
      try {
        let transport;
        if (serverConfig.type === 'stdio' && serverConfig.command) {
          transport = new StdioClientTransport({
            command: serverConfig.command,
            args: serverConfig.args || []
          });
        } else if (serverConfig.type === 'sse' && serverConfig.sseUrl) {
          transport = new SSEClientTransport(new URL(serverConfig.sseUrl));
        } else {
          console.error(`Invalid MCP server config for ${serverConfig.name}`);
          continue;
        }
        const client = new Client({
          name: 'cloudflare-agent',
          version: '1.0.0'
        }, {
          capabilities: {}
        });
        await client.connect(transport);
        this.clients.set(serverConfig.name, client);
        const toolsResult = await client.listTools();
        if (toolsResult?.tools) {
          for (const tool of toolsResult.tools) {
            this.toolMap.set(tool.name, serverConfig.name);
          }
        }
      } catch (error) {
        console.error(`Failed to connect to MCP server ${serverConfig.name}:`, error);
      }
    }
    this.initialized = true;
  }
  async getToolDefinitions() {
    await this.initialize();
    const allTools = [];
    for (const [serverName, client] of this.clients.entries()) {
      try {
        const toolsResult = await client.listTools();
        if (toolsResult?.tools) {
          for (const tool of toolsResult.tools) {
            allTools.push({
              type: 'function' as const,
              function: {
                name: tool.name,
                description: tool.description || '',
                parameters: tool.inputSchema || {
                  type: 'object',
                  properties: {},
                  required: []
                }
              }
            });
          }
        }
      } catch (error) {
        console.error(`Error getting tools from ${serverName}:`, error);
      }
    }
    return allTools;
  }
  async executeTool(toolName: string, args: Record<string, unknown>): Promise<string> {
    await this.initialize();
    const serverName = this.toolMap.get(toolName);
    if (!serverName) {
      throw new Error(`Tool ${toolName} not found in any MCP server`);
    }
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Client for server ${serverName} not available`);
    }
    try {
      const result = await client.callTool({
        name: toolName,
        arguments: args
      });
      if (result.isError) {
        throw new Error(`Tool execution failed: ${Array.isArray(result.content) ? result.content.map((c: any) => c.text).join('\n') : 'Unknown error'}`);
      }
      if (Array.isArray(result.content)) {
        return result.content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('\n');
      }
      return 'No content returned';
    } catch (error) {
      throw new Error(`Tool execution failed: ${String(error)}`);
    }
  }
}
export const mcpManager = new MCPManager();