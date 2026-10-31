// Lancé par pnpm dev avant de démarrer : le port 3000 doit être libre (l'adresse de retour de la
// connexion Google est http://localhost:3000), et le moteur de Prisma ne doit pas être verrouillé.

import { createServer } from "node:net";
import { engineLockMessage, runningProjectProcesses } from "./lib/blockers";

const PORT = 3000;

function fail(message: string): never {
  console.error(`\npnpm dev ne démarre pas : ${message}`);
  process.exit(1);
}

function portIsFree(port: number): Promise<boolean> {
  return new Promise((done) => {
    const server = createServer();
    server.once("error", () => done(false));
    server.once("listening", () => server.close(() => done(true)));
    server.listen(port);
  });
}

async function main() {
  if (!(await portIsFree(PORT))) {
    fail(
      `le port ${PORT} est déjà occupé ; la connexion Google ne fonctionne que sur ce port.\n` +
        runningProjectProcesses(),
    );
  }
  const locked = engineLockMessage();
  if (locked) fail(locked);
}

void main();
