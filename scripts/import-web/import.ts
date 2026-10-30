import { readFile } from "node:fs/promises";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { dinarsToMillimes } from "@/lib/money";
import { ensureImportedVersion, findPilotModelByRank } from "@/modules/catalog";
import { recordCompetitorPrice } from "@/modules/observations";
import { checkLocalDatabase } from "./guard";
import { COMPETITOR, describeIssues, fileSchema, rowSchema, type ImportRow } from "./schema";

// Import, en base locale seulement, des versions relevées sur automobile.tn (tâche 2.1 bis).
// Le prix affiché devient une observation du concurrent, jamais un prix vérifié (PricePoint).

export const ACTION_VERSION = "import.web.version.create";
export const ACTION_OBSERVATION = "import.web.competitor.create";

type RowRef = { line: number; pilotRank: number; model: string; versionName: string };

export type ImportReport = {
  dryRun: boolean;
  observedAt: string;
  versionsCreated: RowRef[];
  versionsExisting: (RowRef & { inactive: boolean })[];
  observationsCreated: RowRef[];
  observationsExisting: RowRef[];
  ignored: { line: number; reason: string }[];
  missingRanks: { pilotRank: number; model: string; reason: string }[];
};

export type ImportResult = { ok: true; report: ImportReport } | { ok: false; reason: string };

export async function runImport(options: {
  filePath: string;
  dryRun: boolean;
  env?: { DATABASE_URL?: string; NODE_ENV?: string };
}): Promise<ImportResult> {
  // Le garde-fou passe avant toute lecture ou écriture en base.
  const guard = checkLocalDatabase(options.env ?? process.env);
  if (!guard.ok) return guard;

  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(options.filePath, "utf8"));
  } catch {
    return { ok: false, reason: "Fichier illisible ou qui n'est pas du JSON." };
  }
  const file = fileSchema.safeParse(raw);
  if (!file.success) {
    return { ok: false, reason: `Structure du fichier invalide (${describeIssues(file.error)}).` };
  }
  const { observedAt: day, rows, missing } = file.data;
  const observedAt = new Date(`${day}T00:00:00.000Z`);
  const write = !options.dryRun;

  const report: ImportReport = {
    dryRun: options.dryRun,
    observedAt: day,
    versionsCreated: [],
    versionsExisting: [],
    observationsCreated: [],
    observationsExisting: [],
    ignored: [],
    missingRanks: [],
  };
  const seen = new Map<string, number>(); // rang et nom de version -> première ligne
  const ranksInFile = new Set<number>();

  for (const [index, rawRow] of rows.entries()) {
    const line = index + 1;
    const parsed = rowSchema.safeParse(rawRow);
    if (!parsed.success) {
      report.ignored.push({ line, reason: describeIssues(parsed.error) });
      continue;
    }
    const row = parsed.data;
    ranksInFile.add(row.pilotRank);

    const key = `${row.pilotRank}|${row.versionName.toLowerCase()}`;
    const first = seen.get(key);
    if (first !== undefined) {
      report.ignored.push({ line, reason: `doublon de la ligne ${first} dans le fichier` });
      continue;
    }
    seen.set(key, line);

    try {
      await importRow(row, line, observedAt, write, report);
    } catch (error) {
      const code = error instanceof Prisma.PrismaClientKnownRequestError ? ` ${error.code}` : "";
      report.ignored.push({ line, reason: `erreur de base${code}, ligne non importée` });
    }
  }

  // Rangs du pilote absents du fichier, avec la raison donnée dans la clé « missing ».
  const pilotModels = await db.model.findMany({
    where: { pilotRank: { not: null } },
    orderBy: { pilotRank: "asc" },
    select: { pilotRank: true, name: true, brand: { select: { name: true } } },
  });
  for (const model of pilotModels) {
    if (model.pilotRank === null || ranksInFile.has(model.pilotRank)) continue;
    const declared = missing.find((m) => m.pilotRank === model.pilotRank);
    report.missingRanks.push({
      pilotRank: model.pilotRank,
      model: `${model.brand.name} ${model.name}`,
      reason: declared?.reason ?? "aucune raison donnée dans le fichier",
    });
  }

  return { ok: true, report };
}

type RowOutcome = Pick<
  ImportReport,
  | "versionsCreated"
  | "versionsExisting"
  | "observationsCreated"
  | "observationsExisting"
  | "ignored"
>;

// Une ligne, une transaction : la version et son observation sont créées ensemble ou pas du tout.
// Le bilan n'est complété qu'une fois la transaction validée.
async function importRow(
  row: ImportRow,
  line: number,
  observedAt: Date,
  write: boolean,
  report: ImportReport,
) {
  const priceMinor = dinarsToMillimes(row.priceDt);
  const out: RowOutcome = {
    versionsCreated: [],
    versionsExisting: [],
    observationsCreated: [],
    observationsExisting: [],
    ignored: [],
  };

  const step = async (tx: Prisma.TransactionClient) => {
    const model = await findPilotModelByRank(tx, row.pilotRank);
    if (!model) {
      out.ignored.push({ line, reason: `rang ${row.pilotRank} absent du pilote en base` });
      return;
    }
    const ref: RowRef = {
      line,
      pilotRank: row.pilotRank,
      model: `${model.brand.name} ${model.name}`,
      versionName: row.versionName,
    };

    const version = await ensureImportedVersion(
      tx,
      {
        modelId: model.id,
        name: row.versionName,
        isPopularCar: row.isPopularCar,
        action: ACTION_VERSION,
        auditDetails: { source: COMPETITOR, url: row.url, siteLabel: row.siteLabel },
      },
      write,
    );
    if (version.status === "existing") {
      out.versionsExisting.push({ ...ref, inactive: !version.isActive });
    } else {
      out.versionsCreated.push(ref);
    }

    const observation = await recordCompetitorPrice(
      tx,
      {
        competitor: COMPETITOR,
        url: row.url,
        versionId: version.status === "wouldCreate" ? null : version.versionId,
        priceMinor,
        observedAt,
        action: ACTION_OBSERVATION,
        auditDetails: { siteLabel: row.siteLabel, priceDt: row.priceDt },
      },
      write,
    );
    if (observation.status === "existing") {
      out.observationsExisting.push(ref);
    } else if (observation.status === "conflict") {
      out.ignored.push({
        line,
        reason: "un autre prix est déjà relevé pour cette page à cette date ; rien n'est écrasé",
      });
    } else {
      out.observationsCreated.push(ref);
    }
  };

  if (write) await db.$transaction(step);
  else await step(db); // simulation : lectures seulement

  report.versionsCreated.push(...out.versionsCreated);
  report.versionsExisting.push(...out.versionsExisting);
  report.observationsCreated.push(...out.observationsCreated);
  report.observationsExisting.push(...out.observationsExisting);
  report.ignored.push(...out.ignored);
}
