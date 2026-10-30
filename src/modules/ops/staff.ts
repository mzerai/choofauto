import { db } from "@/lib/db";

// Membre du personnel tel que la connexion en a besoin : ni nom, ni adresse renvoyés.
export async function findStaffByEmail(email: string) {
  return db.staffUser.findUnique({
    where: { email },
    select: { id: true, role: true, active: true },
  });
}

// Rôle et état actuels d'un membre du personnel, relus en base à chaque écriture :
// le jeton de session peut dater de plusieurs heures.
export async function findStaffById(id: string) {
  return db.staffUser.findUnique({
    where: { id },
    select: { id: true, role: true, active: true },
  });
}
