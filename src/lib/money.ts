// Montants en unités mineures : millimes pour le dinar (minorUnits = 3). Jamais de nombre à virgule.

const MILLIMES_PER_DINAR = 1000;

// Un montant est stocké dans un Int PostgreSQL : au plus 2 147 483 647 millimes.
const MAX_MINOR = 2_147_483_647;

// Convertit un prix entier en dinars (tel qu'affiché par un site) en millimes.
// Refuse les nombres non entiers, négatifs ou trop grands au lieu de les arrondir.
export function dinarsToMillimes(dinars: number): number {
  if (!Number.isSafeInteger(dinars) || dinars < 0) {
    throw new RangeError("Montant en dinars invalide : un entier positif est attendu.");
  }
  const minor = dinars * MILLIMES_PER_DINAR;
  if (minor > MAX_MINOR) throw new RangeError("Montant trop grand pour être stocké.");
  return minor;
}
