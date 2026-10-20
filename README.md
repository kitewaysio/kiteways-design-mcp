# Kiteways Design for coding agents

This program connects Cursor, Claude, Codex, and any other MCP client to the Kiteways Design app on the same computer. The agent reads and edits the design file in that app. It does not keep a second copy.

The app must be open and you must be signed in. Each launch of the app picks its own local port and token. This program reads that address from the app's discovery file, then speaks MCP on standard input and output.

## Requirements

- [Kiteways Design](https://kiteways.design) for Mac, open and signed in
- Node.js 20 or newer

## Cursor

Add this to `~/.cursor/mcp.json`, or to `.cursor/mcp.json` in one project:

```json
{
  "mcpServers": {
    "kiteways-design": {
      "command": "npx",
      "args": ["-y", "github:kitewaysio/design-mcp"]
    }
  }
}
```

Reload Cursor. The server is named `kiteways-design`.

## Claude Code

```bash
claude mcp add kiteways-design -- npx -y github:kitewaysio/design-mcp
```

## Claude Desktop

In `~/Library/Application Support/Claude/claude_desktop_config.json` on Mac, or `%APPDATA%\Claude\claude_desktop_config.json` on Windows, add the same `mcpServers` entry as Cursor. Restart Claude.

## Codex

In `~/.codex/config.toml`:

```toml
[mcp_servers.kiteways-design]
command = "npx"
args = ["-y", "github:kitewaysio/design-mcp"]
```

## Any other MCP client

Start this command and speak MCP on its standard input and output:

```bash
npx -y github:kitewaysio/design-mcp
```

## Where the app is found

The app writes `mcp.json` when it starts and removes it when it quits. This program looks in these places, and uses the first file that exists:

| System  | Path                                                     |
| ------- | -------------------------------------------------------- |
| Mac     | `~/Library/Application Support/Kiteways Design/mcp.json` |
| Windows | `%APPDATA%\Kiteways Design\mcp.json`                     |
| Linux   | `~/.config/Kiteways Design/mcp.json`                     |

The trial build uses `Kiteways Design Trial` in that same path. To point at a different file:

```bash
npx -y github:kitewaysio/design-mcp --discovery "/path/to/mcp.json"
```

or set `KITEWAYS_DESIGN_MCP_DISCOVERY` to that path.

## Using it

Ask the agent to design in a Kiteways file. It lists the files you can open, reads the design system, and draws with those tokens. A write names the file. The app shows the result in the open window.

If the app is closed, or you are signed out, the call fails and nothing is written. Open the app and try again.

The tool list comes from the running app, so it matches the version you have installed.

## What is in this repository

`dist/cli.js` is the program the install command runs. It is committed so an agent does not have to build it. `src` is the source of that program. `bun.lock` pins the packages used to produce `dist`. `node_modules` is not committed.
