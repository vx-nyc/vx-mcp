import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getVxPromptDefinitions, getVxToolDefinitions } from "./catalog.js";
import {
  createConfiguredVxClient,
  executeVxOperation,
  formatToolError,
  type VxResolvedConfig,
} from "./runtime.js";
import {
  VX_MCP_SERVER_NAME,
  VX_MCP_SERVER_VERSION,
} from "./constants.js";
import type { VxClientLike } from "./handlers.js";

export type CreateMcpServerOptions = {
  config: VxResolvedConfig;
  client?: VxClientLike;
};

export function createMcpServer(options: CreateMcpServerOptions): Server {
  const { config } = options;
  const client = options.client || createConfiguredVxClient(config);
  const tools = getVxToolDefinitions(config);
  const prompts = getVxPromptDefinitions(config);
  const promptByName = new Map(prompts.map((prompt) => [prompt.name, prompt]));

  const server = new Server(
    {
      name: VX_MCP_SERVER_NAME,
      version: VX_MCP_SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
        prompts: {
          listChanged: false,
        },
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = (request.params.arguments || {}) as Record<string, unknown>;

    try {
      const text = await executeVxOperation(client, toolName as typeof tools[number]["name"], args, config);
      return {
        content: [{ type: "text", text }],
      };
    } catch (error) {
      return formatToolError(error);
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: prompts.map((prompt) => ({
      name: prompt.name,
      title: prompt.title,
      description: prompt.description,
      arguments: prompt.arguments,
    })),
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const prompt = promptByName.get(request.params.name as typeof prompts[number]["name"]);
    if (!prompt) {
      throw new Error(`Unknown prompt: ${request.params.name}`);
    }

    return {
      description: prompt.description,
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: prompt.buildMessage(request.params.arguments),
          },
        },
      ],
    };
  });

  return server;
}
