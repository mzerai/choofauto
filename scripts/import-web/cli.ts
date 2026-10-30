// pnpm data:import-web <chemin du fichier> [--dry-run]
// Importe en base locale les versions relevées sur automobile.tn. Voir docs/DECISIONS.md, 0016.

import { db } from "@/lib/db";
import { runImport, type ImportReport } from "./import";

const USAGE = "Usage : pnpm data:import-web <chemin du fichier> [--dry-run]";

function print(report: ImportReport) {
  const sim = report.dryRun;
  const out: string[] = [];
  out.push(
    sim ? "SIMULATION (--dry-run) : rien n'a été écrit en base." : "Import terminé en base locale.",
  );
  out.push(`Date d'observation du fichier : ${report.observedAt}`);
  out.push("");

  out.push(`Versions ${sim ? "à créer" : "créées"} : ${report.versionsCreated.length}`);
  for (const r of report.versionsCreated) {
    out.push(`  + [rang ${r.pilotRank}] ${r.model} - ${r.versionName}`);
  }
  out.push(`Versions déjà présentes : ${report.versionsExisting.length}`);
  for (const r of report.versionsExisting.filter((v) => v.inactive)) {
    out.push(
      `  ! [rang ${r.pilotRank}] ${r.model} - ${r.versionName} : désactivée, laissée telle quelle`,
    );
  }
  out.push(
    `Observations du concurrent ${sim ? "à créer" : "créées"} : ${report.observationsCreated.length}`,
  );
  out.push(`Observations déjà présentes : ${report.observationsExisting.length}`);
  out.push("");

  out.push(`Lignes ignorées : ${report.ignored.length}`);
  for (const i of report.ignored) out.push(`  - ligne ${i.line} : ${i.reason}`);
  out.push(`Rangs du pilote absents du fichier : ${report.missingRanks.length}`);
  for (const m of report.missingRanks) {
    out.push(`  - rang ${m.pilotRank} (${m.model}) : ${m.reason}`);
  }
  console.log(out.join("\n"));
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const paths = args.filter((a) => !a.startsWith("--"));
  const unknown = args.filter((a) => a.startsWith("--") && a !== "--dry-run");
  if (paths.length !== 1 || unknown.length > 0) {
    console.error(USAGE);
    return 2;
  }

  const result = await runImport({ filePath: paths[0]!, dryRun });
  if (!result.ok) {
    console.error(`Import refusé : ${result.reason}`);
    return 1;
  }
  print(result.report);
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error("Erreur inattendue :", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
