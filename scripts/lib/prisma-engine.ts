// Verrou du moteur de Prisma. Sous Windows, un programme qui a chargé le moteur (pnpm dev, Prisma Studio)
// empêche prisma generate de le remplacer (EPERM), et garde en mémoire l'ancien client.

import { closeSync, openSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// Dossier du client généré (.prisma/client), tel que l'application le charge.
function clientDir(): string {
  const require = createRequire(join(process.cwd(), "package.json"));
  const client = dirname(require.resolve("@prisma/client"));
  return dirname(require.resolve(".prisma/client/default", { paths: [client] }));
}

// Fichiers du moteur (query_engine-windows.dll.node, libquery_engine-*.so.node…).
export function engineFiles(): string[] {
  const dir = clientDir();
  return readdirSync(dir)
    .filter((f) => /query_engine.*\.node$/.test(f))
    .map((f) => join(dir, f));
}

// Ouvre le moteur en écriture sans rien y écrire : refusé (EBUSY, EPERM) tant qu'un programme l'a chargé.
export function lockedEngineFiles(): string[] {
  return engineFiles().filter((file) => {
    try {
      closeSync(openSync(file, "r+"));
      return false;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      return code === "EBUSY" || code === "EPERM" || code === "EACCES";
    }
  });
}
