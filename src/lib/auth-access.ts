import { StaffRole } from "@prisma/client";

// Règle d'accès au back-office, sans dépendance à Auth.js pour pouvoir la tester seule.

// Le jeton de session est typé de façon lâche par Auth.js : on vérifie le rôle avant de l'exposer.
export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && (Object.values(StaffRole) as string[]).includes(value);
}

export type StaffRecord = { id: string; role: StaffRole; active: boolean };

export type DenialReason =
  "missing_email" | "email_not_verified" | "not_in_allowlist" | "not_in_staff_table" | "inactive";

export type AccessDecision =
  | { allowed: true; staff: { id: string; role: StaffRole } }
  | { allowed: false; reason: DenialReason };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// STAFF_EMAIL_ALLOWLIST : adresses séparées par des virgules.
export function parseAllowlist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map(normalizeEmail)
    .filter((email) => email.length > 0);
}

export async function checkStaffAccess(
  input: { email: string | null | undefined; emailVerified: boolean },
  deps: { allowlist: string[]; findStaff: (email: string) => Promise<StaffRecord | null> },
): Promise<AccessDecision> {
  if (!input.email) return { allowed: false, reason: "missing_email" };
  if (!input.emailVerified) return { allowed: false, reason: "email_not_verified" };

  const email = normalizeEmail(input.email);
  if (!deps.allowlist.includes(email)) return { allowed: false, reason: "not_in_allowlist" };

  const staff = await deps.findStaff(email);
  if (!staff) return { allowed: false, reason: "not_in_staff_table" };
  if (!staff.active) return { allowed: false, reason: "inactive" };

  return { allowed: true, staff: { id: staff.id, role: staff.role } };
}

// Ligne de journal JSON d'un refus : l'adresse est la seule donnée personnelle admise.
export function deniedSignInLogLine(
  email: string | null | undefined,
  reason: DenialReason,
): string {
  return JSON.stringify({
    level: "warn",
    event: "staff_sign_in_denied",
    time: new Date().toISOString(),
    email: email ? normalizeEmail(email) : null,
    reason,
  });
}
