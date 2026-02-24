#!/usr/bin/env node

/**
 * VX MCP Server
 * Give your AI persistent memory.
 * 
 * @module @vesselnyc/mcp-server
 * @see https://vessel.nyc
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { VXClient, createClientFromEnv, detectSource } from './client.js';
import { VXError } from './types.js';

// Re-export types for library consumers
export * from './types.js';
export { VXClient, createClientFromEnv, detectSource } from './client.js';

// =============================================================================
// Version & Configuration
// =============================================================================

const VERSION = '0.3.0';
const VX_NAME = process.env.VX_NAME || 'VX';

// Create client - will throw with helpful message if not configured
let client: VXClient;
try {
  client = createClientFromEnv();
} catch (error) {
  if (error instanceof VXError) {
    console.error(`Configuration Error: ${error.message}`);
  } else {
    console.error('Error:', error);
  }
  process.exit(1);
}

// =============================================================================
// Tool Definitions
// =============================================================================

const tools: Tool[] = [
  {
    name: 'vx_store',
    description:
      'Store a new memory in VX. Use this to save important information, facts, preferences, or anything the user might want to remember later.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The content to store as a memory',
        },
        context: {
          type: 'string',
          description:
            'Optional context path (e.g., "work/projects", "personal/preferences")',
        },
        memoryType: {
          type: 'string',
          enum: ['SEMANTIC', 'EPISODIC', 'PROCEDURAL'],
          description:
            'Type of memory: SEMANTIC (facts/knowledge), EPISODIC (events/experiences), PROCEDURAL (how-to/processes)',
          default: 'SEMANTIC',
        },
        importance: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Importance score from 0 to 1 (default: 0.5)',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'vx_update',
    description:
      'Update an existing memory. Use this to modify the content, context, type, or importance of a previously stored memory.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The ID of the memory to update',
        },
        content: {
          type: 'string',
          description: 'New content for the memory',
        },
        context: {
          type: 'string',
          description: 'New context path',
        },
        memoryType: {
          type: 'string',
          enum: ['SEMANTIC', 'EPISODIC', 'PROCEDURAL'],
          description: 'New memory type',
        },
        importance: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'New importance score',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'vx_query',
    description:
      'Search memories by semantic similarity. Use this to recall information, find relevant context, or answer questions about past conversations and stored knowledge.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language query to search memories',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10)',
          default: 10,
        },
        context: {
          type: 'string',
          description: 'Optional context path to filter results',
        },
        memoryType: {
          type: 'string',
          enum: ['SEMANTIC', 'EPISODIC', 'PROCEDURAL'],
          description: 'Filter by memory type',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'vx_list',
    description:
      'List memories with optional filters. Use this to browse stored memories or find recent entries.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 20)',
          default: 20,
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip for pagination',
          default: 0,
        },
        context: {
          type: 'string',
          description: 'Filter by context path',
        },
        memoryType: {
          type: 'string',
          enum: ['SEMANTIC', 'EPISODIC', 'PROCEDURAL'],
          description: 'Filter by memory type',
        },
      },
    },
  },
  {
    name: 'vx_delete',
    description:
      'Delete a memory by ID. Use this when the user wants to remove specific information from their memory.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The ID of the memory to delete',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'vx_context',
    description:
      'Get a context packet with relevant memories for the current conversation. This automatically retrieves and formats memories that might be useful based on the conversation topic.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description:
            'The current topic or question to get relevant context for',
        },
        maxTokens: {
          type: 'number',
          description: 'Maximum tokens for the context packet (default: 4000)',
          default: 4000,
        },
      },
      required: ['topic'],
    },
  },
];

// =============================================================================
// Tool Handlers
// =============================================================================

interface StoreArgs {
  content: string;
  context?: string;
  memoryType?: 'SEMANTIC' | 'EPISODIC' | 'PROCEDURAL';
  importance?: number;
}

interface UpdateArgs {
  id: string;
  content?: string;
  context?: string;
  memoryType?: 'SEMANTIC' | 'EPISODIC' | 'PROCEDURAL';
  importance?: number;
}

interface QueryArgs {
  query: string;
  limit?: number;
  context?: string;
  memoryType?: 'SEMANTIC' | 'EPISODIC' | 'PROCEDURAL';
}

interface ListArgs {
  limit?: number;
  offset?: number;
  context?: string;
  memoryType?: 'SEMANTIC' | 'EPISODIC' | 'PROCEDURAL';
}

interface DeleteArgs {
  id: string;
}

interface ContextArgs {
  topic: string;
  maxTokens?: number;
}

async function handleVxStore(args: StoreArgs): Promise<string> {
  const memory = await client.store({
    content: args.content,
    context: args.context,
    memoryType: args.memoryType,
    importance: args.importance,
  });

  return `✓ Memory stored by ${VX_NAME} (ID: ${memory.id}, type: ${memory.memoryType})`;
}

async function handleVxUpdate(args: UpdateArgs): Promise<string> {
  const memory = await client.update({
    id: args.id,
    content: args.content,
    context: args.context,
    memoryType: args.memoryType,
    importance: args.importance,
  });

  return `✓ Memory updated (ID: ${memory.id})`;
}

async function handleVxQuery(args: QueryArgs): Promise<string> {
  const result = await client.query({
    query: args.query,
    limit: args.limit,
    context: args.context,
    memoryType: args.memoryType,
  });

  if (result.memories.length === 0) {
    return 'No relevant memories found.';
  }

  const formatted = result.memories
    .map(
      (m, i) =>
        `[${i + 1}] ${m.content}${m.context ? ` (context: ${m.context})` : ''}`
    )
    .join('\n\n');

  return `Found ${result.memories.length} relevant memories:\n\n${formatted}`;
}

async function handleVxList(args: ListArgs): Promise<string> {
  const result = await client.list({
    limit: args.limit,
    offset: args.offset,
    context: args.context,
    memoryType: args.memoryType,
  });

  if (result.memories.length === 0) {
    return 'No memories found.';
  }

  const formatted = result.memories
    .map(
      (m, i) =>
        `[${i + 1}] (${m.id}) ${m.content.substring(0, 100)}${
          m.content.length > 100 ? '...' : ''
        }`
    )
    .join('\n');

  return `Showing ${result.memories.length} of ${result.total} memories:\n\n${formatted}`;
}

async function handleVxDelete(args: DeleteArgs): Promise<string> {
  await client.delete(args.id);
  return `✓ Memory deleted successfully (ID: ${args.id})`;
}

async function handleVxContext(args: ContextArgs): Promise<string> {
  const result = await client.getContextPacket({
    topic: args.topic,
    maxTokens: args.maxTokens,
  });

  if (!result.context || result.memoryCount === 0) {
    return 'No relevant context found for this topic.';
  }

  return `Context from ${result.memoryCount} memories:\n\n${result.context}`;
}

// =============================================================================
// MCP Server
// =============================================================================

const server = new Server(
  {
    name: 'vx-memory',
    version: VERSION,
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
      case 'vx_store':
        result = await handleVxStore(args as unknown as StoreArgs);
        break;
      case 'vx_update':
        result = await handleVxUpdate(args as unknown as UpdateArgs);
        break;
      case 'vx_query':
        result = await handleVxQuery(args as unknown as QueryArgs);
        break;
      case 'vx_list':
        result = await handleVxList((args ?? {}) as unknown as ListArgs);
        break;
      case 'vx_delete':
        result = await handleVxDelete(args as unknown as DeleteArgs);
        break;
      case 'vx_context':
        result = await handleVxContext(args as unknown as ContextArgs);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: 'text', text: result }],
    };
  } catch (error) {
    let message: string;
    
    if (error instanceof VXError) {
      message = `${error.code}: ${error.message}`;
      if (error.retryable) {
        message += ' (this error may be temporary, please try again)';
      }
    } else {
      message = error instanceof Error ? error.message : String(error);
    }

    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
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
  console.error(`VX MCP Server v${VERSION} running on stdio`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
