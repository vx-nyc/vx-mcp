#!/usr/bin/env bash
# Generate self-signed TLS key and cert for VX MCP server (HTTPS).
# Writes certs/mcp-key.pem and certs/mcp-cert.pem. Safe to re-run.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/certs"
KEY="$CERTS_DIR/mcp-key.pem"
CERT="$CERTS_DIR/mcp-cert.pem"

mkdir -p "$CERTS_DIR"

# Optional: add LAN IP to SAN for same-WiFi access (macOS)
SAN="IP:127.0.0.1,DNS:localhost"
if command -v ipconfig >/dev/null 2>&1; then
  LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || true)
  if [ -n "$LAN_IP" ]; then
    SAN="${SAN},IP:${LAN_IP}"
  fi
fi

openssl req -x509 -newkey rsa:2048 \
  -keyout "$KEY" \
  -out "$CERT" \
  -days 365 -nodes \
  -subj "/CN=localhost" \
  -addext "subjectAltName=${SAN}"

echo "Generated $KEY and $CERT (SAN: $SAN)"
echo "Start the MCP server with: npm run start:https"
