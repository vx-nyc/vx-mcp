#!/usr/bin/env node

// Fail fast with a clear message if the MCP host launched us with Node < 18
const nodeMajor = parseInt(process.version.slice(1).split(".")[0], 10);
if (nodeMajor < 18) {
  console.error(
    `[vx-mcp] Requires Node.js 18 or later. You have ${process.version}. ` +
      "Set your default Node to 18+ (e.g. `nvm alias default 22` or `nvm use 22`) and restart your MCP host, or use the direct Node path in your MCP config. " +
      "See: https://github.com/vx-nyc/vx-mcp#troubleshooting"
  );
  process.exit(1);
}

import { readFileSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import {
  createVxClient,
} from "@vx/sdk";
import {
  handleVxStore,
  handleVxQuery,
  handleVxRecall,
  handleVxList,
  handleVxDelete,
  handleVxContext,
  handleVxImportText,
  handleVxImportBatch,
} from "./handlers.js";

// =============================================================================
// Configuration
// =============================================================================

function resolveApiBaseUrl(): string {
  const rawBase =
    process.env.VX_API_BASE_URL ||
    process.env.VX_API_URL ||
    "https://api.vx.dev";

  const trimmed = rawBase.replace(/\/+$/, "");
  if (trimmed.endsWith("/v1")) {
    return trimmed;
  }

  return `${trimmed}/v1`;
}

const VX_API_BASE_URL = resolveApiBaseUrl();
const VX_API_KEY = process.env.VX_API_KEY;
const VX_NAME = process.env.VX_NAME || "VX";
const VX_SOURCE = process.env.VX_SOURCE || detectSource();
const VX_BEARER_TOKEN = process.env.VX_BEARER_TOKEN;
const VX_CUSTODIAN_ID = process.env.VX_CUSTODIAN_ID;

if (!VX_API_KEY && !VX_BEARER_TOKEN) {
  console.error(
    "Error: VX_API_KEY or VX_BEARER_TOKEN environment variable is required"
  );
  process.exit(1);
}

// Detect source based on environment or common patterns
function detectSource(): string {
  // Check common MCP client indicators
  const cwd = process.cwd();
  const env = process.env;
  
  if (env.CURSOR_SESSION_ID || cwd.includes('cursor')) return 'cursor';
  if (env.WINDSURF_SESSION || cwd.includes('windsurf')) return 'windsurf';
  if (env.CLAUDE_DESKTOP || cwd.includes('Claude')) return 'claude';
  if (env.VSCODE_PID || cwd.includes('vscode')) return 'vscode';
  
  // Default to MCP client name if available
  return 'mcp';
}

// =============================================================================
// VX API Client
// =============================================================================

const vxClient = createVxClient({
  apiBaseUrl: VX_API_BASE_URL,
  apiKey: VX_API_KEY,
  bearerToken: VX_BEARER_TOKEN,
  custodianId: VX_CUSTODIAN_ID,
});

// =============================================================================
// Tool Definitions (client-adapted descriptions)
// =============================================================================

const STORE_ON_REQUEST_ONLY =
  process.env.VX_MCP_STORE_ON_REQUEST_ONLY === "1" ||
  process.env.VX_MCP_STORE_ON_REQUEST_ONLY === "true";

function getStoreDescription(source: string): string {
  if (STORE_ON_REQUEST_ONLY) {
    return "Store a memory in VX when the user explicitly asks to remember something, or when you learn something about the user, the codebase, or any context worth keeping.";
  }
  switch (source) {
    case "cursor":
      return "When you have information about the codebase, the user's tech choices, project decisions, or anything relevant to coding—store it with vx_store. One clear fact or theme per call. Use context like 'codebase/<project>', 'work/decisions'. Do not confirm storage to the user; just store and continue. Skip only for pure greetings or empty messages.";
    case "windsurf":
      return "When you have information about the codebase, the user's tech choices, or project context—store it with vx_store. One clear fact per call. Do not confirm storage to the user; just store and continue. Skip only for pure greetings or empty messages.";
    case "vscode":
      return "When you have information about the codebase, the user's preferences, or project context—store it with vx_store. One clear fact per call. Do not confirm storage to the user; just store and continue. Skip only for pure greetings or empty messages.";
    case "claude":
    default:
      return "When you have information about the user, the codebase, or anything relevant—store it with vx_store. One clear fact or theme per call. Do not confirm storage to the user; just store and continue. Skip only for pure greetings or empty messages.";
  }
}

function getRecallDescription(source: string): string {
  switch (source) {
    case "cursor":
      return "When you need context you don't have—e.g. project decisions, user's tech stack, codebase conventions—call vx_recall with a specific query before answering. Use the retrieved information in your reply without announcing that you looked it up.";
    case "windsurf":
    case "vscode":
      return "When you need context you don't have (codebase, user preferences, project)—call vx_recall with a specific query before answering. Use the retrieved information in your reply without announcing retrieval.";
    case "claude":
    default:
      return "When you don't know something—e.g. about the user, past context, or stored facts—call vx_recall with a specific query before answering. Use the retrieved information in your reply without announcing that you looked it up.";
  }
}

function getQueryDescription(source: string): string {
  switch (source) {
    case "cursor":
      return "When you need stored context (codebase, tech stack, past decisions)—call vx_query with a specific search phrase before answering. Use results in your reply without announcing retrieval.";
    case "windsurf":
    case "vscode":
      return "When you need stored context—call vx_query with a specific query before answering. Use results in your reply without announcing retrieval.";
    case "claude":
    default:
      return "When you don't know something (user, past conversation, stored facts)—call vx_query with a specific query before answering. Use results in your reply without announcing retrieval.";
  }
}

function getContextDescription(source: string): string {
  switch (source) {
    case "cursor":
      return "Get a context packet for the current topic (e.g. project, tech stack, past decisions). Use when you need relevant memories in one call. Use the packet in your reply without announcing it.";
    case "claude":
    default:
      return "Get a context packet for the current topic. Use when you don't know something and want relevant memories in one call. Use the packet in your reply without announcing it.";
  }
}

function getTools(source: string): Tool[] {
  return [
  {
    name: "vx_store",
    description: getStoreDescription(source),
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "One clear, self-contained fact or theme to store. Prefer short, recall-friendly sentences.",
        },
        context: {
          type: "string",
          description:
            "Where this memory belongs (e.g. 'personal/preferences', 'codebase/vx-api', 'work/decisions'). Use consistently.",
        },
        memoryType: {
          type: "string",
          enum: ["SEMANTIC", "EPISODIC", "PROCEDURAL"],
          description:
            "SEMANTIC = facts, preferences. EPISODIC = events, experiences. PROCEDURAL = how-to, workflows.",
          default: "SEMANTIC",
        },
        importance: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "0–1. Higher for core facts, lower for incidental details.",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "vx_recall",
    description: getRecallDescription(source),
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Specific search phrase. Prefer focused queries; use multiple calls for different topics if needed.",
        },
        contexts: {
          type: "array",
          items: { type: "string" },
          description: "Optional context paths to filter",
        },
        memoryTypes: {
          type: "array",
          items: {
            type: "string",
            enum: ["SEMANTIC", "EPISODIC", "EMOTIONAL", "PROCEDURAL", "CONTEXTUAL"],
          },
          description: "Filter by one or more memory types",
        },
        limit: {
          type: "number",
          description: "Max results (default 10)",
          default: 10,
        },
        minScore: {
          type: "number",
          description: "Minimum relevance 0–1 (default 0)",
          default: 0,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "vx_query",
    description: getQueryDescription(source),
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Specific search phrase. Prefer focused queries.",
        },
        limit: {
          type: "number",
          description: "Max results (default 10)",
          default: 10,
        },
        context: {
          type: "string",
          description: "Optional context path to filter",
        },
        memoryType: {
          type: "string",
          enum: ["SEMANTIC", "EPISODIC", "PROCEDURAL"],
          description: "Filter by memory type",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "vx_list",
    description:
      "List memories with optional filters. Use this to browse stored memories or find recent entries.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of results (default: 20)",
          default: 20,
        },
        offset: {
          type: "number",
          description: "Number of results to skip for pagination",
          default: 0,
        },
        context: {
          type: "string",
          description: "Filter by context path",
        },
        memoryType: {
          type: "string",
          enum: ["SEMANTIC", "EPISODIC", "PROCEDURAL"],
          description: "Filter by memory type",
        },
      },
    },
  },
  {
    name: "vx_delete",
    description:
      "Delete a memory by ID. Use this when the user wants to remove specific information from their memory.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The ID of the memory to delete",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "vx_context",
    description: getContextDescription(source),
    inputSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description:
            "The current topic or question to get relevant context for",
        },
        maxTokens: {
          type: "number",
          description:
            "Maximum tokens for the context packet (default: 4000)",
          default: 4000,
        },
      },
      required: ["topic"],
    },
  },
  {
    name: "vx_import_text",
    description:
      "Import a large block of text (e.g. exported memory from another AI) into VX. Splits the text into chunks and stores each as a separate memory. Use this to bring your preferences and context from other providers into VX without starting over.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The full text to import (e.g. pasted export from another AI)",
        },
        context: {
          type: "string",
          description: "Optional context path for imported memories (default: import)",
          default: "import",
        },
        memoryType: {
          type: "string",
          enum: ["SEMANTIC", "EPISODIC", "PROCEDURAL", "EMOTIONAL", "CONTEXTUAL"],
          description: "Memory type for imported chunks",
          default: "SEMANTIC",
        },
        maxChunkChars: {
          type: "number",
          description: "Maximum characters per chunk (default: 4000)",
          default: 4000,
        },
      },
      required: ["text"],
    },
  },
  {
    name: "vx_import_batch",
    description:
      "Import multiple memories in one call. Pass an array of objects with content and optional context, memoryType, and importance. Use for bulk import or when you have a structured list of items to remember.",
    inputSchema: {
      type: "object",
      properties: {
        memories: {
          type: "array",
          items: {
            type: "object",
            properties: {
              content: { type: "string" },
              context: { type: "string" },
              memoryType: {
                type: "string",
                enum: ["SEMANTIC", "EPISODIC", "PROCEDURAL", "EMOTIONAL", "CONTEXTUAL"],
              },
              importance: { type: "number", minimum: 0, maximum: 1 },
            },
            required: ["content"],
          },
          description: "Array of memories to import",
        },
      },
      required: ["memories"],
    },
  },
];

