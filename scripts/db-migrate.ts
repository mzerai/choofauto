// pnpm db:migrate [options de prisma migrate dev] : applique les migrations à la base locale, puis
// régénère le client Prisma et échoue clairement si la régénération échoue.
//
// Pourquoi : un pnpm dev ou un Prisma Studio lancé avant la migration garde l'ancien client en mémoire
// (et, sous Windows, verrouille le moteur de Prisma). L'application écrit alors avec l'ancien schéma :
// par exemple, elle laisse la base fabriquer un identifiant qu'elle ne fabrique plus. On refuse donc
// de migrer tant qu'une autre connexion est ouverte sur la base.

import { spawnSync } from "node:child_process";
import { checkLocalDatabase } from "./lib/local-database";

const STOP_FIRST = "Arrêtez pnpm dev et Prisma Studio, puis relancez pnpm db:migrate.";

function fail(message: string): never {
  console.error(`\nMigration refusée : ${message}`);
  process.exit(1);
}

function prisma(args: string[]): number {
  // Une seule ligne de commande pour le shell, qui trouve pnpm sous Windows (script .cmd).
  const result = spawnSync(["pnpm exec prisma", ...args].join(" "), {
    stdio: "inherit",
    shell: true,
  });
  return result.status ?? 1;
}

// Dans un processus à part : charger Prisma ici verrouillerait son moteur, que prisma generate remplace.
function otherSessions(): number {
  const result = spawnSync("pnpm exec tsx scripts/lib/count-sessions.ts", {
    encoding: "utf8",
    shell: true,
  });
  const count = Number(result.stdout.trim());
  if (result.status !== 0 || !Number.isInteger(count)) {
    fail(`impossible de lire les connexions ouvertes sur la base (docker compose up -d ?).`);
  }
  return count;
}

function main() {
  const guard = checkLocalDatabase(process.env);
  if (!guard.ok) fail(guard.reason);

  const sessions = otherSessions();
  if (sessions > 0) {
    fail(`${sessions} autre(s) connexion(s) ouverte(s) sur la base. ${STOP_FIRST}`);
  }

  // La régénération est faite ensuite, à part, pour que son échec ne passe jamais inaperçu.
  if (prisma(["migrate", "dev", "--skip-generate", ...process.argv.slice(2)]) !== 0) {
    fail("prisma migrate dev a échoué (voir ci-dessus).");
  }
  if (prisma(["generate"]) !== 0) {
    fail(
      "les migrations sont appliquées, mais le client Prisma n'a pas pu être régénéré : " +
        "un processus le verrouille sans doute. Arrêtez pnpm dev et Prisma Studio, puis lancez pnpm db:generate.",
    );
  }
  console.log("\nMigrations appliquées et client Prisma régénéré. Vous pouvez relancer pnpm dev.");
}

main();
