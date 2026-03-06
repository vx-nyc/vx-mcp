/**
 * Continuity test: two separate MCP client processes share one VX user (same token).
 * Client A stores a memory; Client B recalls it. Proves cross-client continuity without manual UI.
 * Loads test/.env.e2e if credentials not set. Skips and exits 0 if no credentials or API unreachable.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as fs from "node:fs";
import * as path from "node:path";

function loadTestEnv(): void {
  if (process.env.VX_BEARER_TOKEN || process.env.VX_API_KEY) return;
  const envPath = path.join(process.cwd(), "test", ".env.e2e");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        process.env[key] = value;
      }
    }
  }
}
loadTestEnv();

const VX_API_BASE_URL =
  process.env.VX_API_BASE_URL || process.env.VX_API_URL || "http://localhost:3000/v1";
const VX_API_KEY = process.env.VX_API_KEY;
const VX_BEARER_TOKEN = process.env.VX_BEARER_TOKEN;
const auth = VX_BEARER_TOKEN ? { bearerToken: VX_BEARER_TOKEN } : VX_API_KEY ? { apiKey: VX_API_KEY } : null;

function makeTransport(cwd: string): StdioClientTransport {
  return new StdioClientTransport({
    command: "node",
    args: [path.join(cwd, "dist", "index.js")],
    env: {
      ...process.env,
      VX_API_BASE_URL,
      ...(VX_BEARER_TOKEN ? { VX_BEARER_TOKEN } : {}),
      ...(VX_API_KEY ? { VX_API_KEY } : {}),
    },
  });
}

async function ensureBuilt(): Promise<void> {
  const distIndex = path.join(process.cwd(), "dist", "index.js");
  if (!fs.existsSync(distIndex)) {
    console.error("dist/index.js not found. Run: npm run build");
    process.exit(1);
  }
}

async function main(): Promise<void> {
  await ensureBuilt();

  if (!auth) {
    console.log("Continuity test skipped: no VX API credentials. Set VX_BEARER_TOKEN or VX_API_KEY (and optionally VX_API_BASE_URL).");
    process.exit(0);
  }

  const baseUrl = VX_API_BASE_URL.replace(/\/v1\/?$/, "");
  let reachable = false;
  try {
    const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(2000) });
    reachable = res.ok;
  } catch {
    // ignore
  }
  if (!reachable) {
    console.log("Continuity test skipped: VX API not reachable at", baseUrl);
    process.exit(0);
  }

  const cwd = process.cwd();
  const unique = `continuity-test-${Date.now()}`;
  const context = "test/continuity";

  // --- Client A: store ---
  const transportA = makeTransport(cwd);
  const clientA = new Client(
    { name: "vx-continuity-client-a", version: "0.2.0" },
    { capabilities: {} }
  );
  await clientA.connect(transportA);

  const storeRes = await clientA.callTool({
    name: "vx_store",
    arguments: { content: unique, context, memoryType: "SEMANTIC" },
  });
  await transportA.close();

  if (storeRes.isError) {
    console.error("Client A vx_store failed:", storeRes.content?.[0]);
    process.exit(1);
  }
  const storeText = (storeRes.content?.[0] as { text?: string })?.text ?? "";
  const idMatch = storeText.match(/ID:\s*([^\s)]+)/);
  const memoryId = idMatch ? idMatch[1]!.trim() : null;
  if (!memoryId) {
    console.error("Client A vx_store did not return memory ID:", storeText);
    process.exit(1);
  }
  console.log("Client A stored memory:", memoryId);

  // --- Client B: query (separate process, same token) ---
  const transportB = makeTransport(cwd);
  const clientB = new Client(
    { name: "vx-continuity-client-b", version: "0.2.0" },
    { capabilities: {} }
  );
  await clientB.connect(transportB);

  const queryRes = await clientB.callTool({
    name: "vx_query",
    arguments: { query: unique, limit: 5 },
  });
  if (queryRes.isError) {
    console.error("Client B vx_query failed:", queryRes.content?.[0]);
    await transportB.close();
    process.exit(1);
  }
  const queryText = (queryRes.content?.[0] as { text?: string })?.text ?? "";
  if (!queryText.includes(unique)) {
    console.error("Client B vx_query did not return the stored memory. Response:", queryText);
    await transportB.close();
    process.exit(1);
  }
  console.log("Client B vx_query found the memory.");

  // Optional: vx_context in Client B
  const contextRes = await clientB.callTool({
    name: "vx_context",
    arguments: { topic: "continuity test" },
  });
  if (!contextRes.isError) {
    const contextText = (contextRes.content?.[0] as { text?: string })?.text ?? "";
    if (contextText.includes(unique)) {
      console.log("Client B vx_context includes the stored content.");
    }
  }

  // Cleanup: delete so we don't leave test data
  await clientB.callTool({ name: "vx_delete", arguments: { id: memoryId } });
  await transportB.close();

  console.log("Continuity test passed: two MCP clients shared one VX user (same token).");
}

main().catch((err) => {
  console.error("Continuity test failed:", err);
  process.exit(1);
});
