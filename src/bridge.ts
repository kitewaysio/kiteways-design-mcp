import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  StreamableHTTPClientTransport,
  StreamableHTTPError,
} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import catalog from './tools.json' with { type: 'json' };

const ENDPOINT = '/mcp';

const Discovery = z.object({
  port: z.number().int().positive().max(65_535),
  token: z.string().min(1),
});

const NOT_RUNNING =
  'The Kiteways Design app is not running, or has not finished starting. Open it, sign in, and try again. Nothing was written.';
const OUTCOME_UNKNOWN =
  'The Kiteways Design app stopped answering in the middle of this call. It may or may not have been applied. Read the file again before you repeat it.';

const REFUSED = new Set(['ECONNREFUSED', 'ConnectionRefused']);
const NEVER_HANDLED = new Set([401, 404]);

export type Dialer = () => Promise<Client>;

export function dialerFromDiscovery(readDiscoveryText: () => Promise<string>): Dialer {
  return async () => {
    const discovery = Discovery.parse(JSON.parse(await readDiscoveryText()));
    const client = new Client({ name: 'kiteways-design', version: '1' });
    const transport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${discovery.port}${ENDPOINT}`),
      { requestInit: { headers: { authorization: `Bearer ${discovery.token}` } } },
    );
    await client.connect(transport);
    return client;
  };
}

function failed(message: string, code: string): CallToolResult {
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify({ error: message, code }) }],
  };
}

function neverArrived(failure: unknown): boolean {
  if (failure instanceof StreamableHTTPError) {
    return failure.code !== undefined && NEVER_HANDLED.has(failure.code);
  }
  let current: unknown = failure;
  for (let depth = 0; depth < 5 && current instanceof Error; depth += 1) {
    const code = (current as Error & { code?: unknown }).code;
    if (typeof code === 'string' && REFUSED.has(code)) return true;
    current = current.cause;
  }
  return false;
}

const fallbackTools: Tool[] = catalog.tools;

export class AppBridge {
  private upstream: Client | null = null;
  private dialing: Promise<Client> | null = null;

  constructor(private readonly dial: Dialer) {}

  async listTools(): Promise<Tool[]> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const client = await this.client();
        return (await client.listTools()).tools;
      } catch {
        await this.drop();
      }
    }
    return fallbackTools;
  }

  async callTool(name: string, input: Record<string, unknown>): Promise<CallToolResult> {
    let client: Client;
    try {
      client = await this.client();
    } catch {
      return failed(NOT_RUNNING, 'app-not-running');
    }
    try {
      return (await client.callTool({ name, arguments: input })) as CallToolResult;
    } catch (failure) {
      await this.drop();
      if (!neverArrived(failure)) return failed(OUTCOME_UNKNOWN, 'outcome-unknown');
    }
    try {
      client = await this.client();
      return (await client.callTool({ name, arguments: input })) as CallToolResult;
    } catch (failure) {
      await this.drop();
      return neverArrived(failure)
        ? failed(NOT_RUNNING, 'app-not-running')
        : failed(OUTCOME_UNKNOWN, 'outcome-unknown');
    }
  }

  async close(): Promise<void> {
    const client = this.upstream;
    this.upstream = null;
    if (!client) return;
    const transport = client.transport;
    if (transport instanceof StreamableHTTPClientTransport) {
      await transport.terminateSession().catch(() => undefined);
    }
    await client.close().catch(() => undefined);
  }

  private client(): Promise<Client> {
    if (this.upstream) return Promise.resolve(this.upstream);
    this.dialing ??= this.dial()
      .then((client) => {
        this.upstream = client;
        return client;
      })
      .finally(() => {
        this.dialing = null;
      });
    return this.dialing;
  }

  private async drop(): Promise<void> {
    const client = this.upstream;
    this.upstream = null;
    await client?.close().catch(() => undefined);
  }
}

export function createBridgeServer(bridge: AppBridge): Server {
  const server = new Server(
    { name: 'kiteways-design', version: '1' },
    { capabilities: { tools: {} }, instructions: catalog.instructions },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: await bridge.listTools(),
  }));
  server.setRequestHandler(CallToolRequestSchema, (call) =>
    bridge.callTool(call.params.name, call.params.arguments ?? {}),
  );
  return server;
}
