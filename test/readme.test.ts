import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("README smoke checks", () => {
  it("documents the primary install flows and shipped assets", () => {
    const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");

    expect(readme).toContain("npx @vesselnyc/mcp-server install claude");
    expect(readme).toContain("npx @vesselnyc/mcp-server install codex");
    expect(readme).toContain("openclaw plugins install @vesselnyc/mcp-server");
    expect(readme).toContain("\"args\": [\"-y\", \"@vesselnyc/mcp-server@latest\", \"mcp\"]");
    expect(readme).toContain("VX_API_BASE_URL");
    expect(readme).toContain("VX_NAME");
    expect(readme).toContain("VX_SOURCE");
    expect(readme).toContain("claude-code");
    expect(readme).toContain("claude-desktop");
    expect(readme).toContain("vx_memory_workflow");
    expect(readme).toContain("vx_memory_import");
    expect(readme).toContain("vx_status");

    for (const toolName of [
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
    ]) {
      expect(readme).toContain(toolName);
    }

    expect(existsSync(join(process.cwd(), ".claude-plugin/plugin.json"))).toBe(true);
    expect(existsSync(join(process.cwd(), "openclaw.plugin.json"))).toBe(true);
    expect(existsSync(join(process.cwd(), "skills/claude/vx-memory/vx-memory.md"))).toBe(
      true
    );
    expect(existsSync(join(process.cwd(), "skills/codex/vx-memory/SKILL.md"))).toBe(true);
    expect(existsSync(join(process.cwd(), "skills/openclaw/vx-memory/SKILL.md"))).toBe(
      true
    );
  });
});