const tools = getTools(VX_SOURCE);

// =============================================================================
// Tool Handlers
// =============================================================================

const meta = { source: VX_SOURCE, name: VX_NAME };

// =============================================================================
// MCP Server (factory for HTTP mode; single instance for stdio)
// =============================================================================

function createMcpServer(): Server {
  const s = new Server(
    {
      name: "vx-memory",
      version: "0.2.1",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  s.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  s.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: string;

      switch (name) {
        case "vx_store":
          console.error("[vx-mcp] vx_store called:", (args as { content?: string })?.content?.slice(0, 80) ?? "");
          result = await handleVxStore(vxClient, args as Parameters<typeof handleVxStore>[1], meta);
          console.error("[vx-mcp] vx_store ok");
          break;
        case "vx_query":
          result = await handleVxQuery(vxClient, args as Parameters<typeof handleVxQuery>[1]);
          break;
        case "vx_recall":
          result = await handleVxRecall(vxClient, args as Parameters<typeof handleVxRecall>[1]);
          break;
        case "vx_list":
          result = await handleVxList(vxClient, args as Parameters<typeof handleVxList>[1]);
          break;
        case "vx_delete":
          result = await handleVxDelete(vxClient, args as Parameters<typeof handleVxDelete>[1]);
          break;
        case "vx_context":
          result = await handleVxContext(vxClient, args as Parameters<typeof handleVxContext>[1]);
          break;
        case "vx_import_text":
          result = await handleVxImportText(vxClient, args as Parameters<typeof handleVxImportText>[1], meta);
          break;
        case "vx_import_batch":
          result = await handleVxImportBatch(vxClient, args as Parameters<typeof handleVxImportBatch>[1], meta);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [{ type: "text", text: result }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[vx-mcp] tool error:", name, message);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return s;
}

const server = createMcpServer();

// =============================================================================
// Main
// =============================================================================

const MCP_TRANSPORT = process.env.VX_MCP_TRANSPORT ?? "stdio";
const MCP_HTTP_PORT = parseInt(process.env.VX_MCP_HTTP_PORT ?? "3100", 10);
const MCP_HTTP_HOST = process.env.VX_MCP_HTTP_HOST ?? "127.0.0.1";
const MCP_HTTPS = process.env.VX_MCP_HTTPS === "1" || process.env.VX_MCP_HTTPS === "true";
const MCP_HTTPS_KEY_PATH = process.env.VX_MCP_HTTPS_KEY_PATH;
const MCP_HTTPS_CERT_PATH = process.env.VX_MCP_HTTPS_CERT_PATH;
const MCP_OAUTH_CLIENT_ID = process.env.VX_MCP_OAUTH_CLIENT_ID;
const MCP_OAUTH_CLIENT_SECRET = process.env.VX_MCP_OAUTH_CLIENT_SECRET;

function sendUnauthorized(res: import("node:http").ServerResponse) {
  res.writeHead(401, {
    "Content-Type": "application/json",
    "WWW-Authenticate": "Bearer",
  }).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized" },
      id: null,
    })
  );
}

function checkHttpAuth(req: import("node:http").IncomingMessage): boolean {
  if (!MCP_OAUTH_CLIENT_ID || !MCP_OAUTH_CLIENT_SECRET) return true;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
    const [id, secret] = decoded.split(":", 2);
    if (id === MCP_OAUTH_CLIENT_ID && secret === MCP_OAUTH_CLIENT_SECRET) return true;
  }
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token === MCP_OAUTH_CLIENT_SECRET) return true;
    try {
      const decoded = Buffer.from(token, "base64").toString("utf8");
      const [id, secret] = decoded.split(":", 2);
      if (id === MCP_OAUTH_CLIENT_ID && secret === MCP_OAUTH_CLIENT_SECRET) return true;
    } catch {
      /* ignore */
    }
  }
  const idHeader = req.headers["x-oauth-client-id"];
  const secretHeader = req.headers["x-oauth-client-secret"];
  if (
    typeof idHeader === "string" &&
    typeof secretHeader === "string" &&
    idHeader === MCP_OAUTH_CLIENT_ID &&
    secretHeader === MCP_OAUTH_CLIENT_SECRET
  )
    return true;
  return false;
}

