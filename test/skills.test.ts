import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("bundled skill guidance", () => {
  for (const relativePath of [
    "skills/claude/vx-memory/vx-memory.md",
    "skills/codex/vx-memory/SKILL.md",
    "skills/openclaw/vx-memory/SKILL.md",
  ]) {
    it(`${relativePath} emphasizes knowledge-context organization`, () => {
      const content = readFileSync(join(process.cwd(), relativePath), "utf8");

      expect(content).toContain("vx_contexts_list");
      expect(content).toContain("vx_contexts_create");
      expect(content.toLowerCase()).toContain("knowledge context");
      expect(content.toLowerCase()).toContain("organize");
    });
  }
});
