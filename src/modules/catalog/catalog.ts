import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { canEditCatalog, type Actor } from "@/lib/permissions";
import {
  addVersionSchema,
  catalogNameSchema,
  renameModelSchema,
  renameVersionSchema,
  setModelStatusSchema,
  setVersionActiveSchema,
  setVersionTrackedSchema,
} from "./schemas";

// Pays du pilote : les versions ajoutées depuis le back-office sont celles vendues en Tunisie.
export const PILOT_COUNTRY = "TN";

export type CatalogError =
  "forbidden" | "invalid" | "notFound" | "duplicateVersion" | "duplicateModel" | "inactiveVersion";

export type CatalogResult = { ok: true } | { ok: false; error: CatalogError };

const versionFields = {
  id: true,
  modelId: true,
  countryCode: true,
  name: true,
  powertrain: true,
  isPopularCar: true,
  isTracked: true,
  isActive: true,
} satisfies Prisma.VersionSelect;

const modelFields = {
  id: true,
  brandId: true,
  name: true,
  slug: true,
  pilotRank: true,
  pilotStatus: true,
} satisfies Prisma.ModelSelect;

// Les 30 modèles du pilote par rang, avec leurs versions dans le pays (actives d'abord).
export async function listPilotModels(countryCode: string = PILOT_COUNTRY) {
  return db.model.findMany({
    where: { pilotRank: { not: null } },
    orderBy: { pilotRank: "asc" },
    select: {
      ...modelFields,
      segment: true,
      brand: { select: { name: true } },
      versions: {
        where: { countryCode },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        select: versionFields,
      },
    },
  });
}

export type PilotModel = Awaited<ReturnType<typeof listPilotModels>>[number];

// Contrôle commun à chaque écriture : rôle d'abord, puis données du formulaire.
function check<S extends z.ZodType>(
  actor: Actor,
  schema: S,
  raw: unknown,
): { ok: true; data: z.output<S> } | { ok: false; error: CatalogError } {
  if (!canEditCatalog(actor.role)) return { ok: false, error: "forbidden" };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  return { ok: true, data: parsed.data };
}

// Erreur que l'on renvoie au lieu de la laisser remonter, pour annuler la transaction proprement.
class Refused extends Error {
  constructor(readonly code: CatalogError) {
    super(code);
  }
}

async function run(write: () => Promise<void>, duplicate: CatalogError): Promise<CatalogResult> {
  try {
    await write();
    return { ok: true };
  } catch (error) {
    if (error instanceof Refused) return { ok: false, error: error.code };
    // Contrainte d'unicité de la base : deux enregistrements simultanés du même nom.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: duplicate };
    }
    throw error;
  }
}

// Un nom de version est unique par modèle et par pays, sans tenir compte des majuscules ni des
// espaces en début et en fin (le schéma zod les retire déjà).
async function versionNameTaken(
  tx: Prisma.TransactionClient,
  where: { modelId: string; countryCode: string; name: string; exceptId?: string },
) {
  const found = await tx.version.findFirst({
    where: {
      modelId: where.modelId,
      countryCode: where.countryCode,
      name: { equals: where.name, mode: "insensitive" },
      ...(where.exceptId ? { id: { not: where.exceptId } } : {}),
    },
    select: { id: true },
  });
  return found !== null;
}

export async function addVersion(actor: Actor, raw: unknown): Promise<CatalogResult> {
  const input = check(actor, addVersionSchema, raw);
  if (!input.ok) return input;
  const { modelId, name, powertrain, isPopularCar } = input.data;

  return run(
    () =>
      db.$transaction(async (tx) => {
        const model = await tx.model.findUnique({ where: { id: modelId }, select: { id: true } });
        if (!model) throw new Refused("notFound");
        if (await versionNameTaken(tx, { modelId, countryCode: PILOT_COUNTRY, name })) {
          throw new Refused("duplicateVersion");
        }
        const created = await tx.version.create({
          data: {
            modelId,
            countryCode: PILOT_COUNTRY,
            name,
            powertrain: powertrain ?? null,
            isPopularCar,
          },
          select: versionFields,
        });
        await writeAudit(tx, {
          actorId: actor.staffId,
          action: "catalog.version.create",
          entity: "Version",
          entityId: created.id,
          before: null,
          after: created,
        });
      }),
    "duplicateVersion",
  );
}

// Modifie une version existante et journalise l'avant et l'après.
async function updateVersion(
  actor: Actor,
  versionId: string,
  action: string,
  change: (
    tx: Prisma.TransactionClient,
    before: Prisma.VersionGetPayload<{ select: typeof versionFields }>,
  ) => Promise<Prisma.VersionUpdateInput>,
): Promise<CatalogResult> {
  return run(
    () =>
      db.$transaction(async (tx) => {
        const before = await tx.version.findUnique({
          where: { id: versionId },
          select: versionFields,
        });
        if (!before) throw new Refused("notFound");
        const after = await tx.version.update({
          where: { id: versionId },
          data: await change(tx, before),
          select: versionFields,
        });
        await writeAudit(tx, {
          actorId: actor.staffId,
          action,
          entity: "Version",
          entityId: versionId,
          before,
          after,
        });
      }),
    "duplicateVersion",
  );
}

