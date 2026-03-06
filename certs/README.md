# MCP HTTPS certificates (Option B)

Self-signed key and cert for running the VX MCP server over HTTPS when the client requires `https` URLs.

- **mcp-key.pem** — private key (gitignored)
- **mcp-cert.pem** — certificate (gitignored)

**Generate certs:** From repo root run `npm run generate-certs`. Creates key and cert here with SANs for localhost and (on macOS) LAN IP.

Generated with SANs for `localhost`, `127.0.0.1`, and `192.168.50.187` so it works locally and from another device on your WiFi.

To regenerate (e.g. for a different LAN IP or after expiry):

```bash
openssl req -x509 -newkey rsa:2048 -keyout mcp-key.pem -out mcp-cert.pem -days 365 -nodes \
  -subj "/CN=localhost" -addext "subjectAltName=IP:127.0.0.1,IP:YOUR_LAN_IP,DNS:localhost"
```

Replace `YOUR_LAN_IP` with your machine’s IP (e.g. from `ipconfig getifaddr en0` on macOS).

Run the server with HTTPS:

```bash
npm run build && npm run start:https
```

**Demo OAuth** (for the client’s “OAuth Client ID” / “OAuth Client Secret” fields):

- **OAuth Client ID:** `vx-mcp-demo`
- **OAuth Client Secret:** `demo-secret-change-me`

Then use **https://localhost:3100** or **https://192.168.50.187:3100** in your MCP client.
