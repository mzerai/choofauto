import { describe, expect, it } from "vitest";
import {
  addVersionSchema,
  renameModelSchema,
  setModelStatusSchema,
  setVersionActiveSchema,
  setVersionTrackedSchema,
} from "./schemas";

const MODEL_ID = "6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f";

describe("formulaire d'ajout de version", () => {
  it("accepte une version complète et retire les espaces autour du nom", () => {
    const result = addVersionSchema.parse({
      modelId: MODEL_ID,
      name: "  Active 1.2  ",
      powertrain: "PETROL",
      isPopularCar: "on",
    });
    expect(result).toEqual({
      modelId: MODEL_ID,
      name: "Active 1.2",
      powertrain: "PETROL",
      isPopularCar: true,
    });
  });

  it("accepte une motorisation non choisie et une case non cochée", () => {
    const result = addVersionSchema.parse({ modelId: MODEL_ID, name: "Life", powertrain: "" });
    expect(result.powertrain).toBeUndefined();
    expect(result.isPopularCar).toBe(false);
  });

  it("refuse un nom vide ou fait d'espaces", () => {
    expect(addVersionSchema.safeParse({ modelId: MODEL_ID, name: "   " }).success).toBe(false);
  });

  it("refuse un nom de plus de 80 caractères", () => {
    expect(addVersionSchema.safeParse({ modelId: MODEL_ID, name: "x".repeat(81) }).success).toBe(
      false,
    );
  });

  it("refuse une motorisation inconnue", () => {
    const input = { modelId: MODEL_ID, name: "Life", powertrain: "STEAM" };
    expect(addVersionSchema.safeParse(input).success).toBe(false);
  });

  it("refuse un identifiant de modèle invalide", () => {
    expect(addVersionSchema.safeParse({ modelId: "abc", name: "Life" }).success).toBe(false);
  });
});

describe("autres formulaires du catalogue", () => {
  it("lit le suivi et l'activation comme des booléens", () => {
    expect(setVersionTrackedSchema.parse({ versionId: MODEL_ID, tracked: "true" }).tracked).toBe(
      true,
    );
    expect(setVersionActiveSchema.parse({ versionId: MODEL_ID, active: "false" }).active).toBe(
      false,
    );
  });

  it("refuse un statut de modèle inconnu", () => {
    expect(setModelStatusSchema.safeParse({ modelId: MODEL_ID, status: "SOLD" }).success).toBe(
      false,
    );
  });

  it("refuse le renommage d'un modèle sans nom", () => {
    expect(renameModelSchema.safeParse({ modelId: MODEL_ID, name: "" }).success).toBe(false);
  });
});
