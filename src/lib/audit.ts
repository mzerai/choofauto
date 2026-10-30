import type { Prisma } from "@prisma/client";

export type AuditEntry = {
  actorId: string;
  action: string; // ex. "catalog.version.create"
  entity: string; // ex. "Version"
  entityId: string;
  before: Prisma.InputJsonValue | null;
  after: Prisma.InputJsonValue | null;
};

// Écrit la ligne d'audit dans la transaction de l'écriture : l'une n'existe jamais sans l'autre.
export async function writeAudit(tx: Prisma.TransactionClient, entry: AuditEntry) {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      before: entry.before ?? undefined,
      after: entry.after ?? undefined,
    },
  });
}
