import type { StaffRole } from "@prisma/client";

// Personne connectée, telle que les écritures du back-office la reçoivent.
export type Actor = { staffId: string; role: StaffRole };

const CATALOG_EDITORS: readonly StaffRole[] = ["FOUNDER", "ADMIN"];

// Seuls les fondateurs et les administrateurs modifient le catalogue ; les autres rôles consultent.
export function canEditCatalog(role: StaffRole): boolean {
  return CATALOG_EDITORS.includes(role);
}
