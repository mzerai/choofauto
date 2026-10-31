// pnpm test:db : recrée la base de test choofauto_test (migrations, puis deux passages du seed),
// puis lance les tests qui interrogent la base. La base de travail n'est jamais touchée.

import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { checkLocalDatabase } from "./lib/local-database";

export const TEST_DATABASE = "choofauto_test";

function fail(message: string): never {
  console.error(`Tests refusés : ${message}`);
  process.exit(1);
}

function run(command: string, env: NodeJS.ProcessEnv) {
  // Commandes fixes, sans valeur venue de l'extérieur : le shell sert seulement à trouver pnpm sous Windows.
  const result = spawnSync(command, { stdio: "inherit", shell: true, env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function main() {
  const guard = checkLocalDatabase(process.env);
  if (!guard.ok) fail(guard.reason);

  // Même serveur que la base de travail, autre base.
  const workUrl = new URL(process.env.DATABASE_URL!);
  const testUrl = new URL(workUrl);
  testUrl.pathname = `/${TEST_DATABASE}`;

  const admin = new PrismaClient({ datasourceUrl: workUrl.toString() });
  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${TEST_DATABASE}" WITH (FORCE)`);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${TEST_DATABASE}"`);
  } finally {
    await admin.$disconnect();
  }
  console.log(`Base ${TEST_DATABASE} recréée.`);

  const env = { ...process.env, DATABASE_URL: testUrl.toString() };
  run("pnpm exec prisma migrate deploy", env);
  run("pnpm db:seed", env);
  run("pnpm db:seed", env); // le second passage vérifie que le seed ne crée pas de doublon
  run("pnpm exec vitest run --config vitest.db.config.mts", env);
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
