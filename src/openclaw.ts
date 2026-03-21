import { getVxToolDefinitions, type VxToolName } from "./catalog.js";
import {
  createConfiguredVxClient,
  executeConfiguredTool,
  formatToolTextResult,
  getVxStatusText,
  resolveVxConfig,
  type VxResolvedConfig,
} from "./runtime.js";
import type { VxClientLike } from "./handlers.js";

type OpenClawPluginConfig = {
  apiBaseUrl?: string;
  apiKey?: string;
  bearerToken?: string;
  source?: string;
  name?: string;
  storeOnRequestOnly?: boolean;
  maxTokens?: number;
};

type OpenClawTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (
    invocationId: string,
    params: Record<string, unknown>
  ) => Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }>;
};

type OpenClawApi = {
  config?: unknown;
  getConfig?: () => unknown;
  registerTool: (tool: OpenClawTool, options?: { optional?: boolean }) => void;
};

type OpenClawEntryFactoryModule = {
  definePluginEntry?: <T>(entry: T) => T;
};

function isDirectPluginConfig(value: unknown): value is OpenClawPluginConfig {
  if (!value || typeof value !== "object") {
    return false;
  }

  return [
    "apiBaseUrl",
    "apiKey",
    "bearerToken",
    "source",
    "name",
    "storeOnRequestOnly",
    "maxTokens",
  ].some((key) => key in value);
}

export function getOpenClawPluginConfig(
  rootConfig: unknown,
  pluginId = "vx-memory"
): OpenClawPluginConfig {
  if (isDirectPluginConfig(rootConfig)) {
    return rootConfig;
  }

  if (
    !rootConfig ||
    typeof rootConfig !== "object" ||
    !("plugins" in rootConfig) ||
    typeof rootConfig.plugins !== "object" ||
    !rootConfig.plugins ||
    !("entries" in rootConfig.plugins) ||
    typeof rootConfig.plugins.entries !== "object" ||
    !rootConfig.plugins.entries
  ) {
    return {};
  }

  const entry = (rootConfig.plugins.entries as Record<string, unknown>)[pluginId];
  if (!entry || typeof entry !== "object" || !("config" in entry)) {
    return {};
  }

  const config = entry.config;
  return config && typeof config === "object" ? (config as OpenClawPluginConfig) : {};
}

export function resolveOpenClawConfig(rootConfig?: unknown): VxResolvedConfig {
  const pluginConfig = getOpenClawPluginConfig(rootConfig);
  return resolveVxConfig({
    ...pluginConfig,
    source: pluginConfig.source || "openclaw",
    client: "openclaw-plugin",
  });
}

export function createOpenClawPlugin(options?: {
  clientFactory?: (config: VxResolvedConfig) => VxClientLike;
}) {
  const clientFactory = options?.clientFactory || createConfiguredVxClient;

  return {
    id: "vx-memory",
    name: "VX Memory",
    description:
      "Native OpenClaw plugin for durable VX recall, storage, context packets, and import workflows.",
    register(api: OpenClawApi) {
      const getConfig = () => resolveOpenClawConfig(api.getConfig ? api.getConfig() : api.config);
      const toolDefinitions = getVxToolDefinitions(getConfig());

      for (const tool of toolDefinitions) {
        api.registerTool({
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
          async execute(_invocationId, params = {}) {
            return executeConfiguredTool(
              tool.name as VxToolName,
              params,
              getConfig(),
              clientFactory
            );
          },
        });
      }

      api.registerTool({
        name: "vx_status",
        description:
          "Check whether the VX OpenClaw plugin is configured and ready for recall, storage, context packets, and imports.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {},
        },
        async execute() {
          return formatToolTextResult(getVxStatusText(getConfig()));
        },
      });
    },
  };
}

const pluginDefinition = createOpenClawPlugin();
const runtimeImport = new Function(
  "specifier",
  "return import(specifier);"
) as (specifier: string) => Promise<unknown>;

let wrappedPlugin = pluginDefinition;
try {
  const core = (await runtimeImport("openclaw/plugin-sdk/core").catch(() => null)) as
    | OpenClawEntryFactoryModule
    | null;
  if (core?.definePluginEntry) {
    wrappedPlugin = core.definePluginEntry(pluginDefinition);
  }
} catch {
  // Fallback keeps the plugin usable in tests and non-OpenClaw environments.
}

export default wrappedPlugin;
