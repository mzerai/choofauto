import { PilotStatus, Powertrain } from "@prisma/client";
import { z } from "zod";

// Schémas des formulaires du catalogue. Ils reçoivent les valeurs brutes d'un FormData :
// texte pour les champs, "on" pour une case cochée, chaîne vide pour une liste non choisie.

const id = z.uuid();
const name = z.string().trim().min(1).max(80);
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const flag = z.enum(["true", "false"]).transform((v) => v === "true");

export const addVersionSchema = z.object({
  modelId: id,
  name,
  powertrain: z.preprocess((v) => (v === "" ? undefined : v), z.enum(Powertrain).optional()),
  isPopularCar: checkbox,
});

export const renameVersionSchema = z.object({ versionId: id, name });
export const setVersionTrackedSchema = z.object({ versionId: id, tracked: flag });
export const setVersionActiveSchema = z.object({ versionId: id, active: flag });

export const renameModelSchema = z.object({ modelId: id, name });
export const setModelStatusSchema = z.object({ modelId: id, status: z.enum(PilotStatus) });

export type AddVersionInput = z.input<typeof addVersionSchema>;
