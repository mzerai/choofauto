import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";

// Fondation F3 : la base refuse UPDATE, DELETE et TRUNCATE sur les journaux et les observations.
const REFUSED = /append-only table/;

let versionId: string;

beforeAll(async () => {
  const model = await db.model.findFirstOrThrow({ where: { pilotRank: 1 } });
  const version = await db.version.create({
    data: { modelId: model.id, countryCode: "TN", name: "Test ajout seul" },
  });
  versionId = version.id;
});

afterAll(async () => {
  await db.$disconnect();
});

describe("audit_log en ajout seul", () => {
  it("accepte un enregistrement normal, avec un identifiant UUID v7", async () => {
    const row = await db.auditLog.create({
      data: { action: "test.append_only", entity: "Test", entityId: "1", after: { ok: true } },
    });
    expect(row.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-/);
  });

  it("refuse une modification, une suppression et une remise à zéro", async () => {
    const row = await db.auditLog.create({
      data: { action: "test.append_only", entity: "Test", entityId: "2" },
    });
    await expect(
      db.auditLog.update({ where: { id: row.id }, data: { action: "test.changed" } }),
    ).rejects.toThrow(REFUSED);
    await expect(db.auditLog.delete({ where: { id: row.id } })).rejects.toThrow(REFUSED);
    await expect(db.$executeRawUnsafe('TRUNCATE "audit_log"')).rejects.toThrow(REFUSED);

    const still = await db.auditLog.findUniqueOrThrow({ where: { id: row.id } });
    expect(still.action).toBe("test.append_only");
  });
});

describe("obs_competitor en ajout seul", () => {
  const observation = () => ({
    competitor: "automobile.tn",
    url: "https://www.automobile.tn/fr/neuf/test/ajout-seul",
    versionId,
    priceMinor: 10_000_000,
    currency: "TND",
    status: "NOT_SHOWN" as const,
    observedAt: new Date("2026-01-01T00:00:00.000Z"),
  });

  it("accepte un enregistrement normal", async () => {
    const row = await db.competitorObservation.create({ data: observation() });
    expect(row.priceMinor).toBe(10_000_000);
  });

  it("refuse une modification, une suppression et une remise à zéro", async () => {
    const row = await db.competitorObservation.create({ data: observation() });
    await expect(
      db.competitorObservation.update({ where: { id: row.id }, data: { priceMinor: 1 } }),
    ).rejects.toThrow(REFUSED);
    await expect(db.competitorObservation.delete({ where: { id: row.id } })).rejects.toThrow(
      REFUSED,
    );
    await expect(db.$executeRawUnsafe('TRUNCATE "obs_competitor" CASCADE')).rejects.toThrow(
      REFUSED,
    );

    const still = await db.competitorObservation.findUniqueOrThrow({ where: { id: row.id } });
    expect(still.priceMinor).toBe(10_000_000);
  });
});
