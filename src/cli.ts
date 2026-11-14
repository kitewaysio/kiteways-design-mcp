import { readFile } from 'node:fs/promises';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { AppBridge, createBridgeServer, dialerFromDiscovery } from './bridge.ts';
import { discoveryFilePath } from './discovery.ts';
import { connectionTokenOf, scopeArgumentOf } from './scope.ts';

async function main(): Promise<void> {
  let path: string;
  let scope: string | undefined;
  let connectionToken: string | undefined;
  try {
    path = discoveryFilePath(process.argv.slice(2));
    // a limit that cannot be read is never taken as no limit: the program does not start
    scope = scopeArgumentOf(process.argv.slice(2), process.env);
    connectionToken = connectionTokenOf(process.env);
  } catch (failure) {
    const message = failure instanceof Error ? failure.message : 'Invalid arguments.';
    process.stderr.write(`${message}\n`);
    process.exitCode = 2;
    return;
  }
  const bridge = new AppBridge(
    dialerFromDiscovery(() => readFile(path, 'utf8'), scope, connectionToken),
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
