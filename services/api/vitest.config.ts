import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: "forks",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "coverage"
    }
  }
});