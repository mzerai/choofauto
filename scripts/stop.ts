// pnpm stop : arrête les programmes Node de choofauto encore en marche (pnpm dev, Prisma Studio,
// scripts), avec leurs processus enfants. Jamais Claude Code ni un autre projet.
// Sous Windows, Ctrl+C peut laisser next dev et son serveur en marche en arrière-plan.

import { execFileSync } from "node:child_process";
import { describeProcess, findProjectNodeProcesses } from "./lib/processes";

const found = findProjectNodeProcesses();

if (found.length === 0) {
  console.log("Aucun programme Node de choofauto en marche.");
} else {
  console.log(`Arrêt de ${found.length} programme(s) Node de choofauto :`);
  for (const p of found) {
    console.log(describeProcess(p));
    try {
      if (process.platform === "win32") {
        // /T : avec ses processus enfants ; /F : sans attendre.
        execFileSync("taskkill", ["/PID", String(p.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        process.kill(p.pid, "SIGTERM");
      }
    } catch {
      // Déjà arrêté, par exemple comme enfant d'un programme arrêté juste avant.
    }
  }
  const left = findProjectNodeProcesses();
  if (left.length > 0) {
    console.error("Encore en marche :");
    for (const p of left) console.error(describeProcess(p));
    process.exitCode = 1;
  } else {
    console.log("Tout est arrêté.");
  }
}
