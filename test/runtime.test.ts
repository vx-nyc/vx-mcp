import { describe, expect, it } from "vitest";
import {
  normalizeApiBaseUrl,
  normalizeSourceTag,
  resolveVxConfig,
} from "../src/runtime.js";

describe("runtime config", () => {
  it("normalizes API base URLs to include /v1", () => {
    expect(normalizeApiBaseUrl("https://api.vx.dev")).toBe("https://api.vx.dev/v1");
    expect(normalizeApiBaseUrl("https://api.vx.dev/v1")).toBe("https://api.vx.dev/v1");
    expect(normalizeApiBaseUrl("https://api.vx.dev/v1/")).toBe("https://api.vx.dev/v1");
  });

  it("uses VX_API_URL as a backward-compatible fallback", () => {
    const config = resolveVxConfig(
      {},
      {
        VX_API_URL: "https://legacy.vx.dev",
        VX_API_KEY: "test-api-key",
      } as NodeJS.ProcessEnv
    );

    expect(config.apiBaseUrl).toBe("https://legacy.vx.dev/v1");
  });

  it("normalizes source tags for host-specific integrations", () => {
    expect(normalizeSourceTag("claude")).toBe("claude-code");
    expect(normalizeSourceTag("codex")).toBe("codex");
  });
});
