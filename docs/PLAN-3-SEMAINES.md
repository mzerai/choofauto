# Plan des trois premières semaines

Claude Code écrit le code ; le fondateur pilote et fait la recette, environ huit à dix heures par semaine. Une tâche à la fois, sur sa propre branche. La tâche 1.3 (infrastructure en ligne) peut attendre la semaine 3 : tout fonctionne d'abord sur l'ordinateur du fondateur. Chaque tâche indique son objectif, ses critères d'acceptation, une estimation, et la consigne à donner telle quelle à Claude Code.

Le test de la donnée démarre en parallèle avec le tableur (`choofauto_grille_de_releve.xlsx`) ; l'outil de relevé de la semaine 2 prend le relais, et la tâche 2.5 importe les lignes déjà saisies.

---

## Semaine 1 - Les fondations (2 au 8 novembre)

### 1.1 Initialiser le dépôt (3 h)

Critères : `pnpm dev`, `pnpm lint`, `pnpm typecheck` et `pnpm test` passent ; l'arborescence de `CLAUDE.md` existe ; intégration continue sur GitHub Actions au vert.

> Lis CLAUDE.md et docs/DECISIONS.md. Initialise une application Next.js (App Router, TypeScript strict, dossier src/) avec pnpm, ESLint, Prettier et Vitest. Crée l'arborescence décrite dans CLAUDE.md, sans code métier, avec un index.ts vide par module. Ajoute les scripts dev, build, lint, typecheck, test, db:migrate et db:seed (seed avec tsx). Ajoute un workflow GitHub Actions qui lance lint, typecheck et test à chaque push. Vérifie que tout passe et résume ce que tu as fait.

### 1.2 Base de données locale et chargement initial (3 h)

Critères : `docker compose up -d` lance PostgreSQL avec pgvector ; la première migration crée toutes les tables du schéma ; `pnpm db:seed` charge la Tunisie, 19 marques, 30 modèles et 22 showrooms sans erreur, et peut être relancé sans créer de doublons.

> Installe Prisma 6 (version épinglée) et le client. Utilise prisma/schema.prisma et prisma/seed.ts tels qu'ils sont dans le dépôt. Crée src/lib/db.ts avec un client Prisma unique. Génère la migration initiale nommée init, applique-la sur la base de docker-compose.yml, lance le seed deux fois de suite et vérifie qu'il n'y a pas de doublon. Ne modifie pas le schéma sans me le demander.

### 1.3 Infrastructure Google Cloud en Terraform (6 h)

Critères : `terraform apply` crée un environnement de développement : Artifact Registry, Cloud Run (minimum 0, maximum 3 instances, région europe-west9), Cloud SQL PostgreSQL 16 avec pgvector au plus petit gabarit, un bucket Cloud Storage, les secrets dans Secret Manager, des comptes de service au moindre privilège, un budget mensuel avec alertes à 50 et 80 %. Le workflow déploie l'application sur Cloud Run à chaque fusion sur main.

> Dans infra/, écris la configuration Terraform de l'environnement de développement décrite ici, avec des variables pour le projet, la région (europe-west9) et le compte de facturation. Pas de secret en clair : les valeurs sont saisies dans Secret Manager. Connexion de Cloud Run à Cloud SQL par le connecteur Cloud SQL. Ajoute le déploiement sur Cloud Run dans GitHub Actions, avec authentification par fédération d'identité de charge de travail, sans clé de compte de service. Montre-moi le plan Terraform avant tout apply, et ne lance jamais apply toi-même.

### 1.4 Connexion du personnel (3 h)

Critères : `/admin` exige une connexion Google ; seules les adresses de `STAFF_EMAIL_ALLOWLIST` présentes dans `StaffUser` et actives entrent ; le rôle est disponible dans la session ; une connexion refusée est journalisée sans donnée personnelle au-delà de l'adresse.

> Mets en place Auth.js avec le fournisseur Google, sessions JWT, sans adaptateur de base. Au rappel signIn, vérifie que l'adresse est dans STAFF_EMAIL_ALLOWLIST et dans la table StaffUser avec active à true. Expose le rôle dans la session. Protège tout app/admin par un middleware. Ajoute des tests pour un accès autorisé et un accès refusé.

### 1.5 Observabilité (2 h)

Critères : Sentry reçoit les erreurs serveur et client ; une route `/api/health` vérifie la base ; les journaux sont en JSON et ne contiennent ni adresse électronique d'usager, ni téléphone.

> Intègre Sentry à l'application, ajoute /api/health qui vérifie la connexion à la base, et un journal structuré en JSON dans src/lib/log.ts avec une fonction qui masque les numéros de téléphone et les adresses électroniques. Teste le masquage.

---

## Semaine 2 - L'outil de relevé (9 au 15 novembre)

### 2.1 Catalogue et versions dans le back-office (3 h)

Critères : liste des 30 modèles avec leur statut ; ajout, renommage et suivi (`isTracked`) des versions d'un modèle ; chaque écriture est journalisée dans `AuditLog`.

> Crée app/admin/catalogue : la liste des modèles du pilote triés par rang, avec leur statut, et pour chaque modèle ses versions en Tunisie. Permets d'ajouter une version (nom, motorisation, voiture populaire oui ou non) et de la marquer suivie. Server Actions, validation zod, journal d'audit à chaque écriture. Interface mobile d'abord, textes via l'i18n.

### 2.2 Saisie d'un relevé (6 h)

