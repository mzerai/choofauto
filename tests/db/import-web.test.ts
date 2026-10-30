import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ACTION_OBSERVATION, ACTION_VERSION, runImport } from "../../scripts/import-web/import";

// Jeu de données fictif uniquement : le vrai fichier ne sert jamais aux tests. La base de test est
// recréée à chaque lancement de pnpm test:db : rien à effacer.
const FILE = "tests/db/fixtures/versions_web.fictif.json";
const PREFIX = "Test import";
const OBSERVED_AT = new Date("2026-01-15T00:00:00.000Z");

function testVersions() {
  return db.version.findMany({
    where: { name: { startsWith: PREFIX, mode: "insensitive" } },
    orderBy: { name: "asc" },
  });
}

// Lignes d'audit écrites par l'import (les autres fichiers de test tournent en parallèle).
function importAuditCount() {
  return db.auditLog.count({
    where: { actorId: null, action: { in: [ACTION_VERSION, ACTION_OBSERVATION] } },
  });
}

afterAll(async () => {
  await db.$disconnect();
});

describe("import des versions trouvées sur le web", () => {
  it("refuse de s'exécuter si la base n'est pas locale ou en production, sans rien écrire", async () => {
    const remote = await runImport({
      filePath: FILE,
      dryRun: false,
      env: { DATABASE_URL: "postgresql://u:p@db.example.com:5432/choofauto" },
    });
    expect(remote.ok).toBe(false);

    const production = await runImport({
      filePath: FILE,
      dryRun: false,
      env: { DATABASE_URL: process.env.DATABASE_URL, NODE_ENV: "production" },
    });
    expect(production.ok).toBe(false);
    expect(await testVersions()).toHaveLength(0);
  });

  it("en simulation, annonce les créations sans rien écrire", async () => {
    const auditBefore = await importAuditCount();
    const result = await runImport({ filePath: FILE, dryRun: true });
    if (!result.ok) throw new Error(result.reason);
    expect(result.report.versionsCreated).toHaveLength(3);
    expect(result.report.observationsCreated).toHaveLength(3);
    expect(await testVersions()).toHaveLength(0);
    expect(await importAuditCount()).toBe(auditBefore);
  });

  it("crée les versions et les observations du concurrent, avec leur audit", async () => {
    const pricesBefore = await db.pricePoint.count();
    const result = await runImport({ filePath: FILE, dryRun: false });
    if (!result.ok) throw new Error(result.reason);
    const { report } = result;

    expect(report.versionsCreated.map((v) => v.versionName)).toEqual([
      "Test import Alpha",
      "Test import Beta",
      "Test import Gamma",
    ]);
    expect(report.versionsExisting).toHaveLength(0);
    expect(report.observationsCreated).toHaveLength(3);
    expect(report.ignored.map((i) => i.line)).toEqual([4, 5, 6]);
    expect(report.ignored[0]?.reason).toContain("doublon de la ligne 1");
    expect(report.ignored[1]?.reason).toContain("rang 999");
    expect(report.ignored[2]?.reason).toContain("priceDt");

    // Rang 3 : raison donnée par le fichier ; autres rangs absents : raison par défaut.
    const rank3 = report.missingRanks.find((m) => m.pilotRank === 3);
    expect(rank3?.reason).toBe("Raison fictive de l’absence du rang 3.");
    expect(report.missingRanks.find((m) => m.pilotRank === 4)?.reason).toContain("aucune raison");
    expect(report.missingRanks.some((m) => m.pilotRank === 1)).toBe(false);

    const alpha = await db.version.findFirstOrThrow({ where: { name: "Test import Alpha" } });
    expect(alpha).toMatchObject({
      countryCode: "TN",
      powertrain: null,
      isPopularCar: true,
      isTracked: false,
      isActive: true,
    });
    const rank1 = await db.model.findUniqueOrThrow({ where: { pilotRank: 1 } });
    expect(alpha.modelId).toBe(rank1.id);

    const obs = await db.competitorObservation.findFirstOrThrow({
      where: { versionId: alpha.id },
    });
    expect(obs).toMatchObject({
      competitor: "automobile.tn",
      url: "https://www.automobile.tn/fr/neuf/test/alpha",
      priceMinor: 11_111_000,
      currency: "TND",
      status: "NOT_SHOWN",
      observedAt: OBSERVED_AT,
      observerId: null,
    });

    const versionAudit = await db.auditLog.findFirstOrThrow({
      where: { entity: "Version", entityId: alpha.id, action: ACTION_VERSION },
    });
    expect(versionAudit.actorId).toBeNull();
    expect(versionAudit.after).toMatchObject({ siteLabel: "Libellé fictif Alpha" });
    const obsAudit = await db.auditLog.findFirstOrThrow({
      where: { entity: "CompetitorObservation", entityId: obs.id, action: ACTION_OBSERVATION },
    });
    expect(obsAudit.actorId).toBeNull();

    // Jamais un prix vérifié.
    expect(await db.pricePoint.count()).toBe(pricesBefore);
  });

  it("peut être relancé sans créer de doublon", async () => {
    const auditBefore = await importAuditCount();
    const result = await runImport({ filePath: FILE, dryRun: false });
    if (!result.ok) throw new Error(result.reason);
    expect(result.report.versionsCreated).toHaveLength(0);
    expect(result.report.versionsExisting).toHaveLength(3);
    expect(result.report.observationsCreated).toHaveLength(0);
    expect(result.report.observationsExisting).toHaveLength(3);

    const versions = await testVersions();
    expect(versions).toHaveLength(3);
    const obsCount = await db.competitorObservation.count({
      where: { versionId: { in: versions.map((v) => v.id) } },
    });
    expect(obsCount).toBe(3);
    expect(await importAuditCount()).toBe(auditBefore);
  });

  it("compte une version désactivée comme présente, sans la réactiver", async () => {
    const beta = await db.version.findFirstOrThrow({ where: { name: "Test import Beta" } });
    await db.version.update({ where: { id: beta.id }, data: { isActive: false } });

    const result = await runImport({ filePath: FILE, dryRun: false });
    if (!result.ok) throw new Error(result.reason);
    const found = result.report.versionsExisting.find((v) => v.versionName === "Test import Beta");
    expect(found?.inactive).toBe(true);
    expect((await db.version.findUniqueOrThrow({ where: { id: beta.id } })).isActive).toBe(false);
  });
});
