import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // These tests share one database, so they must not race each other.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
