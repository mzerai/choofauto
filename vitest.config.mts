import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests sans base de données. Les tests qui interrogent la base (tests/db/) passent par pnpm test:db.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["tests/db/**"],
  },
});
