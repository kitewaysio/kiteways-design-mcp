import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const FLAG = '--discovery';
const VARIABLE = 'KITEWAYS_DESIGN_MCP_DISCOVERY';

/** The discovery file for this process: an override, or the app data file that exists. */
export function discoveryFilePath(argumentList: readonly string[]): string {
  const override = overridePath(argumentList);
  if (override) return override;
  const candidates = defaultPaths();
  return candidates.find((path) => existsSync(path)) ?? candidates[0];
}

function overridePath(argumentList: readonly string[]): string | null {
  const flagAt = argumentList.indexOf(FLAG);
  if (flagAt === -1) return process.env[VARIABLE] ?? null;
  const value = argumentList[flagAt + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`usage: kiteways-design-mcp [${FLAG} <path>]`);
  }
  return value;
}

function defaultPaths(): string[] {
  const home = homedir();
  const names = ['Kiteways Design', 'Kiteways Design Trial'];
  if (process.platform === 'darwin') {
    return names.map((name) => join(home, 'Library', 'Application Support', name, 'mcp.json'));
  }
  if (process.platform === 'win32') {
    const root = process.env.APPDATA ?? join(home, 'AppData', 'Roaming');
    return names.map((name) => join(root, name, 'mcp.json'));
  }
  const root = process.env.XDG_CONFIG_HOME ?? join(home, '.config');
  return names.map((name) => join(root, name, 'mcp.json'));
}