Critères : depuis un téléphone, on choisit un showroom, une version suivie et une méthode, puis on saisit prix, carte grise incluse, frais, offre, statut, délai, couleurs, financement évoqué, fonction de l'interlocuteur, durée et remarques, plus le prix et le statut affichés par automobile.tn ; un bouton « Pas de réponse » crée le relevé en une touche. Un relevé crée un `FieldCheck`, un `PricePoint`, une `AvailabilityObservation` et une `CompetitorObservation`, dans une seule transaction, sans jamais modifier une ligne existante.

> Crée app/admin/releves/nouveau : le formulaire de relevé décrit dans docs/PLAN-3-SEMAINES.md, tâche 2.2. Les prix se saisissent en dinars et sont stockés en millimes via src/lib/money.ts, avec des tests de conversion. Les listes de statut, de méthode et de confiance viennent des énumérations du schéma. Une seule transaction par relevé, en ajout seul. Pense au pouce : gros champs, clavier numérique pour les prix, enregistrement en moins de trente secondes.

### 2.3 Tâches de la semaine (3 h)

Critères : chaque lundi, une tâche par couple version suivie et showroom de sa marque ; vue « Mes tâches du jour » ; une tâche se ferme quand un relevé y est rattaché.

> Crée la génération hebdomadaire des VerificationTask (une par version suivie et par showroom qui vend sa marque), déclenchable à la main depuis le back-office pour l'instant. Ajoute la vue des tâches ouvertes, triées par priorité et échéance, et rattache automatiquement le relevé à sa tâche.

### 2.4 Tableau des quatre mesures (4 h)

Critères : coût par fait vérifié, taux d'écart des prix et des statuts avec automobile.tn, fraîcheur médiane par version, taux de réponse, durée moyenne d'un relevé ; saisie du temps passé par jour ; mêmes résultats que l'onglet Synthèse du tableur sur les mêmes données.

> Crée app/admin/mesures : les mesures du test de la donnée calculées en SQL à partir des tables obs_ et ops_, et un formulaire de saisie du temps passé (TimeEntry). Les coûts horaires viennent de la table Setting. Écris des tests sur un petit jeu de données dont tu connais les résultats.

### 2.5 Import du tableur et export (2 h)

Critères : import des lignes de l'onglet Relevés du tableur, avec rapport des lignes rejetées ; export CSV de tous les relevés.

> Écris un script d'import de choofauto_grille_de_releve.xlsx (onglet Relevés) vers les tables d'observations, qui associe modèles et showrooms par leur nom, refuse les lignes incomplètes et produit un rapport. Ajoute un export CSV des relevés dans le back-office.

---

## Semaine 3 - Extraction et fraîcheur (16 au 22 novembre)

### 3.1 Passerelle des modèles de langage (5 h)

Critères : un client unique compatible OpenAI ; Claude Haiku en principal, AI Forge en repli après échec ou dépassement de budget ; filtre de données personnelles avant l'envoi ; sorties JSON validées par zod avec une nouvelle tentative ; chaque appel journalisé dans `AgentRun` avec tokens et coût.

> Dans src/lib/llm/, écris la passerelle décrite dans CLAUDE.md, section Couche IA, et docs/DECISIONS.md, décision 0008. Configuration par variables d'environnement. Tests avec des faux fournisseurs : réponse correcte, JSON invalide puis corrigé, panne du principal et bascule sur le repli, budget dépassé, données personnelles masquées.

### 3.2 Agent d'extraction des brochures et listes de prix (6 h)

Critères : un PDF déposé dans le back-office est stocké dans Cloud Storage, son texte extrait (OCR en Python si le PDF est une image), puis le modèle propose des faits (version, caractéristiques, prix catalogue) avec leur citation ; les propositions arrivent dans `FactStaging` en attente. Cinq brochures réelles traitées sans erreur.

> Crée l'agent d'extraction : dépôt d'un document (Document et Source), extraction du texte, appel de la passerelle avec un schéma JSON par type de fait, citations obligatoires (page et extrait), écriture dans FactStaging au statut PENDING. Le traitement tourne comme tâche asynchrone (pg-boss en local, Cloud Run Job en ligne). L'OCR est un petit worker Python dans workers/python/, appelé seulement si le PDF n'a pas de couche texte.

### 3.3 File de validation (3 h)

Critères : une vue liste les faits en attente avec leur citation et le document source ; valider publie dans la bonne table avec la méthode DOCUMENT et une confiance basse ; refuser demande un motif ; tout est journalisé.

> Crée app/admin/validation : les faits en attente, chacun avec son extrait cité et un lien vers le document. Valider écrit le fait publié (spécification dans Version.specs, prix dans PricePoint), refuser enregistre le motif. Respecte la décision 0010 sur les niveaux N1 et N2.

### 3.4 Horloge de fraîcheur (3 h)

Critères : après chaque relevé ou publication, la confiance et la prochaine vérification du fait sont recalculées selon sa demi-vie (réglages de `Setting`) ; la génération des tâches de la semaine priorise les faits dont la confiance est la plus basse.

> Implémente FreshnessClock : confiance = 2^(-jours écoulés / demi-vie), prochaine vérification quand la confiance passerait sous 0,5. Mets à jour l'horloge dans la même transaction que le relevé ou la publication, et utilise-la pour prioriser la génération des tâches de la tâche 2.3. Tests sur les cas limites.

---

## Après la semaine 3

Les premières fiches publiques avec l'anneau de fraîcheur alimenté par de vraies données, puis le conseiller (recherche sur pgvector, réponses citant leurs faits), le catalogue des règles fiscales, le coffre d'identité en Tunisie et les premières demandes vers le partenaire de leasing.
