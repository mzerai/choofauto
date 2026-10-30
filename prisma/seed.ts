// choofauto - données initiales du pilote
// Sources : classement de la Chambre nationale des concessionnaires (fin août 2026), bilan 2025,
// presse spécialisée ; adresses et coordonnées issues de Google Maps au 29 octobre 2026, à confirmer au premier appel.
// Les versions ne sont pas créées ici : le fondateur les nomme dans le back-office le premier jour du test.

import { PrismaClient, Segment, PilotStatus, StaffRole } from "@prisma/client";
import { parseAllowlist } from "../src/lib/auth-access";

const prisma = new PrismaClient();

type BrandSeed = { name: string; slug: string; origin: string };
type ModelSeed = {
  rank: number;
  brand: string;
  name: string;
  slug: string;
  segment: Segment;
  status: PilotStatus;
  reason: string;
};
type SiteSeed = {
  name: string;
  brands: string[];
  address: string | null;
  area: string | null;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
};

const brands: BrandSeed[] = [
  { name: "Kia", slug: "kia", origin: "KR" },
  { name: "Hyundai", slug: "hyundai", origin: "KR" },
  { name: "Suzuki", slug: "suzuki", origin: "JP" },
  { name: "Chery", slug: "chery", origin: "CN" },
  { name: "Renault", slug: "renault", origin: "FR" },
  { name: "Citroën", slug: "citroen", origin: "FR" },
  { name: "Isuzu", slug: "isuzu", origin: "JP" },
  { name: "Fiat", slug: "fiat", origin: "IT" },
  { name: "Mitsubishi", slug: "mitsubishi", origin: "JP" },
  { name: "Toyota", slug: "toyota", origin: "JP" },
  { name: "MG", slug: "mg", origin: "CN" },
  { name: "Peugeot", slug: "peugeot", origin: "FR" },
  { name: "Geely", slug: "geely", origin: "CN" },
  { name: "BYD", slug: "byd", origin: "CN" },
  { name: "Jetour", slug: "jetour", origin: "CN" },
  { name: "Omoda", slug: "omoda", origin: "CN" },
  { name: "Jaecoo", slug: "jaecoo", origin: "CN" },
  { name: "Lynk & Co", slug: "lynk-co", origin: "CN" },
  { name: "Haval", slug: "haval", origin: "CN" },
];

const S = Segment;
const C = PilotStatus.CONFIRMED;
const TC = PilotStatus.TO_CONFIRM;
const TI = PilotStatus.TO_IDENTIFY;

