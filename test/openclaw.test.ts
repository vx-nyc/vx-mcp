import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import openClawPlugin, {
  createOpenClawPlugin,
  resolveOpenClawConfig,
} from "../src/openclaw.js";
import type { VxClientLike } from "../src/handlers.js";

function createMockClient(): VxClientLike {
  return {
    createMemory: vi.fn().mockResolvedValue({
      id: "mem-1",
      content: "remember me",
      context: "prefs",
      memoryType: "SEMANTIC",
    }),
    createContext: vi.fn().mockResolvedValue({
      name: "work/project-alpha",
      description: "Project Alpha",
      memory_count: 0,
    }),
    listContexts: vi.fn().mockResolvedValue({
      contexts: [
        {
          name: "work/project-alpha",
          description: "Project Alpha",
          memory_count: 2,
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    }),
    queryMemories: vi.fn().mockResolvedValue({
      memories: [{ id: "mem-1", content: "remember me", context: "prefs", score: 0.9 }],
      total: 1,
    }),
    queryHybrid: vi.fn().mockResolvedValue({
      data: {
        memories: [{ id: "mem-1", content: "hybrid result", context: "prefs", score: 0.8 }],
        total: 1,
      },
    }),
    buildContextPacket: vi.fn().mockResolvedValue({
      formatted: "Context packet",
      memoriesUsed: 1,
    }),
    deleteMemory: vi.fn().mockResolvedValue(undefined),
  };
}

describe("OpenClaw manifest", () => {
  it("ships a native manifest with config schema, ui hints, and skill paths", () => {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), "openclaw.plugin.json"), "utf8")
    ) as Record<string, any>;

    expect(manifest.id).toBe("vx-memory");
    expect(manifest.kind).toBeUndefined();
    expect(manifest.configSchema.properties.apiBaseUrl.default).toBe(
      "https://api.vx.dev/v1"
    );
    expect(manifest.configSchema.properties.maxTokens.default).toBe(4000);
    expect(manifest.uiHints.apiKey.sensitive).toBe(true);
    expect(manifest.uiHints.bearerToken.sensitive).toBe(true);
    expect(manifest.skills).toEqual(["skills/openclaw/vx-memory"]);
    expect(existsSync(join(process.cwd(), "skills/openclaw/vx-memory/SKILL.md"))).toBe(
      true
    );
  });
});

describe("OpenClaw plugin runtime", () => {
  it("registers the public VX tools plus vx_status", async () => {
    const client = createMockClient();
    const plugin = createOpenClawPlugin({
      clientFactory: () => client,
    });
    const tools = new Map<string, any>();
    plugin.register({
      config: {
        plugins: {
          entries: {
            "vx-memory": {
              config: {
                apiBaseUrl: "https://api.vx.dev/v1",
                apiKey: "test-api-key",
                source: "openclaw",
                name: "VX",
                maxTokens: 3333,
              },
            },
          },
        },
      },
      registerTool(tool) {
        tools.set(tool.name, tool);
      },
    });

    expect(Array.from(tools.keys())).toEqual(
      expect.arrayContaining([
        "vx_store",
        "vx_recall",
        "vx_query",
        "vx_list",
        "vx_delete",
        "vx_context",
        "vx_contexts_list",
        "vx_contexts_create",
        "vx_import_text",
        "vx_import_batch",
        "vx_status",
      ])
    );

    const status = await tools.get("vx_status").execute("1", {});
    expect(status.content[0].text).toContain("ready to use");
    expect(status.content[0].text).toContain("3333 tokens");

    const store = await tools.get("vx_store").execute("2", {
      content: "remember me",
      context: "prefs",
    });
    expect(store.isError).toBeUndefined();
    expect(client.createMemory).toHaveBeenCalled();

    const recall = await tools.get("vx_recall").execute("3", { query: "remember" });
    expect(recall.content[0].text).toContain("hybrid result");

    const listContexts = await tools.get("vx_contexts_list").execute("4", {
      prefix: "work/",
    });
    expect(listContexts.content[0].text).toContain("work/project-alpha");

    const createContext = await tools.get("vx_contexts_create").execute("5", {
      name: "work/project-beta",
      description: "Project Beta",
    });
    expect(createContext.content[0].text).toContain("Knowledge context created");

    const importText = await tools.get("vx_import_text").execute("6", {
      text: "Imported note one.\n\nImported note two.",
    });
    expect(importText.content[0].text).toContain("Imported");
  });

  it("reports missing credentials through vx_status and tool errors", async () => {
    const plugin = createOpenClawPlugin();
    const tools = new Map<string, any>();
    plugin.register({
      config: {
        plugins: {
          entries: {
            "vx-memory": {
              config: {},
            },
          },
        },
      },
      registerTool(tool) {
        tools.set(tool.name, tool);
      },
    });

    const status = await tools.get("vx_status").execute("1", {});
    expect(status.content[0].text).toContain("not configured yet");

    const store = await tools.get("vx_store").execute("2", {
      content: "remember me",
    });
    expect(store.isError).toBe(true);
    expect(store.content[0].text).toContain("VX_API_KEY or VX_BEARER_TOKEN is required");
  });

  it("uses openclaw defaults when resolving plugin config", () => {
    const config = resolveOpenClawConfig({
      plugins: {
        entries: {
          "vx-memory": {
            config: {},
          },
        },
      },
    });

    expect(config.source).toBe("openclaw");
    expect(config.client).toBe("openclaw-plugin");
  });

  it("accepts direct plugin config as well as nested root config", () => {
    const config = resolveOpenClawConfig({
      apiBaseUrl: "https://api.vx.dev/v1",
      apiKey: "test-api-key",
      name: "VX",
      source: "openclaw",
    });

    expect(config.apiBaseUrl).toBe("https://api.vx.dev/v1");
    expect(config.apiKey).toBe("test-api-key");
    expect(config.source).toBe("openclaw");
  });

  it("exports the default plugin entry", () => {
    expect(openClawPlugin.id).toBe("vx-memory");
  });
});
