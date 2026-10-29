import { describe, expect, it } from "vitest";
import {
  checkStaffAccess,
  deniedSignInLogLine,
  isStaffRole,
  parseAllowlist,
  type StaffRecord,
} from "./auth-access";

const allowlist = parseAllowlist(" Test.Fondateur@example.com , test.inactif@example.com,,");
const staffTable: Record<string, StaffRecord> = {
  "test.fondateur@example.com": { id: "staff-1", role: "FOUNDER", active: true },
  "test.inactif@example.com": { id: "staff-2", role: "VERIFIER", active: false },
};
const deps = { allowlist, findStaff: async (email: string) => staffTable[email] ?? null };

describe("liste blanche", () => {
  it("normalise les adresses et ignore les entrées vides", () => {
    expect(allowlist).toEqual(["test.fondateur@example.com", "test.inactif@example.com"]);
  });

  it("est vide sans variable", () => {
    expect(parseAllowlist(undefined)).toEqual([]);
  });
});

describe("règle d'accès au back-office", () => {
  it("accepte une adresse vérifiée, sur la liste et active, et renvoie son rôle", async () => {
    const decision = await checkStaffAccess(
      { email: "TEST.fondateur@example.com", emailVerified: true },
      deps,
    );
    expect(decision).toEqual({ allowed: true, staff: { id: "staff-1", role: "FOUNDER" } });
  });

  it("refuse une adresse que Google ne déclare pas vérifiée", async () => {
    const decision = await checkStaffAccess(
      { email: "test.fondateur@example.com", emailVerified: false },
      deps,
    );
    expect(decision).toEqual({ allowed: false, reason: "email_not_verified" });
  });

  it("refuse une adresse hors de la liste blanche", async () => {
    const decision = await checkStaffAccess(
      { email: "inconnu@example.com", emailVerified: true },
      deps,
    );
    expect(decision).toEqual({ allowed: false, reason: "not_in_allowlist" });
  });

  it("refuse une adresse de la liste absente de la table du personnel", async () => {
    const decision = await checkStaffAccess(
      { email: "test.fondateur@example.com", emailVerified: true },
      { allowlist, findStaff: async () => null },
    );
    expect(decision).toEqual({ allowed: false, reason: "not_in_staff_table" });
  });

  it("refuse un compte inactif", async () => {
    const decision = await checkStaffAccess(
      { email: "test.inactif@example.com", emailVerified: true },
      deps,
    );
    expect(decision).toEqual({ allowed: false, reason: "inactive" });
  });

  it("refuse une connexion sans adresse", async () => {
    const decision = await checkStaffAccess({ email: undefined, emailVerified: true }, deps);
    expect(decision).toEqual({ allowed: false, reason: "missing_email" });
  });
});

describe("rôle lu dans le jeton de session", () => {
  it("reconnaît un rôle du schéma et rejette le reste", () => {
    expect(isStaffRole("FOUNDER")).toBe(true);
    expect(isStaffRole("SUPERADMIN")).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });
});

describe("journal d'un refus", () => {
  it("ne contient que l'adresse comme donnée personnelle", () => {
    const line = JSON.parse(
      deniedSignInLogLine("Inconnu@example.com", "not_in_allowlist"),
    ) as Record<string, unknown>;
    expect(Object.keys(line).sort()).toEqual(["email", "event", "level", "reason", "time"]);
    expect(line.email).toBe("inconnu@example.com");
    expect(line.event).toBe("staff_sign_in_denied");
  });
});