const models: ModelSeed[] = [
  { rank: 1, brand: "Kia", name: "Picanto", slug: "kia-picanto", segment: S.CITY_CAR, status: C, reason: "Première vente 2025 et 2026 (Chambre, fin août 2026)" },
  { rank: 2, brand: "Hyundai", name: "Grand i10", slug: "hyundai-grand-i10", segment: S.CITY_CAR, status: C, reason: "Voiture populaire, en croissance (Chambre, fin août 2026)" },
  { rank: 3, brand: "Suzuki", name: "Celerio", slug: "suzuki-celerio", segment: S.CITY_CAR, status: C, reason: "Voiture populaire, prix le plus bas du segment" },
  { rank: 4, brand: "Chery", name: "Tiggo 1X", slug: "chery-tiggo-1x", segment: S.SUV_SMALL, status: C, reason: "Voiture populaire, ventes multipliées par sept en un an" },
  { rank: 5, brand: "Renault", name: "Kwid", slug: "renault-kwid", segment: S.CITY_CAR, status: C, reason: "Voiture populaire (Chambre, fin août 2026)" },
  { rank: 6, brand: "Citroën", name: "C3", slug: "citroen-c3", segment: S.CITY_CAR, status: C, reason: "Leader mensuel des populaires en mai 2026" },
  { rank: 7, brand: "Isuzu", name: "D-Max", slug: "isuzu-d-max", segment: S.PICKUP, status: C, reason: "Deuxième vente 2025, leader des utilitaires" },
  { rank: 8, brand: "Fiat", name: "Doblo", slug: "fiat-doblo", segment: S.MPV, status: C, reason: "Cinquième vente 2025" },
  { rank: 9, brand: "Citroën", name: "Berlingo", slug: "citroen-berlingo", segment: S.MPV, status: C, reason: "Sixième vente 2025" },
  { rank: 10, brand: "Mitsubishi", name: "Attrage", slug: "mitsubishi-attrage", segment: S.SEDAN, status: C, reason: "Classement des populaires 2026" },
  { rank: 11, brand: "Hyundai", name: "i20", slug: "hyundai-i20", segment: S.CITY_CAR, status: TC, reason: "Meilleure vente 2024" },
  { rank: 12, brand: "Hyundai", name: "Tucson", slug: "hyundai-tucson", segment: S.SUV_COMPACT, status: TC, reason: "SUV de référence de la première marque" },
  { rank: 13, brand: "Kia", name: "Sportage", slug: "kia-sportage", segment: S.SUV_COMPACT, status: TC, reason: "SUV de référence de la deuxième marque" },
  { rank: 14, brand: "Toyota", name: "Yaris", slug: "toyota-yaris", segment: S.CITY_CAR, status: TC, reason: "Toyota, cinquième marque" },
  { rank: 15, brand: "Toyota", name: "Hilux", slug: "toyota-hilux", segment: S.PICKUP, status: TC, reason: "Pick-up de référence, achats d'entreprises" },
  { rank: 16, brand: "Suzuki", name: "Swift", slug: "suzuki-swift", segment: S.CITY_CAR, status: TC, reason: "Suzuki, quatrième marque en voitures particulières" },
  { rank: 17, brand: "Renault", name: "Clio", slug: "renault-clio", segment: S.CITY_CAR, status: TC, reason: "Renault, cinquième marque en voitures particulières" },
  { rank: 18, brand: "Chery", name: "Tiggo 7 Pro", slug: "chery-tiggo-7-pro", segment: S.SUV_COMPACT, status: TC, reason: "Montée en gamme de la première marque chinoise" },
  { rank: 19, brand: "MG", name: "ZS", slug: "mg-zs", segment: S.SUV_SMALL, status: TC, reason: "Deuxième marque chinoise" },
  { rank: 20, brand: "Peugeot", name: "208", slug: "peugeot-208", segment: S.CITY_CAR, status: TC, reason: "Cas d'école : disponibilité affichée sans voiture" },
  { rank: 21, brand: "Geely", name: "EX5", slug: "geely-ex5", segment: S.SUV_COMPACT, status: C, reason: "SUV électrique, prix annoncé dans la presse" },
  { rank: 22, brand: "Geely", name: "EX5 EM-i", slug: "geely-ex5-em-i", segment: S.SUV_COMPACT, status: C, reason: "Hybride rechargeable, prix annoncé dans la presse" },
  { rank: 23, brand: "Geely", name: "X2", slug: "geely-x2", segment: S.CITY_CAR, status: C, reason: "Citadine électrique d'entrée de gamme" },
  { rank: 24, brand: "BYD", name: "Électrique d'entrée (à identifier)", slug: "byd-electrique-entree", segment: S.CITY_CAR, status: TI, reason: "Électrique le moins cher du marché selon la presse" },
  { rank: 25, brand: "BYD", name: "Hybride rechargeable (à identifier)", slug: "byd-hybride-rechargeable", segment: S.SUV_COMPACT, status: TI, reason: "Prix qui bouscule le segment selon la presse" },
  { rank: 26, brand: "Jetour", name: "Dashing", slug: "jetour-dashing", segment: S.SUV_COMPACT, status: TC, reason: "Présenté par son distributeur comme le C-SUV thermique le plus vendu" },
  { rank: 27, brand: "Omoda", name: "5", slug: "omoda-5", segment: S.SUV_COMPACT, status: TC, reason: "Marque arrivée en 2026" },
  { rank: 28, brand: "Jaecoo", name: "J7", slug: "jaecoo-j7", segment: S.SUV_COMPACT, status: TC, reason: "Même réseau qu'Omoda, positionnement plus haut" },
  { rank: 29, brand: "Lynk & Co", name: "01", slug: "lynk-co-01", segment: S.SUV_COMPACT, status: TC, reason: "Marque nouvelle, sans historique local" },
  { rank: 30, brand: "Haval", name: "Jolion", slug: "haval-jolion", segment: S.SUV_SMALL, status: TC, reason: "Modèle d'entrée de la marque" },
];

