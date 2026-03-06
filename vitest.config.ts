import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts", "src/**/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@vx/sdk": path.resolve(__dirname, "sdk/src/index.ts"),
    },
  },
});
