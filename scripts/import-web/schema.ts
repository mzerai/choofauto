import { z } from "zod";
import { catalogNameSchema } from "@/modules/catalog";

// Structure du fichier des versions relevées sur automobile.tn. La structure générale doit être
// juste, sinon l'import est refusé ; chaque ligne est ensuite validée seule, et une ligne invalide
// est ignorée avec sa raison.

export const COMPETITOR = "automobile.tn";

const pilotRank = z.int().min(1).max(999);

export const fileSchema = z.object({
  observedAt: z.iso.date(), // AAAA-MM-JJ, enregistrée à 00:00 UTC
  rows: z.array(z.unknown()).min(1),
  missing: z.array(z.object({ pilotRank, reason: z.string().trim().min(1) }).loose()).default([]),
});

export const rowSchema = z.object({
  pilotRank,
  versionName: catalogNameSchema,
  siteLabel: z.string().trim().min(1).max(200),
  isPopularCar: z.boolean(),
  priceDt: z.int().positive(),
  url: z.url({ protocol: /^https$/, hostname: /^(www\.)?automobile\.tn$/ }),
  // brand et model sont présents dans le fichier mais jamais utilisés : le modèle se retrouve par son rang.
});

export type ImportFile = z.output<typeof fileSchema>;
export type ImportRow = z.output<typeof rowSchema>;

// Raison lisible d'un échec de validation : les champs en cause, sans recopier les valeurs.
export function describeIssues(error: z.ZodError): string {
  const fields = [...new Set(error.issues.map((i) => i.path.join(".") || "(ligne)"))];
  return `champ invalide : ${fields.join(", ")}`;
}
