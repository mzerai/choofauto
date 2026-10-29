import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";

afterAll(async () => {
  await db.$disconnect();
});

describe("chargement initial", () => {
  it("charge la Tunisie", async () => {
    const tunisia = await db.country.findUnique({ where: { code: "TN" } });
    expect(tunisia?.currency).toBe("TND");
    expect(tunisia?.minorUnits).toBe(3);
  });

  it("charge 19 marques, 30 modèles et 22 showrooms, sans doublon", async () => {
    expect(await db.brand.count()).toBe(19);
    expect(await db.model.count()).toBe(30);
    expect(await db.proSite.count({ where: { countryCode: "TN" } })).toBe(22);
  });

  it("ne trouve pas un modèle inexistant", async () => {
    expect(await db.model.findUnique({ where: { slug: "modele-inexistant" } })).toBeNull();
  });
});
