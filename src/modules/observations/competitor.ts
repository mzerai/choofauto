import type { Prisma } from "@prisma/client";
import { writeAudit } from "@/lib/audit";

// Observations d'un site concurrent : ce qu'il affiche, jamais un prix vérifié (PricePoint).
// Elles ne sont jamais montrées au public comme nos données (décision 0016).

export type RecordedCompetitorPrice =
  | { status: "created"; observationId: string }
  | { status: "wouldCreate" }
  | { status: "existing"; observationId: string }
  | { status: "conflict"; observationId: string; priceMinor: number | null };

// Ajoute le prix affiché par un concurrent pour une version, à une date et pour une page donnée.
// En ajout seul : si une observation existe déjà pour la même version, le même concurrent, la même page
// et la même date, on n'ajoute rien, et un prix différent est signalé sans rien écraser.
export async function recordCompetitorPrice(
  tx: Prisma.TransactionClient,
  input: {
    competitor: string;
    url: string;
    versionId: string | null; // null : version pas encore créée (simulation)
    priceMinor: number;
    currency: string; // ISO 4217, celle du pays de la version
    observedAt: Date;
    action: string;
    auditDetails: Prisma.InputJsonObject;
  },
  write: boolean,
): Promise<RecordedCompetitorPrice> {
  if (input.versionId === null) {
    if (write) throw new Error("Version manquante pour enregistrer l'observation.");
    return { status: "wouldCreate" };
  }
  const existing = await tx.competitorObservation.findFirst({
    where: {
      versionId: input.versionId,
      competitor: input.competitor,
      url: input.url,
      observedAt: input.observedAt,
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, priceMinor: true, currency: true },
  });
  if (existing) {
    return existing.priceMinor === input.priceMinor && existing.currency === input.currency
      ? { status: "existing", observationId: existing.id }
      : { status: "conflict", observationId: existing.id, priceMinor: existing.priceMinor };
  }
  if (!write) return { status: "wouldCreate" };

  const created = await tx.competitorObservation.create({
    data: {
      competitor: input.competitor,
      url: input.url,
      versionId: input.versionId,
      priceMinor: input.priceMinor,
      currency: input.currency,
      status: "NOT_SHOWN",
      observedAt: input.observedAt,
      observerId: null,
    },
  });
  await writeAudit(tx, {
    actorId: null,
    action: input.action,
    entity: "CompetitorObservation",
    entityId: created.id,
    before: null,
    after: {
      competitor: created.competitor,
      url: created.url,
      versionId: created.versionId,
      priceMinor: created.priceMinor,
      currency: created.currency,
      status: created.status,
      observedAt: created.observedAt.toISOString(),
      ...input.auditDetails,
    },
  });
  return { status: "created", observationId: created.id };
}