const sites: SiteSeed[] = [
  { name: "KIA Motors Les Jardins d'El Menzah", brands: ["Kia"], address: "Route X20, Les Jardins d'El Menzah, Ariana 2094", area: "Ariana", lat: 36.8536836, lng: 10.1375086, placeId: "ChIJc8Vbzwsz_RIRshLoCyO4MaA" },
  { name: "City Cars", brands: ["Kia"], address: "31 rue des Usines, zone industrielle, Le Kram 2089", area: "La Goulette - Le Kram", lat: 36.834471, lng: 10.304277, placeId: "ChIJiTJNS200_RIRkoiO1evIn7U" },
  { name: "Hyundai Motor Tunisie", brands: ["Hyundai"], address: "35 rue de l'Industrie, Charguia 1, 2035", area: "Charguia", lat: 36.8342875, lng: 10.2042309, placeId: "ChIJE3oHbgo1_RIRJCVH-_Ynyi0" },
  { name: "Carpro Suzuki", brands: ["Suzuki"], address: "Tunis sud, code Q6G5+R8G", area: "Tunis sud", lat: 36.7770659, lng: 10.2083272, placeId: "ChIJJQ-J5YM1_RIR6WSbyQtxdmQ" },
  { name: "STA, Société Tunisienne d'Automobile", brands: ["Chery"], address: "Zone industrielle Borj Ghorbel, Ben Arous", area: "Ben Arous", lat: 36.7272003, lng: 10.2470716, placeId: "ChIJxdn_wzI2_RIRras7CxYsJ7k" },
  { name: "Renault Ben Arous, Henchiri et Cie", brands: ["Renault"], address: "Avenue de la République, Ben Arous 2013", area: "Ben Arous", lat: 36.7460569, lng: 10.2261674, placeId: "ChIJBc6001w2_RIRlb-vqFtZm7Y" },
  { name: "Concession officielle Citroën Mnihla", brands: ["Citroën"], address: "Km 8, route R31, Cebalat Ben Ammar 2094", area: "Ariana", lat: 36.878221, lng: 10.1156444, placeId: "ChIJO6iSIiXN4hIRH0oA45znbWk" },
  { name: "Afrique Auto", brands: ["Isuzu"], address: "Rue de l'Artisanat, Charguia 2", area: "Charguia", lat: 36.8506731, lng: 10.207054, placeId: "ChIJ2w-SC9E0_RIRgqu4SI-ZSlY" },
  { name: "Fiat Parc", brands: ["Fiat"], address: "Naassen", area: "Ben Arous", lat: 36.6990998, lng: 10.2224597, placeId: "ChIJ8xSroJs3_RIRMW2CbA3Xloo" },
  { name: "Fast Car by Italcar", brands: ["Fiat"], address: "La Goulette", area: "La Goulette - Le Kram", lat: 36.835558, lng: 10.302353, placeId: "ChIJ1YOWkFlL_RIR7Y67MLMVl9A" },
  { name: "Showroom Mitsubishi (à localiser)", brands: ["Mitsubishi"], address: null, area: null, lat: null, lng: null, placeId: null },
  { name: "BSB, showroom Toyota centre-ville", brands: ["Toyota"], address: "Tunis centre", area: "Tunis centre", lat: 36.8011446, lng: 10.1838531, placeId: "ChIJ1dMceW40_RIR7ENd7l3tPzM" },
  { name: "BSB Ben Arous", brands: ["Toyota"], address: "Ben Arous", area: "Ben Arous", lat: 36.7425754, lng: 10.2565568, placeId: "ChIJTYglIyE2_RIR0aOib4ikmt8" },
  { name: "Showroom MG (à localiser)", brands: ["MG"], address: null, area: null, lat: null, lng: null, placeId: null },
  { name: "Stafim Group", brands: ["Peugeot"], address: "Avenue Louis Braille, Tunis", area: "Tunis centre", lat: 36.8274158, lng: 10.1918633, placeId: "ChIJAwv3pZI0_RIRyhE7wb99tpw" },
  { name: "Showroom Peugeot Le Lac", brands: ["Peugeot"], address: "Rue du Lac Léman, Les Berges du Lac, Tunis 1053", area: "Lac", lat: 36.8398501, lng: 10.2425275, placeId: "ChIJwxpavUY1_RIRqKTdGWhFz3s" },
  { name: "Geely Tunis, Sotudis", brands: ["Geely"], address: "Parc industriel, route N1, Ben Arous 2013", area: "Ben Arous", lat: 36.7619284, lng: 10.2305706, placeId: "ChIJTQDeX383_RIRAbqqDNEk3J4" },
  { name: "BYD Tunisie, Helios (Ben Arous)", brands: ["BYD"], address: "Rue Al Harir, zone industrielle Bir El Kassâa, Ben Arous 2059", area: "Ben Arous", lat: 36.7382841, lng: 10.2218916, placeId: "ChIJ2WQiKiU3_RIRV2HrUZ4nQVY" },
  { name: "Wallyscar Automobiles (Wallys Motors)", brands: ["Jetour"], address: "190 avenue du 15 Octobre 1963, Kabaria, Tunis Sud 2054", area: "Tunis sud", lat: 36.7617777, lng: 10.1950883, placeId: "ChIJMUC91Jk2_RIRccF9ChHcvwM" },
  { name: "Omoda & Jaecoo Tunisie", brands: ["Omoda", "Jaecoo"], address: "Rue de l'Industrie, Charguia 1070", area: "Charguia", lat: 36.8346094, lng: 10.2036992, placeId: "ChIJxd4r4101_RIRK9quAycPn3c" },
  { name: "Lynk & Co Tunisie, Universal Motors", brands: ["Lynk & Co"], address: "Immeuble Lolite, 44 rue Platon, La Goulette 2015", area: "La Goulette - Le Kram", lat: 36.8323852, lng: 10.3006425, placeId: "ChIJ4Sotp6JL_RIRRTrAMoGxnyA" },
  { name: "Atlas Auto (GWM, Haval, Foton)", brands: ["Haval"], address: "Km 6,5 route de Sousse, Ben Arous 2013", area: "Ben Arous", lat: 36.758452, lng: 10.238385, placeId: "ChIJufZvpRI2_RIRtEaXaUJKFKQ" },
];

