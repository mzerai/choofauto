import { describe, expect, it } from "vitest";
import {
  checkAmounts,
  checkAppendOnlyTriggers,
  checkCatalog,
  checkComponent,
  checkCss,
  checkIdentifiers,
} from "../scripts/check-foundations/checks";

const GOOD_SCHEMA = `
model Version {
  id     String       @id @default(uuid()) @db.Uuid
  name   String // nom commercial
  prices PricePoint[]
  @@map("catalog_versions")
}

model PricePoint {
  id          String @id @default(uuid()) @db.Uuid
  amountMinor Int // en millimes
  currency    String @db.Char(3)
  @@map("obs_price_points")
}

model AuditLog {
  id     String @id @default(uuid(7)) @db.Uuid
  action String
  @@map("audit_log")
}
`;

const TRIGGERS = (table: string) => `
CREATE TRIGGER "${table}_append_only" BEFORE UPDATE OR DELETE ON "${table}"
  FOR EACH ROW EXECUTE FUNCTION "refuse_append_only_change"();
CREATE TRIGGER "${table}_no_truncate" BEFORE TRUNCATE ON "${table}"
  FOR EACH STATEMENT EXECUTE FUNCTION "refuse_append_only_change"();
`;

describe("F1 : identifiants", () => {
  it("accepte des UUID, en version 7 pour les journaux", () => {
    expect(checkIdentifiers(GOOD_SCHEMA)).toEqual([]);
  });

  it("refuse un compteur séquentiel et un journal sans UUID v7", () => {
    const bad = GOOD_SCHEMA.replace(
      "id     String @id @default(uuid(7)) @db.Uuid",
      "id     BigInt @id @default(autoincrement())",
    );
    const rules = checkIdentifiers(bad).map((v) => v.message);
    expect(rules).toContain("compteur séquentiel");
    expect(rules).toContain("clé primaire qui n'est pas un UUID");
    const v4 = GOOD_SCHEMA.replace("uuid(7)", "uuid()");
    expect(checkIdentifiers(v4).map((v) => v.message)).toEqual(["journal sans UUID version 7"]);
  });

  it("admet seulement les deux clés naturelles de la décision 0017", () => {
    expect(checkIdentifiers("model Country {\n  code String @id @db.Char(2)\n}\n")).toEqual([]);
    expect(checkIdentifiers("model Brand {\n  code String @id\n}\n")).toHaveLength(1);
  });
});

describe("F1 : montants", () => {
  it("accepte un montant entier avec sa devise", () => {
    expect(checkAmounts(GOOD_SCHEMA)).toEqual([]);
  });

  it("refuse un montant sans devise, ou à virgule", () => {
    const noCurrency = GOOD_SCHEMA.replace("  currency    String @db.Char(3)\n", "");
    expect(checkAmounts(noCurrency)).toHaveLength(1);
    const float = GOOD_SCHEMA.replace("amountMinor Int", "amountMinor Float");
    expect(checkAmounts(float)[0]?.message).toBe("montant qui n'est pas un entier");
    const micro = "model AgentRun {\n  id String @id @db.Uuid\n  costMicroUsd Int\n}\n";
    expect(checkAmounts(micro)).toHaveLength(1);
  });

  it("ne prend pas le nombre de décimales d'une devise pour un montant", () => {
    const country = "model Country {\n  code String @id\n  minorUnits Int\n}\n";
    expect(checkAmounts(country)).toEqual([]);
  });
});

describe("F4 : catalogue", () => {
  it("accepte une relation vers les observations, refuse un prix ou un stock", () => {
    expect(checkCatalog(GOOD_SCHEMA)).toEqual([]);
    const bad = GOOD_SCHEMA.replace(
      "  name   String // nom commercial\n",
      "  priceMinor Int\n  inStock Boolean\n",
    );
    expect(checkCatalog(bad).map((v) => v.where)).toEqual([
      "Version.priceMinor",
      "Version.inStock",
    ]);
  });
});

describe("F3 : déclencheurs d'ajout seul", () => {
  it("exige les deux déclencheurs pour chaque journal et chaque table obs_*", () => {
    const sql = TRIGGERS("obs_price_points") + TRIGGERS("audit_log");
    expect(checkAppendOnlyTriggers(GOOD_SCHEMA, sql)).toEqual([]);
    const missing = checkAppendOnlyTriggers(GOOD_SCHEMA, TRIGGERS("audit_log"));
    expect(missing.map((v) => v.where)).toEqual(["obs_price_points", "obs_price_points"]);
  });
});

describe("F5 : CSS logique", () => {
  it("accepte les propriétés logiques et ignore les commentaires", () => {
    const css =
      "/* pas de margin-left */\n.a { margin-inline-start: 1rem; inset-inline-end: 0; text-align: start; }";
    expect(checkCss("a.css", css)).toEqual([]);
  });

  it("refuse left, right et leurs variantes", () => {
    for (const rule of [
      "margin-left: 1px",
      "padding-right: 0",
      "left: 0",
      "text-align: right",
      "float: left",
    ]) {
      expect(checkCss("a.css", `.a { ${rule}; }`)).toHaveLength(1);
    }
  });
});

describe("F5 : textes des composants", () => {
  it("accepte un texte passé par l'i18n et les commentaires accentués", () => {
    const src = `// Écran d'accueil\nexport function A() { return <p>{t("home.title")}</p>; }`;
    expect(checkComponent("a.tsx", src)).toEqual([]);
  });

  it("refuse un texte accentué ou arabe en dur, et un style physique", () => {
    expect(
      checkComponent("a.tsx", "export const A = () => <p>Créer une version</p>;"),
    ).toHaveLength(1);
    expect(
      checkComponent("a.tsx", 'export const A = () => <input placeholder="Prénom" />;'),
    ).toHaveLength(1);
    expect(checkComponent("a.tsx", "export const A = () => <p>{`Déjà ${1}`}</p>;")).toHaveLength(1);
    expect(checkComponent("a.tsx", 'export const A = () => <p>{"شوف"}</p>;')).toHaveLength(1);
    expect(
      checkComponent("a.tsx", "export const A = () => <p style={{ marginLeft: 4 }} />;"),
    ).toHaveLength(1);
  });
});
