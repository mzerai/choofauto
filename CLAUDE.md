# choofauto - contexte du projet pour Claude Code

Lis ce fichier en entier au début de chaque session, puis `docs/DECISIONS.md` et la tâche en cours dans `docs/PLAN-3-SEMAINES.md`.

## Le projet en une page

choofauto aide les Tunisiens à choisir, financer et acheter une voiture neuve, puis à l'entretenir et la revendre. La promesse : **la bonne voiture, au vrai prix, vraiment disponible**. Signature : « Choof avant d'acheter » / « شوف قبل ما تشري ».

- Le problème : les sites existants affichent des voitures « disponibles » qui ne le sont pas, des fiches fausses et aucun avis fiable. Le marché est contraint par des quotas d'importation.
- Le produit : un catalogue de versions réellement vendues en Tunisie, dont chaque prix, disponibilité et délai est **vérifié, daté et sourcé**, un conseiller IA qui raisonne sur ces faits, et des demandes (devis, essai, financement, assurance) transmises aux professionnels avec le consentement de l'usager.
- Le modèle économique : gratuit pour l'usager, payé par l'écosystème (leasing, banques, assureurs, concessionnaires, marques). Aucun paiement n'influence le classement.
- Le pilote : 30 modèles, Grand Tunis, français et derja tunisienne. Ensuite Maroc, Côte d'Ivoire (adresse et marque adaptées), Algérie (instance locale).
- L'équipe : deux fondateurs. Le fondateur n'est pas développeur : ingénieur en génie industriel, expert en IA et docteur en mathématiques appliquées, il décide, pilote et teste ; c'est toi qui écris tout le code. Chaque heure compte : privilégie la simplicité.

Les documents de référence (spécification, protocole du test de la donnée, maquettes, logo) sont des artefacts claude.ai privés que tu ne peux pas ouvrir : tout ce dont tu as besoin est dans ce dépôt. Si une information manque, demande au fondateur plutôt que de l'inventer.

## Principes non négociables

1. **La donnée vérifiée avant l'IA.** Aucun prix, délai ou disponibilité n'est affiché sans une observation datée, avec sa méthode (devis écrit, visite, appel, site web, document) et son niveau de confiance (haute, moyenne, basse). Le modèle de langage lit la base, il ne la remplace jamais.
2. **Les observations sont en ajout seul.** On n'écrase jamais une observation : on en ajoute une nouvelle. L'état courant (prix actuel, statut actuel) est calculé par une requête ou une vue.
3. **Le pays est une dimension partout.** Toute ligne de catalogue, prix, observation et règle porte un `countryCode` (ISO alpha-2). Une version appartient à un pays.
4. **Les montants sont des entiers en unités mineures** (millimes pour le dinar, `minorUnits = 3`), toujours accompagnés de leur devise. Jamais de nombre à virgule pour de l'argent.
5. **Aucune donnée personnelle d'usager dans cette base.** Téléphones, noms et consentements vivent dans le coffre d'identité hébergé en Tunisie (service séparé, hors du pilote des semaines 1 à 3). Ici, seulement des identifiants pseudonymes. Jamais de donnée personnelle dans un prompt, un événement, un journal ou un message d'erreur.
6. **Indépendance.** Aucun champ, paramètre ou code ne permet à un partenaire payant de modifier un classement ou une donnée de disponibilité. Le déclaratif d'un professionnel est stocké à part et affiché à côté de l'observation, jamais à sa place.
7. **Les agents proposent, les humains publient.** Toute proposition d'un agent passe par `FactStaging` ; seule la publication validée écrit dans les tables publiques (niveau N1). Exception N2 : un prix catalogue confirmé par deux sources indépendantes.

## Pile

- Application : Next.js (App Router), TypeScript `strict`, dossier `src/`, pnpm.
- Base : PostgreSQL 16 avec pgvector ; ORM Prisma, version majeure épinglée (ne pas changer de version majeure sans décision écrite dans `docs/DECISIONS.md`).
- File de tâches : pg-boss sur PostgreSQL au pilote (pas de Redis).
- Hébergement : Google Cloud Run (région Paris, europe-west9) pour l'application, Cloud Run Jobs pour les agents, Cloud SQL, Cloud Storage, Secret Manager ; infrastructure en Terraform dans `infra/`. Cloudflare devant.
- Authentification du personnel : Auth.js avec Google, sessions JWT, liste blanche d'adresses ; pas de tables d'adaptateur. Aucun compte usager au pilote.
- Validation : zod à chaque frontière (formulaires, API, sorties du modèle de langage).
- Tests : Vitest ; Playwright plus tard pour les parcours.
- Erreurs : Sentry. Journaux structurés en JSON, sans donnée personnelle.
- IA : passerelle unique dans `src/lib/llm/`, compatible OpenAI. Modèle principal `claude-haiku-5-5` (API Anthropic) ; repli automatique sur AI Forge (endpoint compatible OpenAI, variables `LLM_FALLBACK_*`) en cas de panne, de quota ou de budget dépassé.
- Python : uniquement dans `workers/python/` pour l'OCR et les traitements lourds, en tâches Cloud Run Jobs qui lisent et écrivent dans la base. Tout le reste en TypeScript.

## Arborescence cible

