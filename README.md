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
      "args": ["-y", "github:kitewaysio/kiteways-design-mcp#v0.14.0"]
    }
  }
}
```

Reload Cursor. The server is named `kiteways-design`.

## Claude Code

```bash
claude mcp add kiteways-design -- npx -y github:kitewaysio/kiteways-design-mcp#v0.14.0
```

## Claude Desktop

In `~/Library/Application Support/Claude/claude_desktop_config.json` on Mac, or `%APPDATA%\Claude\claude_desktop_config.json` on Windows, add the same `mcpServers` entry as Cursor. Restart Claude.

## Codex

In `~/.codex/config.toml`:

```toml
[mcp_servers.kiteways-design]
command = "npx"
args = ["-y", "github:kitewaysio/kiteways-design-mcp#v0.14.0"]
```

## Any other MCP client

Start this command and speak MCP on its standard input and output:

```bash
npx -y github:kitewaysio/kiteways-design-mcp#v0.14.0
```

## The version in these commands

Every command above ends in `#v0.14.0`: it installs that one released version, not whatever was pushed last. An agent starts this program each time a chat begins, with the app's local address and token in reach, so it must never run code that changed since you added it. To move to a newer version, change the number yourself after reading its release notes. Do not remove `#v…`.

## Where the app is found

The app writes `mcp.json` when it starts and removes it when it quits. If the app stopped without removing it, this program notices: it connects only when the process that wrote the file is still running and what answers on that port proves it holds the file's token. The token itself is not sent until that proof has been checked. This program looks in these places, and uses the first file that exists:

| System  | Path                                                     |
| ------- | -------------------------------------------------------- |
| Mac     | `~/Library/Application Support/Kiteways Design/mcp.json` |
| Windows | `%APPDATA%\Kiteways Design\mcp.json`                     |
| Linux   | `~/.config/Kiteways Design/mcp.json`                     |

The trial build uses `Kiteways Design Trial` in that same path. To point at a different file:

```bash
npx -y github:kitewaysio/kiteways-design-mcp#v0.14.0 --discovery "/path/to/mcp.json"
```

or set `KITEWAYS_DESIGN_MCP_DISCOVERY` to that path.

## Using it

Ask the agent to design in a Kiteways file. It lists the files you can open, reads the design system, and draws with those tokens. A write names the file. The app shows the result in the open window.

If the app is closed, or you are signed out, the call fails and nothing is written. Open the app and try again.

The tool list comes from the running app, so it matches the version you have installed.

## What is in this repository

`dist/cli.js` is the program the install command runs. It is committed so an agent does not have to build it. `src` is the source of that program. `bun.lock` pins the packages used to produce `dist`. `node_modules` is not committed.

## Limit a connection

The best limit is made in the app: open the agent panel, then Agent settings, then add a connection. Give it a name and choose what it reaches (this file, its project, its team, or everything). The app shows a snippet to paste into your agent. It sets `KITEWAYS_DESIGN_MCP_TOKEN`, a token the app holds to that reach whatever the agent sends. Remove the connection in the same place and the token stops working.

If `KITEWAYS_DESIGN_MCP_TOKEN` is set and is not a connection token, the program stops with a message. It never connects with wider access instead.

### Without a connection

By default a connection reaches every file you can. To limit one to a file, a project or a team, add `--scope` when you add it:

```bash
npx -y github:kitewaysio/kiteways-design-mcp#v0.14.0 --discovery "/path/to/mcp.json" --scope project:<id>
```

`--scope` takes `file:<id>`, `project:<id>` or `team:<id>`. You can also set `KITEWAYS_DESIGN_MCP_SCOPE`. An agent cannot change it.

A limit that cannot be read is never taken as no limit. If `--scope` has nothing after it, or a value that is not one of the three forms, the program stops with a message and does not connect.
