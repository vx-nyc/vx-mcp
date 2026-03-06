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

**Important:** Use the package name `@vesselnyc/mcp-server` (not `@vx/mcp-server`). This server requires **Node.js 18+**. If your MCP host (Claude, Cursor, etc.) uses an older Node, set your **default Node to 18+** so `npx` uses it — no path needed:

```bash
nvm alias default 22    # or 18, 20 — then restart the MCP host
```

If you see "You must supply a command" or a version error in the log, see the [troubleshooting](#claude-desktop-you-must-supply-a-command-or-server-exits-immediately) section.

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

**If Cursor isn’t saving or retrieving memories** (e.g. Cloud works but Cursor doesn’t), point Cursor at the same custodian and source:

- Set **`VX_SOURCE=cursor`** so the server uses Cursor-specific tool descriptions and tags stored memories with `source: cursor`.
- If you use the **local test user**, set **`VX_CUSTODIAN_ID=vxtestuserlocal0000000000000`** so the SDK sends the same custodian as your local API (same as Cloud when using the same token).  
- Restart Cursor (or reload the MCP server) after changing the env.

Example for **local API** with test user:

```json
{
  "vx": {
    "command": "/path/to/node",
    "args": ["/path/to/vx-mcp/dist/index.js"],
    "env": {
      "VX_API_BASE_URL": "http://127.0.0.1:3000/v1",
      "VX_BEARER_TOKEN": "vx_test_local_00000000000000000000000000000000",
      "VX_SOURCE": "cursor",
      "VX_CUSTODIAN_ID": "vxtestuserlocal0000000000000"
    }
  }
}
```

#### Cursor UI: "Connect to a custom MCP"

If you add VX via **Settings → MCP → Add** (or "Connect to a custom MCP"), fill the form as follows:

| Field | Value |
|-------|--------|
| **Name** | `VX` (or any label you prefer) |
| **Connection type** | **STDIO** (not Streamable HTTP unless you run the server in HTTP mode) |
| **Command to launch** | Full path to Node 18+ (e.g. `/Users/you/.nvm/versions/node/v22.22.0/bin/node` or `node` if it’s on PATH) |
| **Arguments** | Path to the built server entrypoint, e.g. `/path/to/vx-mcp/dist/index.js`. Add one argument; use your actual `vx-mcp` path. |
| **Environment variables** | Add each of these (required for local API + Cursor memory): `VX_API_BASE_URL`, `VX_BEARER_TOKEN`, `VX_SOURCE`, `VX_CUSTODIAN_ID` — see the JSON example above for values. |
| **Environment variable passthrough** | Optional; leave empty unless you want to pass through specific vars from your shell. |
| **Working directory** | Optional. Project root (e.g. where your `mcp.json` lives) or leave default; avoid a directory that might change the resolution of the path in Arguments. |

**Build the server first** so `dist/index.js` exists: from the vx-mcp repo run `npm run build`. Then restart Cursor (or reload the window) after saving the MCP config so the VX server reconnects.

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
| `vx_recall` | Hybrid (semantic + keyword) retrieval tuned for recommendations and identity-style queries |
| `vx_list` | List memories with filters (built on a wildcard query) |
| `vx_delete` | Remove a memory by ID |
| `vx_context` | Get relevant context for current conversation as a formatted packet |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VX_API_BASE_URL` | No | VX API base URL including `/v1` (e.g. `https://api.vx.dev/v1`). If not set, falls back to `VX_API_URL` or `https://api.vx.dev/v1`. |
| `VX_API_URL` | No | Backwards-compatible base URL without `/v1` (e.g. `https://your-instance.com`). Prefer `VX_API_BASE_URL` for new setups. |
| `VX_API_KEY` | No | Your VX API key (sent as `X-API-Key`). Required if `VX_BEARER_TOKEN` is not set. |
| `VX_BEARER_TOKEN` | No | Optional bearer token sent as `Authorization: Bearer ...`. Used as an alternative to `VX_API_KEY`. |
| `VX_MCP_STORE_ON_REQUEST_ONLY` | No | Set to `1` or `true` to only store when the user explicitly asks to remember something. Default: unset — the AI is instructed to call `vx_store` for every user message related to memory (anything they might want recalled). |
| `VX_CUSTODIAN_ID` | No | Optional custodian identifier forwarded as `X-Custodian-Id` for multi-tenant setups. |
| `VX_NAME` | No | Friendly name shown in MCP responses (default: `VX`). |
| `VX_SOURCE` | No | **Source tag for the MCP server.** Set this to signal which client or integration is using the server (e.g. `cursor`, `windsurf`, `claude`, `vscode`, or a custom label). When set, it overrides auto-detection. The value is included in stored memory metadata and used for tool descriptions. Useful when running in a public repo or multi-client setup. |
| `VX_MCP_TRANSPORT` | No | Transport mode: `stdio` (default) or `http`. Use `http` when your client connects by URL. |
| `VX_MCP_HTTP_PORT` | No | When `VX_MCP_TRANSPORT=http`, port to listen on (default: `3100`). |
| `VX_MCP_HTTP_HOST` | No | When `VX_MCP_TRANSPORT=http`, host to bind (default: `127.0.0.1`). Use `0.0.0.0` to accept connections from other devices on the same network (e.g. same WiFi). |
| `VX_MCP_HTTPS` | No | When `VX_MCP_TRANSPORT=http`, set to `1` or `true` to serve over HTTPS (requires `VX_MCP_HTTPS_KEY_PATH` and `VX_MCP_HTTPS_CERT_PATH`). Use when the client requires **https** URLs. |
| `VX_MCP_HTTPS_KEY_PATH` | No | Path to TLS private key file (PEM). Used when `VX_MCP_HTTPS` is enabled. |
| `VX_MCP_HTTPS_CERT_PATH` | No | Path to TLS certificate file (PEM). Used when `VX_MCP_HTTPS` is enabled. |
| `VX_MCP_OAUTH_CLIENT_ID` | No | Optional. When both this and `VX_MCP_OAUTH_CLIENT_SECRET` are set, HTTP/HTTPS requests must send matching credentials (Basic auth or `X-OAuth-Client-Id` / `X-OAuth-Client-Secret` headers). Use the same values in your MCP client’s “OAuth Client ID” and “OAuth Client Secret” fields to secure the connection. |
| `VX_MCP_OAUTH_CLIENT_SECRET` | No | Optional. See `VX_MCP_OAUTH_CLIENT_ID`. |

## Get Your API Key

1. Sign up at [vessel.nyc](https://vessel.nyc)
2. Go to Settings → API Keys
3. Create a new key

## Local development & E2E tests

When you run the **real** VX API locally (with a local database and `NODE_ENV=development`), the server automatically seeds a **test user** so you don’t need to call register. Use the same credentials everywhere (env files, E2E, MCP):

- **Email:** `test@vx.dev`
- **VX API key / Bearer token:** `vx_test_local_00000000000000000000000000000000`

**Public repo / no secrets:** `test/.env.e2e` and `.env` are gitignored. Copy `test/.env.e2e.example` to `test/.env.e2e` and add credentials locally; never commit real API keys or bearer tokens. Run `npm run check:secrets` before pushing to confirm no credential files are tracked.

**Same-WiFi / other device:** Use your **machine’s LAN IP** (not `localhost`) so phones/other computers can reach the server. Replace with your actual IP:

| Use | Full URL |
|-----|----------|
| VX API base | `http://YOUR_DEVICE_IP:3000/v1` |
| MCP server (for Claude/ChatGPT by URL) | `http://YOUR_DEVICE_IP:3100` |
| Test token | `vx_test_local_00000000000000000000000000000000` |

**Claude Desktop (stdio):** If `localhost` in `VX_API_BASE_URL` fails to connect, use `http://127.0.0.1:3000/v1` instead.

**Find your device IP:** macOS: `ipconfig getifaddr en0` (WiFi) or System Settings → Network. Windows: `ipconfig`. Linux: `ip addr` or `hostname -I`. Example: if the command returns `192.168.1.10`, then VX API = `http://192.168.1.10:3000/v1` and MCP = `http://192.168.1.10:3100`.

Seeding runs only when:

- `NODE_ENV` is not `production`
- `DATABASE_URL` points to a local DB (localhost, 127.0.0.1, or \`.local\`)
- `VX_SEED_TEST_USER=true` **or** `NODE_ENV=development`

From the **vx** repo (api folder), start the API with a local DB:

```bash
cd vx/api && npm run dev
```

When using **VX via Docker Compose** (e.g. `docker-compose --profile dev up -d`), the API is on the host at port 3000 (or `VX_PORT`). Use the same test token with:

```bash
VX_API_BASE_URL=http://localhost:3000/v1 VX_BEARER_TOKEN=vx_test_local_00000000000000000000000000000000 npm run test:e2e
```

`test/.env.e2e` is not committed (gitignored). Copy `test/.env.e2e.example` to `test/.env.e2e` and set `VX_API_BASE_URL`, `VX_BEARER_TOKEN`, and `VX_API_KEY` for the real API (e.g. Compose or `npm run dev` in vx/api).

From **vx-mcp**, run E2E using the test user. The e2e script loads `test/.env.e2e` automatically if no auth env is set. E2E runs **only against a real VX API**; if `VX_BEARER_TOKEN`/`VX_API_KEY` are unset or the API is unreachable, the script skips and exits 0.

```bash
npm run build && npm run test:e2e
```

Or set env explicitly:

```bash
VX_API_BASE_URL=http://localhost:3000/v1 VX_BEARER_TOKEN=vx_test_local_00000000000000000000000000000000 npm run test:e2e
```

## Local testing: Claude + OpenAI continuity

You can use the same VX memory layer from **Claude** and **OpenAI (ChatGPT)** so that you start a conversation in one and continue it in the other. User identity is determined **only by your token** (`VX_BEARER_TOKEN` or `VX_API_KEY`). Use the same token in both apps so they see the same memories; there is no requirement to use the same API endpoint (e.g. horizontal scaling is fine).

### 1. Start VX API locally

- **Docker Compose (dev profile):** `cd vx && docker compose --profile dev up -d` — API on port 3000, test user seeded.
- **Direct run:** `cd vx/api && npm run dev` with `DATABASE_URL` pointing at local Postgres; ensure the test user is seeded (`NODE_ENV=development` or `VX_SEED_TEST_USER=true`).

### 2. Use the same credentials for both apps

Set the **same** `VX_API_BASE_URL` and `VX_BEARER_TOKEN` (or `VX_API_KEY`) in both Claude and ChatGPT MCP configs so they share one VX user and memory namespace.

### 3. Claude Desktop

In `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS), add the vx MCP server with env:

```json
{
  "mcpServers": {
    "vx": {
      "command": "npx",
      "args": ["-y", "@vesselnyc/mcp-server"],
      "env": {
        "VX_API_BASE_URL": "http://localhost:3000/v1",
        "VX_BEARER_TOKEN": "vx_test_local_00000000000000000000000000000000"
      }
    }
  }
}
```

(Use your own key in production.)

### 4. ChatGPT (MCP apps / developer mode)

If ChatGPT uses **stdio** (spawns the server): use the same config as Claude — command `npx`, args `["-y", "@vesselnyc/mcp-server"]`, and the same env (`VX_API_BASE_URL`, `VX_BEARER_TOKEN` or `VX_API_KEY`).

If your client requires a **URL** instead of stdio: run the MCP server in HTTP mode (see [Optional: HTTP transport](#optional-http-transport) below) and point the client at `http://localhost:3100` (or the port you set).

### 5. Test continuity

1. In **Claude**, ask it to remember something specific (e.g. *"Remember: we're testing continuity; the secret code is ABC123"*).
2. In **ChatGPT**, ask *"What's the secret code we discussed?"* — the model should use `vx_query` or `vx_context` to recall it.
3. All data stays in your local VX database.

You can also run the programmatic continuity test: `npm run test:continuity` (see [Continuity test script](#continuity-test-script) below).

### Optional: HTTP transport

If your MCP host only supports connecting to an MCP server by URL (e.g. some ChatGPT setups), run the server in HTTP mode:

```bash
VX_MCP_TRANSPORT=http VX_MCP_HTTP_PORT=3100 npx @vesselnyc/mcp-server
```

Then point the client at `http://localhost:3100` (or the path required by the MCP Streamable HTTP spec). By default the server binds to `127.0.0.1` (local use only).

### Test MCP with SSL (ready to use)

When the client requires **https** (e.g. "URL must start with https"):

1. **Generate certificates** (first time only; certs are gitignored):

   ```bash
   cd vx-mcp && npm run generate-certs
   ```

2. **Build and start the MCP server over HTTPS:**

   ```bash
   npm run build && npm run start:https
   ```

3. **In your MCP client** use:

   | Field | Value |
   |-------|--------|
   | **Server URL** | `https://localhost:3100` |
   | **OAuth Client ID** (if prompted) | `vx-mcp-demo` |
   | **OAuth Client Secret** (if prompted) | `demo-secret-change-me` |

   From another device on the same WiFi, use `https://YOUR_DEVICE_IP:3100` (find IP with `ipconfig getifaddr en0` on macOS). Accept the self-signed certificate warning in the client if shown.

4. **VX API:** Ensure the VX API is running (e.g. `cd vx && docker compose --profile dev up -d` or `cd vx/api && npm run dev`). `start:https` uses the local test token by default (`VX_BEARER_TOKEN=vx_test_local_...`).

Some MCP clients (e.g. certain ChatGPT or web-based setups) only accept **https** URLs. You have two options:

**Option A: Tunnel (easiest, no certs)**  
Expose your local MCP server with a public HTTPS URL, then use that URL in the client.

- **ngrok:** `ngrok http 3100` → use the `https://…` URL it prints (e.g. `https://abc123.ngrok.io`).
- **Cloudflare Tunnel:** `cloudflared tunnel --url http://localhost:3100` → use the `https://…` URL it prints.

**Option B: HTTPS with a self-signed certificate**  
Use the [Test MCP with SSL](#test-mcp-with-ssl-ready-to-use) steps above (`npm run generate-certs` then `npm run start:https`). For manual cert generation with a custom LAN IP:

1. Generate a key and certificate (one-liner, valid 365 days):

   ```bash
   openssl req -x509 -newkey rsa:2048 -keyout mcp-key.pem -out mcp-cert.pem -days 365 -nodes -subj "/CN=localhost" -addext "subjectAltName=IP:127.0.0.1,IP:YOUR_LAN_IP,DNS:localhost"
   ```

   For same-WiFi from other devices, use your machine’s hostname or LAN IP as CN, or add SANs (e.g. `-addext "subjectAltName=IP:192.168.1.10,DNS:localhost"`).

2. Start the server with HTTPS:

   ```bash
   VX_MCP_TRANSPORT=http VX_MCP_HTTPS=1 \
   VX_MCP_HTTPS_KEY_PATH=./certs/mcp-key.pem VX_MCP_HTTPS_CERT_PATH=./certs/mcp-cert.pem \
   VX_MCP_HTTP_HOST=0.0.0.0 VX_MCP_HTTP_PORT=3100 \
   VX_API_BASE_URL=http://localhost:3000/v1 VX_BEARER_TOKEN=your-token \
   npx @vesselnyc/mcp-server
   ```

3. In the client, use `https://localhost:3100` (or `https://YOUR_DEVICE_IP:3100` from another device). If the client warns about the certificate, accept/trust it for this host.

### Optional: OAuth Client ID & Secret (secure who can connect)

If your MCP client has **“OAuth Client ID (optional)”** and **“OAuth Client Secret (optional)”** fields, you can use them so only clients that know the same ID and secret can use your MCP server.

**Demo values** (used by `npm run start:https`; change in production):

| Field | Demo value |
|-------|------------|
| OAuth Client ID | `vx-mcp-demo` |
| OAuth Client Secret | `demo-secret-change-me` |

1. **On the server**, set both when starting (e.g. in the same command as HTTPS):

   ```bash
   VX_MCP_OAUTH_CLIENT_ID=vx-mcp-demo \
   VX_MCP_OAUTH_CLIENT_SECRET=demo-secret-change-me \
   # ... plus VX_MCP_TRANSPORT=http, HTTPS options if needed, VX_API_BASE_URL, VX_BEARER_TOKEN
   npx @vesselnyc/mcp-server
   ```

   Pick a Client ID and a strong Client Secret for production; keep the secret private.

2. **In the client UI**, enter the **same** values:
   - **OAuth Client ID (optional):** `vx-mcp-demo` (or your own)
   - **OAuth Client Secret (optional):** `demo-secret-change-me` (or your own)

   If the client has a single **Bearer token** or **API key** field, you can put the **OAuth Client Secret** there; the server accepts `Authorization: Bearer <secret>`.

The server will accept requests only when they send matching credentials (via Basic auth or `X-OAuth-Client-Id` / `X-OAuth-Client-Secret` headers). If you don’t set these env vars, the server does not require OAuth and any client that can reach the URL can connect.

### Same WiFi / multi-device (Claude + ChatGPT on another device)

You can run the MCP server on one machine and connect **Claude** and **ChatGPT** from another device on the same WiFi (e.g. phone, tablet, or another computer). Both apps will share the same VX memory as long as they use the same MCP server URL and the same VX token.

1. **On the machine that will run the MCP server** (and ideally the VX API):
   - Start the VX API (Docker Compose or `npm run dev` in vx/api) so it is reachable at a URL. For other devices to use it, either:
     - Run the API on that machine and have devices use that machine’s LAN IP (e.g. `http://192.168.1.10:3000/v1`), or
     - Use a cloud VX instance and set `VX_API_BASE_URL` to that URL.
   - Start the MCP server in HTTP mode, bound to all interfaces so the LAN can connect. If the VX API runs on this same machine, use `http://localhost:3000/v1` for `VX_API_BASE_URL`; if the API is on another host, use that host’s URL:
     ```bash
     VX_MCP_TRANSPORT=http VX_MCP_HTTP_HOST=0.0.0.0 VX_MCP_HTTP_PORT=3100 \
     VX_API_BASE_URL=http://localhost:3000/v1 \
     VX_BEARER_TOKEN=vx_test_local_00000000000000000000000000000000 \
     npx @vesselnyc/mcp-server
     ```
     To find this machine’s IP (for the other device to connect to MCP): `ipconfig getifaddr en0` (macOS WiFi) or System Settings → Network. Example: if you get `192.168.1.10`, the other device should use MCP URL `http://192.168.1.10:3100`.

2. **On the other device** (or the same machine):
   - Configure Claude and/or ChatGPT to use the MCP server **by URL**: `http://YOUR_DEVICE_IP:3100` — use the **same** IP as the machine running the MCP server (e.g. `192.168.1.10`). The MCP server holds the token; you don’t need to set it again on the device.

3. **Firewall**: Ensure the machine running the MCP server allows inbound TCP on port 3100 (and 3000 if devices hit the VX API directly). On a home WiFi this is usually allowed by default.

Result: Claude and ChatGPT on the other device both talk to your local MCP server and share the same VX memory; you can start a conversation in one and continue in the other.

### Continuity test script

To verify cross-client continuity without using the UIs, run:

```bash
npm run test:continuity
```

This spawns two MCP client processes (same token): the first stores a unique memory, the second queries and asserts it is found. Requires a running local VX API and credentials (e.g. in `test/.env.e2e` after copying from `test/.env.e2e.example`). If credentials or API are missing, the script skips and exits 0.

## Troubleshooting

### Claude Desktop: "You must supply a command" or server exits immediately

- **Wrong package name:** The config must use `@vesselnyc/mcp-server`, not `@vx/mcp-server`. Check your MCP config and fix the `args` to `["-y", "@vesselnyc/mcp-server"]`.
- **Old Node (e.g. 12):** The host app may run `npx` with the first Node in PATH. This server requires **Node 18+** and will exit with a clear message if run on an older Node.
  - **Fix without setting a path:** Set your default Node to 18+ so the host’s `npx` uses it:  
    `nvm alias default 22` (or `nvm use 22` and make it default). Then restart Claude Desktop / Cursor / etc. No need to edit the MCP config.
  - **Fix with explicit path:** If you can’t change the default Node, use the direct Node + script form (replace with your Node 18+ path and project path):

```json
"vx": {
  "command": "/Users/ac/.nvm/versions/node/v22.22.0/bin/node",
  "args": ["/Users/ac/Documents/VX/vx-mcp/dist/index.js"],
  "env": {
    "VX_API_BASE_URL": "http://127.0.0.1:3000/v1",
    "VX_BEARER_TOKEN": "vx_test_local_00000000000000000000000000000000"
  }
}
```

Run `cd /Users/ac/Documents/VX/vx-mcp && npm run build` once so `dist/index.js` exists. Then restart Claude Desktop.

### Cursor: "VX MCP server isn't available in this session"

If the agent (or you) see only `plugin-*` MCP servers and **"vx" is not in the list**, the VX client was likely **disconnected after a config change** and not restarted.

- **What the logs show:** In Cursor’s MCP log (`.../anysphere.cursor-mcp/MCP project-0-vx-vx.log`) you may see:
  - `Handling DeleteClient action, reason: config_server_modified`
  - `Cleaning up, reason: config_server_modified`
  That means Cursor **tore down** the VX MCP client when `mcp.json` was edited (e.g. when we added `VX_SOURCE` / `VX_CUSTODIAN_ID`) and did **not** automatically reconnect it in the current session.
- **Fix:** **Restart Cursor** (quit and reopen), or use **Developer: Reload Window** so Cursor re-reads `mcp.json` and starts the VX server again. After that, the "vx" server should appear for the agent. No change to your config is required; it just needs a fresh connection.

### VX not showing in MCP shortcuts / tools list

There is **no separate “MCP shortcuts” configuration**. The shortcuts (or tools list) are filled from whatever MCP servers are connected. If VX doesn’t appear there, the server isn’t connected or isn’t starting.

**Cursor**

- **Config location:** Cursor can ignore project-level `.cursor/mcp.json`. Use **global** config so the server always loads: `~/.cursor/mcp.json`. Put the same `mcpServers.vx` block there (command, args, env). If you keep project-only config, open the project that contains `.cursor/mcp.json` and restart Cursor from that workspace.
- **Where to look:** Open **Settings** (Cmd+Shift+J) → **Tools & MCP**. VX should appear in the list; turn its toggle **on**. The tools list at the top of the chat panel shows tools from servers that are connected and enabled.
- **Restart:** After adding or changing `mcp.json`, **fully quit and reopen Cursor** (not just Reload Window). Config is read at startup.
- **Build:** If you use the local path to `vx-mcp/dist/index.js`, run `cd /path/to/vx-mcp && npm run build` so `dist/index.js` exists.
- **Logs:** **Output** (Cmd+Shift+U) → **MCP Logs**. If VX fails to start, you’ll see errors (e.g. missing file, Node version, or env). Fix those and restart.

**Codex**

- **Config:** Codex uses **`~/.codex/config.toml`** only (it does not use Cursor’s `mcp.json`). Ensure a `[mcp_servers.vx]` block with `command`, `args`, and `[mcp_servers.vx.env]` is present. See the [Cursor](#cursor) section above for the same env vars (e.g. `VX_API_BASE_URL`, `VX_BEARER_TOKEN`, `VX_SOURCE`, `VX_CUSTODIAN_ID`).
- **Where to look:** **Settings** (Cmd+,) → **Integrations & MCP**. VX should be listed there. In the CLI TUI, type **`/mcp`** to see configured MCP servers.
- **Restart:** After editing `config.toml`, **restart the Codex app** (or reload the window) so it reloads config and starts VX.
- **Build:** If `args` point at `vx-mcp/dist/index.js`, run `npm run build` in the vx-mcp repo first.

**Both**

- Avoid **spaces in paths** (e.g. in `command` or `args`); some hosts misbehave when paths contain spaces.
- Ensure **Node 18+** is used to run the server (e.g. set `nvm alias default 22` or use a full path to a Node 18+ binary in `command`).

### "There was an error connecting to the MCP server. Please check your server URL and make sure your server handles auth correctly."

- **Server URL:** Use the exact URL where the MCP server is running. For local HTTPS: `https://localhost:3100`. From another device on WiFi: `https://YOUR_DEVICE_IP:3100` (no path; the client may append `/message` or similar).
- **Server running:** Start the server with `npm run build && npm run start:https` (from the vx-mcp folder). Ensure nothing else is using port 3100.
- **HTTPS:** The URL must be `https://` if your client rejects plain HTTP. Use Option B (certs in `certs/`) or a tunnel.
- **Auth:** If you set `VX_MCP_OAUTH_CLIENT_ID` and `VX_MCP_OAUTH_CLIENT_SECRET`, the client must send matching credentials. The server accepts:
  - **Authorization: Bearer &lt;secret&gt;** — use the OAuth Client Secret as the token (e.g. `demo-secret-change-me` for the demo).
  - **Authorization: Basic base64(client_id:client_secret)**
  - **Headers:** `X-OAuth-Client-Id` and `X-OAuth-Client-Secret`
  If the connector has a single "Bearer token" or "API key" field, put the **OAuth Client Secret** there.
- **Certificate:** For self-signed HTTPS, the client may show a warning; accept/trust the certificate for the host you’re using.

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
