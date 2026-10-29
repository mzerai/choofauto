import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests qui interrogent la base : docker compose up -d, migrations appliquées et seed chargé.
// Comme le seed, on lit STAFF_EMAIL_ALLOWLIST dans .env.local s'il existe (absent en intégration continue).
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/db/**/*.test.ts"],
  },
});
