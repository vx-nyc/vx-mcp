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
- **Built-in Retry** — Automatic retries with exponential backoff

## Quick Start

```bash
npx @vesselnyc/mcp-server
```

## Installation

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "vx": {
      "command": "npx",
      "args": ["-y", "@vesselnyc/mcp-server"],
      "env": {
        "VX_API_URL": "https://api.vessel.nyc",
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
      "VX_API_URL": "https://api.vessel.nyc",
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
        "VX_API_URL": "https://api.vessel.nyc",
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
| `vx_update` | Update an existing memory |
| `vx_query` | Semantic search across all memories |
| `vx_list` | List memories with filters |
| `vx_delete` | Remove a memory by ID |
| `vx_context` | Get relevant context for current conversation |

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `VX_API_URL` | Yes | Your VX instance URL | `https://api.vessel.nyc` |
| `VX_API_KEY` | Yes | Your API key | — |
| `VX_NAME` | No | Display name for the assistant | `VX` |
| `VX_SOURCE` | No | Source identifier | Auto-detected |

## Examples

### Store a Memory

Ask your AI: *"Remember that I prefer TypeScript over JavaScript"*

The AI will call `vx_store`:
```json
{
  "content": "User prefers TypeScript over JavaScript",
  "context": "preferences/coding",
  "memoryType": "SEMANTIC",
  "importance": 0.7
}
```

### Query Memories

Ask your AI: *"What are my coding preferences?"*

The AI will call `vx_query`:
```json
{
  "query": "coding preferences",
  "limit": 10
}
```

### Update a Memory

Ask your AI: *"Actually, update that preference — I now like both TypeScript and JavaScript"*

The AI will call `vx_update`:
```json
{
  "id": "mem_abc123",
  "content": "User likes both TypeScript and JavaScript"
}
```

### Delete a Memory

Ask your AI: *"Forget my preference about programming languages"*

The AI will call `vx_delete`:
```json
{
  "id": "mem_abc123"
}
```

### Get Context

The AI automatically retrieves relevant memories using `vx_context`:
```json
{
  "topic": "Help me write a React component",
  "maxTokens": 4000
}
```

## Memory Types

| Type | Use For | Examples |
|------|---------|----------|
| `SEMANTIC` | Facts, knowledge, information | "User lives in NYC", "Project uses React" |
| `EPISODIC` | Events, experiences | "User completed onboarding on Feb 24" |
| `PROCEDURAL` | How-to, processes | "To deploy: run npm build && npm publish" |

## Context Paths

Organize memories with context paths:

```
work/
  projects/
    project-a/
    project-b/
  preferences/
personal/
  health/
  hobbies/
```

Filter queries by context: `"query": "deadline", "context": "work/projects"`

## Programmatic Usage

You can also use the SDK programmatically:

```typescript
import { VXClient } from '@vesselnyc/mcp-server/client';
import type { Memory, MemoryType } from '@vesselnyc/mcp-server/types';

const client = new VXClient({
  apiUrl: 'https://api.vessel.nyc',
  apiKey: process.env.VX_API_KEY!,
});

// Store a memory
const memory = await client.store({
  content: 'User prefers dark mode',
  context: 'preferences/ui',
  memoryType: 'SEMANTIC',
  importance: 0.8,
});

// Query memories
const results = await client.query({
  query: 'ui preferences',
  limit: 5,
});

// Update a memory
await client.update({
  id: memory.id,
  importance: 0.9,
});

// List memories
const list = await client.list({
  context: 'preferences',
  limit: 20,
});

// Delete a memory
await client.delete(memory.id);

// Get context packet
const context = await client.getContextPacket({
  topic: 'What are the user preferences?',
  maxTokens: 4000,
});
```

## TypeScript Types

Full TypeScript support with exported types:

```typescript
import type {
  Memory,
  MemoryType,
  StoreMemoryInput,
  UpdateMemoryInput,
  QueryMemoriesInput,
  ListMemoriesInput,
  ContextPacketInput,
  QueryResult,
  ListResult,
  ContextPacketResult,
  VXError,
  VXErrorCode,
  VXClientConfig,
} from '@vesselnyc/mcp-server/types';
```

## Error Handling

The SDK provides structured errors:

```typescript
import { VXError } from '@vesselnyc/mcp-server/types';

try {
  await client.store({ content: '' });
} catch (error) {
  if (error instanceof VXError) {
    console.log(error.code);      // 'VALIDATION_ERROR'
    console.log(error.message);   // 'content cannot be empty'
    console.log(error.retryable); // false
  }
}
```

### Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| `VALIDATION_ERROR` | Invalid input | No |
| `UNAUTHORIZED` | Invalid API key | No |
| `NOT_FOUND` | Memory not found | No |
| `RATE_LIMITED` | Too many requests | Yes |
| `TIMEOUT` | Request timed out | Yes |
| `NETWORK_ERROR` | Connection failed | Yes |
| `SERVER_ERROR` | Server error (5xx) | Yes |

## Retry Logic

The SDK automatically retries failed requests with exponential backoff:

- Default: 3 retries
- Backoff: 1s → 2s → 4s
- Only retries: network errors, timeouts, 5xx, 429

Configure retries:

```typescript
const client = new VXClient({
  apiUrl: 'https://api.vessel.nyc',
  apiKey: 'your-key',
  maxRetries: 5,      // Max retry attempts
  retryDelay: 2000,   // Initial delay in ms
  timeout: 60000,     // Request timeout in ms
});
```

## Troubleshooting

### "VX_API_KEY is required"

Set the API key environment variable:

```bash
export VX_API_KEY=your-api-key
```

Or add it to your MCP server config's `env` section.

### "Invalid VX_API_URL"

The URL must be a valid HTTP(S) URL:
- ✅ `https://api.vessel.nyc`
- ✅ `http://localhost:3000`
- ❌ `api.vessel.nyc` (missing protocol)

### "UNAUTHORIZED" errors

1. Verify your API key is correct
2. Check if the key has expired
3. Ensure no extra whitespace in the key

### Connection timeouts

1. Check your network connection
2. Verify the API URL is reachable
3. Increase the timeout: `timeout: 60000`

### "NOT_FOUND" when deleting

The memory ID may be incorrect or already deleted. Use `vx_list` to find valid IDs.

### MCP server not starting

1. Check logs: `tail -f ~/.claude/mcp-logs/vx.log` (Claude Desktop)
2. Verify Node.js >= 18 is installed
3. Try running directly: `VX_API_KEY=xxx npx @vesselnyc/mcp-server`

## Testing

Run unit tests:

```bash
npm test
```

Run integration tests (requires API key):

```bash
VX_API_KEY=your-key npm run test:integration
```

## Get Your API Key

1. Sign up at [vessel.nyc](https://vessel.nyc)
2. Go to Settings → API Keys
3. Create a new key

## Links

- 🌐 [Website](https://vessel.nyc)
- 📖 [Documentation](https://docs.vessel.nyc)
- 💬 [Discord](https://discord.gg/vessel)
- 🐛 [Issues](https://github.com/vx-nyc/vx-mcp/issues)

## Contributing

Contributions welcome! Please read our [contributing guide](CONTRIBUTING.md).

## License

MIT © [Vessel Tech Inc](https://vessel.nyc)

---

<p align="center">
  <sub>Built with ❤️ by <a href="https://vessel.nyc">Vessel</a></sub>
</p>
