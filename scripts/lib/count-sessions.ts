// Affiche le nombre d'autres connexions ouvertes sur la base. Lancé dans un processus à part par
// scripts/db-migrate.ts : ce processus se termine avant prisma generate, et libère le moteur de Prisma.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

db.$queryRaw<{ count: bigint }[]>`
  SELECT count(*) AS count FROM pg_stat_activity
  WHERE datname = current_database() AND pid <> pg_backend_pid()`
  .then((rows) => console.log(Number(rows[0]?.count ?? 0)))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
