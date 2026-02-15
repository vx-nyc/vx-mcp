# @vesselnyc/mcp-server

[![npm version](https://img.shields.io/npm/v/@vesselnyc/mcp-server.svg)](https://www.npmjs.com/package/@vesselnyc/mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/@vesselnyc/mcp-server.svg)](https://www.npmjs.com/package/@vesselnyc/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Give your AI persistent memory.** MCP server that connects Claude, Cursor, Windsurf, and VS Code to VX — your personal knowledge layer.

> 🧠 Your AI forgets everything after each conversation. VX remembers.

## Why VX?

- **Persistent Memory** — Information survives across sessions
- **Semantic Search** — Find relevant context automatically  
- **Works Everywhere** — Claude Desktop, Cursor, Windsurf, VS Code + Continue
- **Your Data** — Self-host or use our cloud

## Quick Start

```bash
npx @vesselnyc/mcp-server
```

## Installation

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "vx": {
      "command": "npx",
      "args": ["-y", "@vesselnyc/mcp-server"],
      "env": {
        "VX_API_URL": "https://your-instance.com",
        "VX_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Cursor

Settings → MCP Servers → Add:

```json
{
  "vx": {
    "command": "npx",
    "args": ["-y", "@vesselnyc/mcp-server"],
    "env": {
      "VX_API_URL": "https://your-instance.com",
      "VX_API_KEY": "your-api-key"
    }
  }
}
```

### Windsurf

Preferences → MCP Configuration → Add same config as above.

### VS Code + Continue

Add to your Continue config (`~/.continue/config.json`):

```json
{
  "mcpServers": {
    "vx": {
      "command": "npx",
      "args": ["-y", "@vesselnyc/mcp-server"],
      "env": {
        "VX_API_URL": "https://your-instance.com",
        "VX_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `vx_store` | Store information as a memory |
| `vx_query` | Semantic search across all memories |
| `vx_list` | List memories with filters |
| `vx_delete` | Remove a memory by ID |
| `vx_context` | Get relevant context for current conversation |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VX_API_URL` | Yes | Your VX instance URL |
| `VX_API_KEY` | Yes | Your API key |

## Get Your API Key

1. Sign up at [vessel.nyc](https://vessel.nyc)
2. Go to Settings → API Keys
3. Create a new key

## Examples

### Store a memory

Ask your AI: *"Remember that I prefer TypeScript over JavaScript"*

### Query memories

Ask your AI: *"What are my coding preferences?"*

### Get context

The AI automatically retrieves relevant memories for each conversation.

## Links

- 🌐 [Website](https://vessel.nyc)
- 📖 [Documentation](https://docs.vessel.nyc)
- 💬 [Discord](https://discord.gg/vessel)
- 🐛 [Issues](https://github.com/vx-nyc/vx-mcp/issues)

## License

MIT © [Vessel Tech Inc](https://vessel.nyc)

---

<p align="center">
  <sub>Built with ❤️ by <a href="https://vessel.nyc">Vessel</a></sub>
</p>
