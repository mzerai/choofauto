// Programmes qui empêchent de migrer ou de démarrer : moteur de Prisma verrouillé, port occupé.
// Le message liste les programmes Node de choofauto en marche et propose pnpm stop.

import { lockedEngineFiles } from "./prisma-engine";
import { describeProcess, findProjectNodeProcesses } from "./processes";

export function runningProjectProcesses(): string {
  const found = findProjectNodeProcesses();
  if (found.length === 0) {
    return "Aucun programme Node de choofauto n'est en marche : un autre programme est en cause.";
  }
  return [
    "Programmes Node de choofauto encore en marche :",
    ...found.map(describeProcess),
    "Arrêtez-les avec : pnpm stop",
  ].join("\n");
}

// Message d'erreur si le moteur de Prisma est verrouillé, sinon null.
export function engineLockMessage(): string | null {
  if (lockedEngineFiles().length === 0) return null;
  return [
    "le moteur de Prisma est verrouillé par un programme en marche (pnpm dev, Prisma Studio…) :",
    "le client Prisma ne pourrait pas être régénéré, et ce programme garderait l'ancien en mémoire.",
    runningProjectProcesses(),
  ].join("\n");
}
