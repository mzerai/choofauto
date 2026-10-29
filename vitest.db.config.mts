import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests qui interrogent la base : docker compose up -d, migrations appliquées et seed chargé.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/db/**/*.test.ts"],
  },
});
