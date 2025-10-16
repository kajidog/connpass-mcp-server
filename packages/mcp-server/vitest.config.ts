import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    restoreMocks: true,
    typecheck: {
      tsconfig: "./tsconfig.vitest.json",
    },
  },
});