async function main(): Promise<void> {
  // Lue dans .env.local en local (option --env-file-if-exists du script db:seed), dans l'environnement en ligne.
  const staffEmails = parseAllowlist(process.env.STAFF_EMAIL_ALLOWLIST);
  if (staffEmails.length === 0) {
    throw new Error("STAFF_EMAIL_ALLOWLIST est vide : saisissez les adresses du personnel dans .env.local.");
  }

  await prisma.country.upsert({
    where: { code: "TN" },
    update: {},
    create: {
      code: "TN",
      name: "Tunisie",
      currency: "TND",
      minorUnits: 3,
      locales: ["fr-TN", "ar-TN", "aeb-Arab-TN"],
    },
  });

  const brandIds = new Map<string, string>();
  for (const b of brands) {
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { name: b.name, origin: b.origin },
      create: { name: b.name, slug: b.slug, origin: b.origin },
    });
    brandIds.set(b.name, brand.id);
  }

  for (const m of models) {
    const brandId = brandIds.get(m.brand);
    if (!brandId) throw new Error(`Marque inconnue : ${m.brand}`);
    await prisma.model.upsert({
      where: { slug: m.slug },
      // Le nom et le statut se corrigent dans le back-office : le seed ne les fixe qu'à la création.
      update: { segment: m.segment, pilotRank: m.rank, pilotReason: m.reason },
      create: {
        brandId,
        name: m.name,
        slug: m.slug,
        segment: m.segment,
        pilotRank: m.rank,
        pilotStatus: m.status,
        pilotReason: m.reason,
      },
    });
  }

  for (const s of sites) {
    const existing = await prisma.proSite.findFirst({ where: { name: s.name, countryCode: "TN" } });
    const site =
      existing ??
      (await prisma.proSite.create({
        data: {
          countryCode: "TN",
          name: s.name,
          address: s.address,
          area: s.area,
          latitude: s.lat,
          longitude: s.lng,
          googlePlaceId: s.placeId,
        },
      }));
    for (const brandName of s.brands) {
      const brandId = brandIds.get(brandName);
      if (!brandId) throw new Error(`Marque inconnue : ${brandName}`);
      await prisma.proSiteBrand.upsert({
        where: { siteId_brandId: { siteId: site.id, brandId } },
        update: {},
        create: { siteId: site.id, brandId },
      });
    }
  }

  // Comptes du personnel : une adresse de STAFF_EMAIL_ALLOWLIST, un fondateur. Les vraies adresses
  // ne sont jamais écrites dans le code ; un compte existant n'est pas modifié (rôle, nom, actif).
  for (const email of staffEmails) {
    await prisma.staffUser.upsert({
      where: { email },
      update: {},
      create: { email, name: email.split("@")[0] ?? email, role: StaffRole.FOUNDER },
    });
  }

  // Réglages : coûts horaires en millimes, à saisir par le fondateur (0 tant qu'ils ne sont pas connus).
  const settings: Array<{ key: string; value: number }> = [
    { key: "hourly_cost_minor.founder", value: 0 },
    { key: "hourly_cost_minor.intern", value: 0 },
    { key: "llm.monthly_budget_usd", value: 50 },
    { key: "freshness.half_life_days.price", value: 30 },
    { key: "freshness.half_life_days.availability", value: 7 },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: { key: s.key, value: s.value } });
  }

  console.log(
    `Chargé : ${brands.length} marques, ${models.length} modèles, ${sites.length} showrooms, ${staffEmails.length} comptes du personnel.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