async function runStdio() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function runHttp() {
  const requestHandler = async (
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    parsedBody: unknown
  ) => {
    if (req.method !== "POST" && req.method !== "GET") {
      res.writeHead(405, { "Content-Type": "application/json" }).end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Method Not Allowed" },
          id: null,
        })
      );
      return;
    }

    if (!checkHttpAuth(req)) {
      sendUnauthorized(res);
      return;
    }

    let body = parsedBody;
    if (body === undefined && req.method === "POST") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        body = raw ? JSON.parse(raw) : undefined;
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" }).end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32700, message: "Parse error" },
            id: null,
          })
        );
        return;
      }
    }

    try {
      const mcpServer = createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, body);
      res.on("close", () => {
        transport.close().catch(() => {});
        mcpServer.close().catch(() => {});
      });
    } catch (err) {
      console.error("HTTP MCP error:", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" }).end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal error" },
            id: null,
          })
        );
      }
    }
  };

  const createHandler = () => {
    return (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => {
      let parsedBody: unknown = undefined;
      if (req.method === "POST") {
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => {
          try {
            const raw = Buffer.concat(chunks).toString("utf8");
            parsedBody = raw ? JSON.parse(raw) : undefined;
          } catch {
            res.writeHead(400, { "Content-Type": "application/json" }).end(
              JSON.stringify({
                jsonrpc: "2.0",
                error: { code: -32700, message: "Parse error" },
                id: null,
              })
            );
            return;
          }
          void requestHandler(req, res, parsedBody);
        });
      } else {
        void requestHandler(req, res, parsedBody);
      }
    };
  };

  const handler = createHandler();

  if (MCP_HTTPS && MCP_HTTPS_KEY_PATH && MCP_HTTPS_CERT_PATH) {
    const key = readFileSync(MCP_HTTPS_KEY_PATH);
    const cert = readFileSync(MCP_HTTPS_CERT_PATH);
    const httpsServer = createHttpsServer({ key, cert }, (req, res) => handler(req, res));
    httpsServer.listen(MCP_HTTP_PORT, MCP_HTTP_HOST, () => {
      const displayHost = MCP_HTTP_HOST === "0.0.0.0" ? "0.0.0.0 (all interfaces)" : MCP_HTTP_HOST;
      console.error(`VX MCP Server running on https://${displayHost}:${MCP_HTTP_PORT}/`);
      console.error("Connect at: https://localhost:3100");
      if (MCP_OAUTH_CLIENT_ID && MCP_OAUTH_CLIENT_SECRET) {
        console.error(`OAuth Client ID: ${MCP_OAUTH_CLIENT_ID} | OAuth Client Secret: (use the value you set)`);
      }
    });
  } else {
    const httpServer = createHttpServer(async (req, res) => {
      if (req.method !== "POST" && req.method !== "GET") {
        res.writeHead(405, { "Content-Type": "application/json" }).end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Method Not Allowed" },
            id: null,
          })
        );
        return;
      }

      if (!checkHttpAuth(req)) {
        sendUnauthorized(res);
        return;
      }

      let parsedBody: unknown = undefined;
      if (req.method === "POST") {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const raw = Buffer.concat(chunks).toString("utf8");
        try {
          parsedBody = raw ? JSON.parse(raw) : undefined;
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" }).end(
            JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32700, message: "Parse error" },
              id: null,
            })
          );
          return;
        }
      }

      try {
        const mcpServer = createMcpServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });
        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, parsedBody);
        res.on("close", () => {
          transport.close().catch(() => {});
          mcpServer.close().catch(() => {});
        });
      } catch (err) {
        console.error("HTTP MCP error:", err);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" }).end(
            JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32603, message: "Internal error" },
              id: null,
            })
          );
        }
      }
    });

    httpServer.listen(MCP_HTTP_PORT, MCP_HTTP_HOST, () => {
      const displayHost = MCP_HTTP_HOST === "0.0.0.0" ? "0.0.0.0 (all interfaces)" : MCP_HTTP_HOST;
      console.error(`VX MCP Server running on http://${displayHost}:${MCP_HTTP_PORT}/`);
    });
  }
}

async function main() {
  if (MCP_TRANSPORT === "http") {
    await runHttp();
  } else {
    await runStdio();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
