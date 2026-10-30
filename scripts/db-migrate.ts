// pnpm db:migrate [options de prisma migrate dev] : applique les migrations à la base locale, puis
// régénère le client Prisma et échoue clairement si la régénération échoue.
//
// Pourquoi : un pnpm dev ou un Prisma Studio lancé avant la migration garde l'ancien client en mémoire
// (et, sous Windows, verrouille le moteur de Prisma). L'application écrit alors avec l'ancien schéma :
// par exemple, elle laisse la base fabriquer un identifiant qu'elle ne fabrique plus. Avant de migrer,
// on refuse donc si le moteur est verrouillé (signe sûr : Prisma le charge dès la création du client et
// le garde jusqu'à la fin du programme) ou si une autre connexion est ouverte sur la base (signe en plus,
// incomplet : Prisma n'ouvre de connexion qu'à la première requête).

import { spawnSync } from "node:child_process";
import { engineLockMessage } from "./lib/blockers";
import { checkLocalDatabase } from "./lib/local-database";

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
    fail("impossible de lire les connexions ouvertes sur la base (docker compose up -d ?).");
  }
  return count;
}

function main() {
  const guard = checkLocalDatabase(process.env);
  if (!guard.ok) fail(guard.reason);

  const locked = engineLockMessage();
  if (locked) fail(`${locked}\nPuis relancez pnpm db:migrate.`);

  const sessions = otherSessions();
  if (sessions > 0) {
    fail(
      `${sessions} autre(s) connexion(s) ouverte(s) sur la base (pnpm dev, Prisma Studio, un outil ` +
        "de base de données…). Lancez pnpm stop, fermez les autres outils, puis relancez pnpm db:migrate.",
    );
  }

  if (prisma(["migrate", "dev", "--skip-generate", ...process.argv.slice(2)]) !== 0) {
    fail("prisma migrate dev a échoué (voir ci-dessus).");
  }
  // La régénération est faite à part, pour que son échec ne passe jamais inaperçu. La migration est
  // alors faite : ne jamais la dire refusée.
  if (prisma(["generate"]) !== 0) {
    console.error(
      "\nMigrations appliquées, mais le client Prisma n'a pas pu être régénéré : " +
        "lancez pnpm stop, puis pnpm db:generate.",
    );
    process.exit(1);
  }
  console.log("\nMigrations appliquées et client Prisma régénéré. Vous pouvez relancer pnpm dev.");
}

main();
