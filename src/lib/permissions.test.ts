import { describe, expect, it } from "vitest";
import { canEditCatalog } from "./permissions";

describe("droits sur le catalogue", () => {
  it.each(["FOUNDER", "ADMIN"] as const)("%s peut modifier", (role) => {
    expect(canEditCatalog(role)).toBe(true);
  });

  it.each(["VERIFIER", "INTERN"] as const)("%s peut seulement consulter", (role) => {
    expect(canEditCatalog(role)).toBe(false);
  });
});
