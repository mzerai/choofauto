import { describe, expect, it } from "vitest";
import { checkLocalDatabase } from "../scripts/import-web/guard";
import { fileSchema, rowSchema } from "../scripts/import-web/schema";

const LOCAL = "postgresql://choofauto:choofauto@localhost:5434/choofauto?schema=public";

const row = {
  pilotRank: 1,
  brand: "Marque fictive",
  model: "Modèle fictif",
  versionName: "  Version fictive 1.0  ",
  siteLabel: "Marque fictive Modèle fictif 1.0",
  isPopularCar: false,
  priceDt: 50000,
  url: "https://www.automobile.tn/fr/neuf/fictif/modele",
};

describe("garde-fou de la base locale", () => {
  it("accepte la base locale sur le port 5434", () => {
    expect(checkLocalDatabase({ DATABASE_URL: LOCAL })).toEqual({ ok: true });
    const loopback = LOCAL.replace("localhost", "127.0.0.1");
    expect(checkLocalDatabase({ DATABASE_URL: loopback }).ok).toBe(true);
  });

  it("refuse une base distante, un autre port, une adresse absente ou la production", () => {
    const remote = LOCAL.replace("localhost", "10.0.0.5");
    expect(checkLocalDatabase({ DATABASE_URL: remote }).ok).toBe(false);
    expect(checkLocalDatabase({ DATABASE_URL: LOCAL.replace("5434", "5432") }).ok).toBe(false);
    expect(checkLocalDatabase({}).ok).toBe(false);
    expect(checkLocalDatabase({ DATABASE_URL: "pas une adresse" }).ok).toBe(false);
    expect(checkLocalDatabase({ DATABASE_URL: LOCAL, NODE_ENV: "production" }).ok).toBe(false);
  });

  it("ne recopie jamais l'adresse, qui peut contenir un mot de passe", () => {
    const result = checkLocalDatabase({
      DATABASE_URL: "postgresql://u:secret@db.example.com:5432/x",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).not.toContain("secret");
  });
});

describe("validation du fichier", () => {
  it("accepte une structure correcte, sans clé missing", () => {
    const parsed = fileSchema.safeParse({ observedAt: "2026-10-29", rows: [row] });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.missing).toEqual([]);
  });

  it("refuse une structure sans date valide ou sans lignes", () => {
    expect(fileSchema.safeParse({ rows: [row] }).success).toBe(false);
    expect(fileSchema.safeParse({ observedAt: "29/10/2026", rows: [row] }).success).toBe(false);
    expect(fileSchema.safeParse({ observedAt: "2026-10-29", rows: [] }).success).toBe(false);
  });

  it("valide une ligne et retire les espaces du nom de version", () => {
    const parsed = rowSchema.safeParse(row);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.versionName).toBe("Version fictive 1.0");
  });

  it("refuse un prix à virgule, un nom vide ou une page hors d'automobile.tn", () => {
    expect(rowSchema.safeParse({ ...row, priceDt: 50000.5 }).success).toBe(false);
    expect(rowSchema.safeParse({ ...row, priceDt: "50000" }).success).toBe(false);
    expect(rowSchema.safeParse({ ...row, versionName: "   " }).success).toBe(false);
    expect(rowSchema.safeParse({ ...row, url: "https://exemple.com/x" }).success).toBe(false);
    expect(rowSchema.safeParse({ ...row, url: "http://www.automobile.tn/x" }).success).toBe(false);
    expect(rowSchema.safeParse({ ...row, pilotRank: 1.5 }).success).toBe(false);
  });
});