export async function renameVersion(actor: Actor, raw: unknown): Promise<CatalogResult> {
  const input = check(actor, renameVersionSchema, raw);
  if (!input.ok) return input;
  const { versionId, name } = input.data;
  return updateVersion(actor, versionId, "catalog.version.rename", async (tx, before) => {
    const taken = await versionNameTaken(tx, {
      modelId: before.modelId,
      countryCode: before.countryCode,
      name,
      exceptId: versionId,
    });
    if (taken) throw new Refused("duplicateVersion");
    return { name };
  });
}

export async function setVersionTracked(actor: Actor, raw: unknown): Promise<CatalogResult> {
  const input = check(actor, setVersionTrackedSchema, raw);
  if (!input.ok) return input;
  const { versionId, tracked } = input.data;
  return updateVersion(actor, versionId, "catalog.version.track", async (_tx, before) => {
    if (tracked && !before.isActive) throw new Refused("inactiveVersion");
    return { isTracked: tracked };
  });
}

// Aucune suppression : une version se désactive, et une version désactivée n'est plus suivie.
export async function setVersionActive(actor: Actor, raw: unknown): Promise<CatalogResult> {
  const input = check(actor, setVersionActiveSchema, raw);
  if (!input.ok) return input;
  const { versionId, active } = input.data;
  return updateVersion(
    actor,
    versionId,
    active ? "catalog.version.activate" : "catalog.version.deactivate",
    async () => (active ? { isActive: true } : { isActive: false, isTracked: false }),
  );
}

// Modifie un modèle du pilote ; le rang et le slug ne changent jamais ici.
async function updateModel(
  actor: Actor,
  modelId: string,
  action: string,
  change: (
    tx: Prisma.TransactionClient,
    before: Prisma.ModelGetPayload<{ select: typeof modelFields }>,
  ) => Promise<Prisma.ModelUpdateInput>,
): Promise<CatalogResult> {
  return run(
    () =>
      db.$transaction(async (tx) => {
        const before = await tx.model.findUnique({ where: { id: modelId }, select: modelFields });
        if (!before) throw new Refused("notFound");
        const after = await tx.model.update({
          where: { id: modelId },
          data: await change(tx, before),
          select: modelFields,
        });
        await writeAudit(tx, {
          actorId: actor.staffId,
          action,
          entity: "Model",
          entityId: modelId,
          before,
          after,
        });
      }),
    "duplicateModel",
  );
}

export async function renameModel(actor: Actor, raw: unknown): Promise<CatalogResult> {
  const input = check(actor, renameModelSchema, raw);
  if (!input.ok) return input;
  const { modelId, name } = input.data;
  return updateModel(actor, modelId, "catalog.model.rename", async (tx, before) => {
    const taken = await tx.model.findFirst({
      where: {
        brandId: before.brandId,
        name: { equals: name, mode: "insensitive" },
        id: { not: modelId },
      },
      select: { id: true },
    });
    if (taken) throw new Refused("duplicateModel");
    return { name };
  });
}

export async function setModelStatus(actor: Actor, raw: unknown): Promise<CatalogResult> {
  const input = check(actor, setModelStatusSchema, raw);
  if (!input.ok) return input;
  const { modelId, status } = input.data;
  return updateModel(actor, modelId, "catalog.model.status", async () => ({
    pilotStatus: status,
  }));
}

// ---------------------------------------------------------------- import depuis un script local

// Modèle du pilote retrouvé par son rang, jamais par son nom.
export async function findPilotModelByRank(tx: Prisma.TransactionClient, pilotRank: number) {
  return tx.model.findUnique({
    where: { pilotRank },
    select: { id: true, name: true, brand: { select: { name: true } } },
  });
}

export type ImportedVersion =
  | { status: "existing"; versionId: string; isActive: boolean }
  | { status: "created"; versionId: string }
  | { status: "wouldCreate" };

// Retrouve une version du pays par la règle de doublon du back-office, ou la crée si `write` est vrai :
// non suivie, motorisation non renseignée. La ligne d'audit, sans acteur, porte l'action `action`.
export async function ensureImportedVersion(
  tx: Prisma.TransactionClient,
  input: {
    modelId: string;
    name: string;
    isPopularCar: boolean;
    action: string;
    auditDetails: Prisma.InputJsonObject;
  },
  write: boolean,
): Promise<ImportedVersion> {
  const name = catalogNameSchema.parse(input.name);
  const existing = await tx.version.findFirst({
    where: {
      modelId: input.modelId,
      countryCode: PILOT_COUNTRY,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true, isActive: true },
  });
  if (existing) return { status: "existing", versionId: existing.id, isActive: existing.isActive };
  if (!write) return { status: "wouldCreate" };

  const created = await tx.version.create({
    data: {
      modelId: input.modelId,
      countryCode: PILOT_COUNTRY,
      name,
      powertrain: null,
      isPopularCar: input.isPopularCar,
      isTracked: false,
    },
    select: versionFields,
  });
  await writeAudit(tx, {
    actorId: null,
    action: input.action,
    entity: "Version",
    entityId: created.id,
    before: null,
    after: { ...created, ...input.auditDetails },
  });
  return { status: "created", versionId: created.id };
}
