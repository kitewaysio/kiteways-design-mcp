import { readFile } from 'node:fs/promises';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { AppBridge, createBridgeServer, dialerFromDiscovery } from './bridge.ts';
import { discoveryFilePath } from './discovery.ts';

const SCOPE_FLAG = '--scope';
const SCOPE_VARIABLE = 'KITEWAYS_DESIGN_MCP_SCOPE';

/** What the person limited this connection to: `file:<id>`, `project:<id>` or `team:<id>`. */
function scopeOf(argumentList: readonly string[]): string | undefined {
  const flagAt = argumentList.indexOf(SCOPE_FLAG);
  return (flagAt === -1 ? undefined : argumentList[flagAt + 1]) ?? process.env[SCOPE_VARIABLE];
}

async function main(): Promise<void> {
  let path: string;
  try {
    path = discoveryFilePath(process.argv.slice(2));
  } catch (failure) {
    const message = failure instanceof Error ? failure.message : 'Invalid arguments.';
    process.stderr.write(`${message}\n`);
    process.exitCode = 2;
    return;
  }
  const bridge = new AppBridge(
    dialerFromDiscovery(() => readFile(path, 'utf8'), scopeOf(process.argv.slice(2))),
  );
  const server = createBridgeServer(bridge);
  const leave = () => {
    void bridge.close().finally(() => process.exit(0));
  };
  process.on('SIGINT', leave);
  process.on('SIGTERM', leave);
  process.stdin.on('end', leave);
  await server.connect(new StdioServerTransport());
}

void main();
