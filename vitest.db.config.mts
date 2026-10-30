import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests qui interrogent la base. Ils passent toujours par pnpm test:db (scripts/test-db.ts), qui recrée
// la base choofauto_test : ils ne touchent jamais la base de travail.
if (!/\/choofauto_test(\?|$)/.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("Lancez les tests de base avec pnpm test:db : ils ne visent que choofauto_test.");
}
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
