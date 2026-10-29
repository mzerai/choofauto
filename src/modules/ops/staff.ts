import { db } from "@/lib/db";

// Membre du personnel tel que la connexion en a besoin : ni nom, ni adresse renvoyés.
export async function findStaffByEmail(email: string) {
  return db.staffUser.findUnique({
    where: { email },
    select: { id: true, role: true, active: true },
  });
}
