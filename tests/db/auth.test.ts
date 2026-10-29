import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkStaffAccess, parseAllowlist } from "@/lib/auth-access";
import { db } from "@/lib/db";
import { findStaffByEmail } from "@/modules/ops";

// Comptes fictifs créés pour ce test, supprimés à la fin.
const ACTIVE = "test.auth.actif@example.com";
const INACTIVE = "test.auth.inactif@example.com";
const deps = { allowlist: [ACTIVE, INACTIVE], findStaff: findStaffByEmail };

beforeAll(async () => {
  await db.staffUser.deleteMany({ where: { email: { in: [ACTIVE, INACTIVE] } } });
  await db.staffUser.create({ data: { email: ACTIVE, name: "Test actif", role: "VERIFIER" } });
  await db.staffUser.create({
    data: { email: INACTIVE, name: "Test inactif", role: "VERIFIER", active: false },
  });
});

afterAll(async () => {
  await db.staffUser.deleteMany({ where: { email: { in: [ACTIVE, INACTIVE] } } });
  await db.$disconnect();
});

describe("connexion du personnel sur la base", () => {
  it("autorise un compte actif de la liste et renvoie son rôle", async () => {
    const decision = await checkStaffAccess({ email: ACTIVE, emailVerified: true }, deps);
    expect(decision.allowed && decision.staff.role).toBe("VERIFIER");
  });

  it("refuse un compte inactif", async () => {
    const decision = await checkStaffAccess({ email: INACTIVE, emailVerified: true }, deps);
    expect(decision).toEqual({ allowed: false, reason: "inactive" });
  });

  it("le seed crée un fondateur actif pour chaque adresse de STAFF_EMAIL_ALLOWLIST", async () => {
    const emails = parseAllowlist(process.env.STAFF_EMAIL_ALLOWLIST);
    expect(emails.length).toBeGreaterThan(0);
    const staff = await db.staffUser.findMany({ where: { email: { in: emails } } });
    expect(staff).toHaveLength(emails.length);
    expect(staff.every((s) => s.role === "FOUNDER" && s.active)).toBe(true);
  });
});
