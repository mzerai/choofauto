import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { Actor } from "@/lib/permissions";
import {
  addVersion,
  renameModel,
  renameVersion,
  setModelStatus,
  setVersionActive,
  setVersionTracked,
} from "@/modules/catalog";

// Comptes fictifs et versions de test sur un modèle du seed, dans la base de test recréée à chaque
// lancement de pnpm test:db : rien à effacer, l'audit est en ajout seul.
const ADMIN_EMAIL = "test.catalogue.admin@example.com";
const VERIFIER_EMAIL = "test.catalogue.verif@example.com";
const PREFIX = "Test catalogue";

let admin: Actor;
let verifier: Actor;
let modelId: string;

function versionByName(name: string) {
  return db.version.findFirstOrThrow({ where: { modelId, countryCode: "TN", name } });
}

beforeAll(async () => {
  const a = await db.staffUser.create({
    data: { email: ADMIN_EMAIL, name: "Test admin", role: "ADMIN" },
  });
  const v = await db.staffUser.create({
    data: { email: VERIFIER_EMAIL, name: "Test vérificateur", role: "VERIFIER" },
  });
  admin = { staffId: a.id, role: a.role };
  verifier = { staffId: v.id, role: v.role };
  const model = await db.model.findFirstOrThrow({ where: { pilotRank: 1 } });
  modelId = model.id;
});

afterAll(async () => {
  await db.$disconnect();
});

describe("versions du catalogue", () => {
  it("ajoute une version et journalise l'écriture avec son auteur", async () => {
    const result = await addVersion(admin, {
      modelId,
      name: `  ${PREFIX} Life  `,
      powertrain: "PETROL",
      isPopularCar: "on",
    });
    expect(result).toEqual({ ok: true });

    const version = await versionByName(`${PREFIX} Life`);
    expect(version).toMatchObject({
      powertrain: "PETROL",
      isPopularCar: true,
      isTracked: false,
      isActive: true,
    });

    const audit = await db.auditLog.findFirstOrThrow({
      where: { entity: "Version", entityId: version.id, action: "catalog.version.create" },
    });
    expect(audit.actorId).toBe(admin.staffId);
    expect(audit.before).toBeNull();
    expect(audit.after).toMatchObject({ name: `${PREFIX} Life`, isPopularCar: true });
  });

  it("refuse un doublon, sans tenir compte des majuscules ni des espaces", async () => {
    const result = await addVersion(admin, { modelId, name: ` ${PREFIX.toUpperCase()} LIFE ` });
    expect(result).toEqual({ ok: false, error: "duplicateVersion" });
    const count = await db.version.count({
      where: { modelId, name: { equals: `${PREFIX} Life`, mode: "insensitive" } },
    });
    expect(count).toBe(1);
  });

  it("refuse l'écriture d'un rôle non autorisé, sans rien écrire", async () => {
    const result = await addVersion(verifier, { modelId, name: `${PREFIX} Interdite` });
    expect(result).toEqual({ ok: false, error: "forbidden" });
    expect(await db.version.count({ where: { name: `${PREFIX} Interdite` } })).toBe(0);
    expect(await db.auditLog.count({ where: { actorId: verifier.staffId } })).toBe(0);
  });

  it("suit une version, puis la désactive : elle n'est plus suivie", async () => {
    const { id: versionId } = await versionByName(`${PREFIX} Life`);
    expect(await setVersionTracked(admin, { versionId, tracked: "true" })).toEqual({ ok: true });
    expect((await versionByName(`${PREFIX} Life`)).isTracked).toBe(true);

    expect(await setVersionActive(admin, { versionId, active: "false" })).toEqual({ ok: true });
    const after = await versionByName(`${PREFIX} Life`);
    expect(after).toMatchObject({ isActive: false, isTracked: false });

    const audit = await db.auditLog.findFirstOrThrow({
      where: { entityId: versionId, action: "catalog.version.deactivate" },
    });
    expect(audit.before).toMatchObject({ isActive: true, isTracked: true });
    expect(audit.after).toMatchObject({ isActive: false, isTracked: false });

    // Une version désactivée ne peut pas être suivie.
    expect(await setVersionTracked(admin, { versionId, tracked: "true" })).toEqual({
      ok: false,
      error: "inactiveVersion",
    });
  });

  it("renomme une version, mais refuse un nom déjà pris", async () => {
    await addVersion(admin, { modelId, name: `${PREFIX} Style` });
    const { id: versionId } = await versionByName(`${PREFIX} Style`);
    expect(await renameVersion(admin, { versionId, name: `${PREFIX} life` })).toEqual({
      ok: false,
      error: "duplicateVersion",
    });
    expect(await renameVersion(admin, { versionId, name: `${PREFIX} Style Plus` })).toEqual({
      ok: true,
    });
  });
});

describe("modèles du catalogue", () => {
  it("renomme un modèle sans changer son rang ni son slug, puis rétablit son nom", async () => {
    const before = await db.model.findUniqueOrThrow({ where: { id: modelId } });
    expect(await renameModel(admin, { modelId, name: `${before.name} (test)` })).toEqual({
      ok: true,
    });
    const renamed = await db.model.findUniqueOrThrow({ where: { id: modelId } });
    expect(renamed).toMatchObject({
      name: `${before.name} (test)`,
      pilotRank: before.pilotRank,
      slug: before.slug,
      pilotStatus: before.pilotStatus,
    });
    expect(await renameModel(admin, { modelId, name: before.name })).toEqual({ ok: true });
  });

  it("refuse le changement de statut par un rôle non autorisé", async () => {
    expect(await setModelStatus(verifier, { modelId, status: "CONFIRMED" })).toEqual({
      ok: false,
      error: "forbidden",
    });
  });
});
