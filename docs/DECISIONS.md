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

## 0013 - Connexion du personnel avec Auth.js v5

- Contexte : la décision 0009 retient Auth.js. Sa génération actuelle (v5) n'existe qu'en version bêta ; la v4, stable, est l'ancienne génération, avec une autre configuration. Next.js 16 a renommé le middleware en « proxy ».
- Décision : `next-auth` 5.0.0-beta.32 épinglé à la version exacte, fournisseur Google, sessions JWT de 12 heures, sans adaptateur. Une connexion entre seulement si Google déclare l'adresse vérifiée (`email_verified`), si l'adresse figure dans `STAFF_EMAIL_ALLOWLIST` et si elle existe dans `StaffUser` avec `active` à true ; la règle vit dans `src/lib/auth-access.ts`, testée sans Auth.js. Un refus écrit une ligne de journal JSON qui ne contient que l'adresse et le motif. Le rôle et l'identifiant `StaffUser` sont placés dans le jeton à la connexion, puis exposés dans la session. `src/proxy.ts` renvoie vers `/connexion` toute requête `/admin` sans session ; chaque page d'admin revérifie la session. Le seed crée un fondateur par adresse de `STAFF_EMAIL_ALLOWLIST` ; il charge `.env.local` avec l'option intégrée de Node `--env-file-if-exists` (sans dépendance, sans effet si le fichier manque, comme en intégration continue où des adresses fictives `example.com` sont fournies). `pnpm test:db` lit `.env.local` de la même façon.
- Conséquences : une version bêta d'Auth.js est acceptable pour le back-office du personnel (quelques comptes connus, sur liste blanche), mais ce choix devra être réexaminé avant d'ouvrir des comptes au public. Désactiver un compte (`active` à false) bloque la connexion suivante ; une session déjà ouverte reste valable au plus 12 heures. Toute montée de version d'Auth.js se fait explicitement, en relisant les notes de version.

## 0014 - Validation avec zod, styles sans bibliothèque

- Contexte : CLAUDE.md impose zod à chaque frontière ; le back-office doit rester sobre et rapide à maintenir, et le fondateur préfère ne pas ajouter de bibliothèque de composants.
- Décision : `zod` 4 pour valider chaque formulaire et chaque écriture. Aucune bibliothèque de style ni de composants : une seule feuille `src/app/globals.css`, avec les couleurs de marque en variables (thème Nuit par défaut, thème Jour si le système le demande ; en Jour, les boutons orange utilisent `#C2410C`, car `#EA580C` n'atteint pas le contraste 4,5:1 avec un texte blanc), des propriétés logiques pour l'arabe et des cibles tactiles de 44 px. Les blocs dépliables utilisent `<details>`, sans JavaScript. La police Readex Pro est servie par `next/font`, inclus dans Next.js.
- Conséquences : aucune dépendance d'interface à mettre à jour. Si les écrans se multiplient au point de dupliquer beaucoup de styles, la question d'une bibliothèque sera rouverte ici.

## 0015 - Droits et audit des écritures du back-office

- Contexte : seuls certains rôles modifient le catalogue ; chaque écriture du personnel doit être journalisée ; une session reste valable jusqu'à 12 heures (décision 0013).
- Décision : chaque fonction d'écriture d'un module reçoit l'acteur (`staffId`, rôle) et vérifie elle-même ses droits (`src/lib/permissions.ts`) avant de valider les données. Les Server Actions relisent le rôle et l'état `active` en base à chaque écriture, au lieu de se fier au jeton. La ligne `AuditLog` (acteur, action, avant, après) est écrite par `src/lib/audit.ts` dans la même transaction que l'écriture. Rien ne se supprime dans le catalogue : une version se désactive, et une version désactivée cesse d'être suivie. Un nom de version est unique par modèle et par pays, et un nom de modèle par marque, sans tenir compte des majuscules ni des espaces en début et en fin. Le renommage d'un modèle ne change ni son rang, ni son slug, ni son statut. Le seed ne fixe le nom et le statut d'un modèle qu'à sa création.
- Conséquences : un compte désactivé ou rétrogradé ne peut plus écrire, même avec une session ouverte. Une écriture sans sa ligne d'audit est impossible. Relancer le seed ne défait plus les corrections faites dans le back-office.