```
src/
  app/                  pages et routes (admin/ pour le back-office, (public)/ pour le site)
  modules/
    catalog/            marques, modèles, versions, fiches
    observations/       relevés, prix, disponibilités, concurrents, fraîcheur
    partners/           professionnels et showrooms
    ops/                tâches de vérification, temps passé, agents, mise en attente des faits
    rules/              règles fiscales et réglementaires datées
    analytics/          événements
  lib/
    db.ts               client Prisma unique
    llm/                passerelle, filtre de données personnelles, journal des coûts
    auth.ts             Auth.js
    money.ts            conversions millimes <-> affichage
    i18n/               fr, ar, aeb (derja) ; écriture de droite à gauche
workers/
  python/               OCR et traitements lourds
infra/                  Terraform
prisma/                 schema.prisma, migrations, seed.ts
docs/                   DECISIONS.md, PLAN-3-SEMAINES.md
```

Chaque module expose ses fonctions par un `index.ts` ; un module n'importe jamais les fichiers internes d'un autre module, ni ses tables directement. Les tables sont préfixées par module (`catalog_`, `obs_`, `partner_`, `ops_`, `rules_`, `analytics_`, `audit_`).

## Conventions de code

- Identifiants de code en anglais, textes d'interface en français, arabe et derja via `src/lib/i18n`. Aucun texte d'interface en dur dans les composants.
- Textes d'interface : apostrophe typographique (’), guillemets « » en français, **jamais de tiret cadratin** (—) : tiret simple ou ponctuation.
- Dates en UTC dans la base ; affichage au fuseau Africa/Tunis avec `Intl`.
- Pas de `any`. Types dérivés de Prisma et de zod.
- Server Actions pour les formulaires du back-office ; routes `app/api/` seulement pour ce qui est appelé de l'extérieur.
- Chaque écriture faite par un membre du personnel ajoute une ligne à `AuditLog` (acteur, action, avant, après).
- Migrations Prisma nommées en anglais, une migration par changement logique, jamais modifiées après avoir été appliquées.
- Messages de commit au format Conventional Commits (`feat:`, `fix:`, `chore:`…).
- Ajouter une dépendance : seulement si elle évite au moins une demi-journée de travail ; le signaler dans le résumé de la tâche.

## Couche IA

- Aucun appel direct à un SDK de fournisseur hors de `src/lib/llm/`.
- Avant tout appel : passage par le filtre de données personnelles (numéros de téléphone, adresses électroniques, noms détectés) et contrôle du budget mensuel (`LLM_MONTHLY_BUDGET_USD`).
- Sorties structurées : schéma JSON demandé au modèle, validé par zod ; en cas d'échec, une nouvelle tentative, puis rejet.
- Extraction : température 0, chaque fait proposé porte sa citation (document, page, extrait).
- Chaque appel crée ou met à jour un `AgentRun` : fournisseur, modèle, tokens, coût, statut.

## Interface

- Mobile d'abord, cibles tactiles d'au moins 44 px, contraste 4,5:1 pour le texte.
- Police : Readex Pro (arabe et latin). Thèmes Nuit (défaut de marque) et Jour, qui suivent le réglage du système ; le mode showroom force Jour.
- Couleurs : bleu nuit `#0F2A47`, fond nuit `#0B1626` à `#060B14`, orange de marque `#FF6A1F` ; en thème Jour, `#EA580C` pour les éléments graphiques et `#C2410C` pour le texte orange.
- Arabe et derja : `dir="rtl"`, propriétés CSS logiques (`margin-inline-start`…), icônes de voiture retournées dans le sens de lecture.
- Le back-office du pilote reste sobre : il sert à saisir vite et juste, pas à impressionner.

## Commandes

```
docker compose up -d        base locale PostgreSQL + pgvector
pnpm dev                    application en local
pnpm db:migrate             appliquer les migrations
pnpm db:seed                charger le pays, les marques, les 30 modèles et les showrooms
pnpm lint && pnpm typecheck && pnpm test
```

Couper tout VPN d’entreprise avant de lancer pnpm dev : il bloque les appels de Node.js vers Google.

## Façon de travailler

1. Une tâche du plan à la fois, sur une branche à son nom. Lis ses critères d'acceptation avant d'écrire du code.
1. Parle au fondateur en français simple. Quand tu emploies un terme technique, garde-le mais explique-le entre parenthèses la première fois.
1. Avant toute commande qui installe un logiciel sur sa machine, touche à un compte en ligne (GitHub, Google Cloud, Anthropic) ou engage une dépense, explique ce qu'elle fait et attends son accord.
1. Ne lui demande jamais de coller une clé, un mot de passe ou un secret dans la conversation : indique-lui le fichier `.env.local` où les saisir lui-même.
1. À la fin de chaque tâche, donne-lui une recette : trois à cinq vérifications qu'il peut faire lui-même dans le navigateur, chacune avec le résultat attendu.
2. Propose un plan court avant les changements de plus de trois fichiers, et attends l'accord.
3. Avant de dire qu'une tâche est finie : lint, typecheck et tests passent, la migration est générée, et tu résumes ce qui a changé, ce qui reste et les décisions prises.
4. Toute décision d'architecture s'écrit dans `docs/DECISIONS.md` (contexte, décision, conséquences).
5. Ne touche jamais à l'infrastructure de production, aux secrets ou à la facturation sans instruction explicite.
6. En cas de doute sur une règle métier, demande. Ne devine jamais un prix, un délai, une règle fiscale ou un nom de version.
7. AGENTS.md est généré par Next.js ; en cas de contradiction avec CLAUDE.md, CLAUDE.md prime.

## Définition de « fini »

Le code est testé sur le chemin principal et sur un cas d'erreur, les textes passent par l'i18n, aucune donnée personnelle ne sort de son périmètre, les écritures du personnel sont journalisées, et le fondateur peut l'utiliser sans lire le code.
