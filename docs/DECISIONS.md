# Décisions d'architecture

Chaque décision : contexte, décision, conséquences. On ajoute, on ne réécrit pas : une décision remplacée reste ici avec la mention « remplacée par ».

## 0001 - Cloud Run en développement et en production

- Contexte : deux fondateurs, aucun administrateur système, trafic faible au départ et irrégulier ensuite.
- Décision : Cloud Run (région Paris) pour l'application, Cloud Run Jobs pour les agents, Cloud SQL pour PostgreSQL, Cloud Storage pour les fichiers, Secret Manager, le tout décrit en Terraform. Pas de VPS.
- Conséquences : aucune machine à maintenir, sauvegardes et restauration gérées, mise à l'échelle automatique. Le même conteneur peut repartir sur un VPS ou sur Kubernetes si le coût ou le volume l'exigent. Budgets et alertes obligatoires, nombre maximal d'instances plafonné.

## 0002 - TypeScript partout, Python pour les traitements lourds

- Contexte : un seul développeur, assisté de Claude Code.
- Décision : Next.js et TypeScript pour l'application, le back-office et les agents ; Python seulement dans `workers/python/` pour l'OCR et les traitements lourds, en tâches séparées qui communiquent par la base.
- Conséquences : une seule chaîne d'outils au quotidien, des types partagés entre l'interface, l'API et les agents.

## 0003 - PostgreSQL 16, pgvector, Prisma 6, pas de Redis au pilote

- Contexte : besoin de transactions, de recherche vectorielle pour le conseiller et d'une file de tâches, sans multiplier les services.
- Décision : PostgreSQL 16 avec l'extension pgvector ; Prisma 6.x épinglé (schéma validé avec la 6.19) ; file de tâches pg-boss sur PostgreSQL. Redis seulement à partir de la V1, si la charge le justifie.
- Conséquences : un seul système de données à sauvegarder. Les colonnes vectorielles se lisent et s'écrivent en SQL brut, Prisma ne les gérant pas nativement.

## 0004 - Coffre d'identité en Tunisie

- Contexte : loi tunisienne sur les données personnelles et contrôle de l'INPDP ; partenaires bancaires et assureurs attentifs à la conformité.
- Décision : téléphones, consentements et coordonnées des demandes vivent dans un service séparé hébergé en Tunisie, qui transmet lui-même les contacts aux partenaires. La plateforme sur Google Cloud ne manipule que des identifiants pseudonymes.
- Conséquences : aucune donnée personnelle d'usager dans la base principale, les prompts, les événements ou les journaux. Le coffre est construit avant la bêta publique, pas pendant les semaines 1 à 3.

## 0005 - Observations en ajout seul

- Décision : prix, disponibilités et observations concurrentes ne sont jamais modifiés ni supprimés ; l'état courant est calculé.
- Conséquences : historique complet, preuve de chaque affichage, calcul de la fraîcheur et de l'écart entre déclaratif et observé.

## 0006 - Montants en unités mineures

- Décision : entiers en millimes pour le dinar, avec la devise sur chaque montant ; conversions dans `src/lib/money.ts`.
- Conséquences : aucune erreur d'arrondi. Un montant unitaire est plafonné à environ 2,1 millions de dinars, ce qui suffit pour un prix de voiture ; les agrégats se calculent en SQL.

## 0007 - Modules par préfixe de table

- Contexte : la spécification prévoit un schéma de base par module.
- Décision : au pilote, un seul schéma PostgreSQL et des tables préfixées par module (`catalog_`, `obs_`, `partner_`, `ops_`, `rules_`, `analytics_`, `audit_`), les frontières étant tenues dans le code (`src/modules/`).
- Conséquences : simplicité avec Prisma ; passage à des schémas PostgreSQL séparés le jour où un module est extrait en service.

## 0008 - Une passerelle unique pour les modèles de langage

- Décision : tous les appels passent par `src/lib/llm/`, compatible OpenAI. Modèle principal Claude Haiku (`claude-haiku-5-5`), repli automatique sur AI Forge. Filtre de données personnelles et contrôle de budget avant chaque appel ; coûts journalisés dans `AgentRun`.
- Conséquences : changer de modèle ou de fournisseur se fait par configuration.

## 0009 - Authentification

- Décision : personnel seulement au pilote, par Google avec Auth.js, sessions JWT et liste blanche d'adresses ; pas de tables d'adaptateur. Les usagers naviguent et consultent le conseiller sans compte ; leur téléphone sera vérifié à la première demande (Google Identity Platform en bêta).
- Conséquences : aucun mot de passe à gérer, moins de données personnelles.

## 0010 - Autonomie des agents

- Décision : niveau N1 par défaut (l'agent propose dans `FactStaging`, un humain publie) ; niveau N2 pour un prix catalogue confirmé par deux sources indépendantes ; aucun relèvement de niveau sans un mois de mesures.
- Conséquences : la qualité de la donnée publiée ne dépend jamais d'un seul appel au modèle.

## 0011 - Versions de l'outillage et sécurité des dépendances

- Contexte : un dépôt construit à la fois sur l'ordinateur du fondateur et dans GitHub Actions ; risque de paquets piégés publiés récemment sur le registre npm.
- Décision : Node 24 et pnpm 12.16.1 (champ `packageManager`) partout ; installation en intégration continue avec `pnpm install --frozen-lockfile`. Dans `pnpm-workspace.yaml`, `minimumReleaseAge` refuse toute version publiée il y a moins de 7 jours, et `allowBuilds` liste les seuls paquets autorisés à exécuter un script à l'installation (esbuild, unrs-resolver). TypeScript reste en 6.0 et ESLint en 9 tant que les règles ESLint de Next.js ne prennent pas en charge TypeScript 7 et ESLint 10.
- Conséquences : mêmes versions en local et en ligne ; une mise à jour urgente de sécurité publiée depuis moins de 7 jours demande une exception explicite (`minimumReleaseAgeExclude`). Pas de changement de version majeure de Node, pnpm, TypeScript ou ESLint sans décision écrite ici.

## 0012 - Variables d'environnement locales et base de développement

- Contexte : l'outil en ligne de commande de Prisma lit `.env`, Next.js lit `.env` puis `.env.local` ; sur l'ordinateur du fondateur, les ports 5432 et 5433 sont déjà pris par d'autres projets.
- Décision : `.env` ne contient que `DATABASE_URL` (base locale, sans secret), lue par Prisma comme par Next.js ; `.env.local` contient les secrets. Les deux sont ignorés par git (`.env*`, sauf `.env.example`). La base locale écoute sur le port 5434. Prisma 6.19.3 est épinglé à la version exacte ; `prisma`, `@prisma/client` et `@prisma/engines` rejoignent `allowBuilds` (téléchargement du moteur et génération du client), et `pnpm install` régénère le client (`postinstall`). Les tests qui interrogent la base vivent dans `tests/db/` et passent par `pnpm test:db` ; `pnpm test` reste sans base. En intégration continue, un service PostgreSQL pgvector reçoit les migrations et deux passages du seed avant `pnpm test:db`.
- Conséquences : aucun outil supplémentaire pour charger les variables. `DATABASE_URL` ne doit jamais être recopiée dans `.env.local`. `pnpm test:db` exige `docker compose up -d`, les migrations et le seed.
