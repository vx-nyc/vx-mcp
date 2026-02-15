# @vesselnyc/mcp-server

[![npm version](https://img.shields.io/npm/v/@vesselnyc/mcp-server.svg)](https://www.npmjs.com/package/@vesselnyc/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Give your AI persistent memory. MCP server that connects Claude, Cursor, and other AI tools to VX.

## Quick Start

\`\`\`bash
npx @vesselnyc/mcp-server
\`\`\`

## Setup

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

\`\`\`json
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
\`\`\`

### Cursor / Windsurf / VS Code

Same format in your MCP settings.

## Tools

| Tool | Description |
|------|-------------|
| `vx_store` | Store a memory |
| `vx_query` | Search memories |
| `vx_list` | List memories |
| `vx_delete` | Delete by ID |
| `vx_context` | Get context packet |

## Get API Key

[vessel.nyc](https://vessel.nyc) → Settings → API Keys

## License

MIT © [Vessel Tech Inc](https://vessel.nyc)