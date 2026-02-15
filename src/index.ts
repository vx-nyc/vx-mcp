#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// =============================================================================
// Configuration
// =============================================================================

const VX_API_URL = process.env.VX_API_URL || "https://api.vx.dev";
const VX_API_KEY = process.env.VX_API_KEY;

if (!VX_API_KEY) {
  console.error("Error: VX_API_KEY environment variable is required");
  process.exit(1);
}

// =============================================================================
// VX API Client
// =============================================================================

interface Memory {
  id: string;
  content: string;
  context?: string;
  memoryType: string;
  importance?: number;
  createdAt: string;
  updatedAt?: string;
}

interface QueryResult {
  memories: Memory[];
  total: number;
}

async function vxFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${VX_API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": VX_API_KEY!,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`VX API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// =============================================================================
// Tool Definitions
// =============================================================================

const tools: Tool[] = [
  {
    name: "vx_store",
    description:
      "Store a new memory in VX. Use this to save important information, facts, preferences, or anything the user might want to remember later.",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The content to store as a memory",
        },
        context: {
          type: "string",
          description:
            "Optional context path (e.g., 'work/projects', 'personal/preferences')",
        },
        memoryType: {
          type: "string",
          enum: ["SEMANTIC", "EPISODIC", "PROCEDURAL"],
          description:
            "Type of memory: SEMANTIC (facts/knowledge), EPISODIC (events/experiences), PROCEDURAL (how-to/processes)",
          default: "SEMANTIC",
        },
        importance: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Importance score from 0 to 1 (default: 0.5)",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "vx_query",
    description:
      "Search memories by semantic similarity. Use this to recall information, find relevant context, or answer questions about past conversations and stored knowledge.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Natural language query to search memories",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 10)",
          default: 10,
        },
        context: {
          type: "string",
          description: "Optional context path to filter results",
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
    description:
      "Get a context packet with relevant memories for the current conversation. This automatically retrieves and formats memories that might be useful based on the conversation topic.",
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
];

// =============================================================================
// Tool Handlers
// =============================================================================

async function handleVxStore(args: {
  content: string;
  context?: string;
  memoryType?: string;
  importance?: number;
}): Promise<string> {
  const memory = await vxFetch<Memory>("/v1/memories", {
    method: "POST",
    body: JSON.stringify({
      content: args.content,
      context: args.context,
      memoryType: args.memoryType || "SEMANTIC",
      importance: args.importance ?? 0.5,
    }),
  });

  return `✓ Memory stored successfully (ID: ${memory.id})`;
}

async function handleVxQuery(args: {
  query: string;
  limit?: number;
  context?: string;
  memoryType?: string;
}): Promise<string> {
  const result = await vxFetch<QueryResult>("/v1/query", {
    method: "POST",
    body: JSON.stringify({
      query: args.query,
      limit: args.limit || 10,
      context: args.context,
      memoryType: args.memoryType,
    }),
  });

  if (result.memories.length === 0) {
    return "No relevant memories found.";
  }

  const formatted = result.memories
    .map(
      (m, i) =>
        `[${i + 1}] ${m.content}${m.context ? ` (context: ${m.context})` : ""}`
    )
    .join("\n\n");

  return `Found ${result.memories.length} relevant memories:\n\n${formatted}`;
}

async function handleVxList(args: {
  limit?: number;
  offset?: number;
  context?: string;
  memoryType?: string;
}): Promise<string> {
  const params = new URLSearchParams();
  if (args.limit) params.set("limit", args.limit.toString());
  if (args.offset) params.set("offset", args.offset.toString());
  if (args.context) params.set("context", args.context);
  if (args.memoryType) params.set("memoryType", args.memoryType);

  const result = await vxFetch<{ memories: Memory[]; total: number }>(
    `/v1/memories?${params.toString()}`
  );

  if (result.memories.length === 0) {
    return "No memories found.";
  }

  const formatted = result.memories
    .map(
      (m, i) =>
        `[${i + 1}] (${m.id}) ${m.content.substring(0, 100)}${
          m.content.length > 100 ? "..." : ""
        }`
    )
    .join("\n");

  return `Showing ${result.memories.length} of ${result.total} memories:\n\n${formatted}`;
}

async function handleVxDelete(args: { id: string }): Promise<string> {
  await vxFetch(`/v1/memories/${args.id}`, {
    method: "DELETE",
  });

  return `✓ Memory deleted successfully (ID: ${args.id})`;
}

async function handleVxContext(args: {
  topic: string;
  maxTokens?: number;
}): Promise<string> {
  const result = await vxFetch<{ context: string; memoryCount: number }>(
    "/v1/context-packet",
    {
      method: "POST",
      body: JSON.stringify({
        query: args.topic,
        maxTokens: args.maxTokens || 4000,
      }),
    }
  );

  if (!result.context || result.memoryCount === 0) {
    return "No relevant context found for this topic.";
  }

  return `Context from ${result.memoryCount} memories:\n\n${result.context}`;
}

// =============================================================================
// MCP Server
// =============================================================================

const server = new Server(
  {
    name: "vx-memory",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: string;

    switch (name) {
      case "vx_store":
        result = await handleVxStore(args as Parameters<typeof handleVxStore>[0]);
        break;
      case "vx_query":
        result = await handleVxQuery(args as Parameters<typeof handleVxQuery>[0]);
        break;
      case "vx_list":
        result = await handleVxList(args as Parameters<typeof handleVxList>[0]);
        break;
      case "vx_delete":
        result = await handleVxDelete(args as Parameters<typeof handleVxDelete>[0]);
        break;
      case "vx_context":
        result = await handleVxContext(args as Parameters<typeof handleVxContext>[0]);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// =============================================================================
// Main
// =============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("VX MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
