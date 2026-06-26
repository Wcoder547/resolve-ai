import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],

    include: ["src/tests/**/*.test.ts"],
    exclude: ["node_modules", "dist", "coverage"],

    fileParallelism: false,

    testTimeout: 30000,
    hookTimeout: 30000,

    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage"
    }
  }
});