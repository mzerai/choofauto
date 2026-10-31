-- Fondations F1 : identifiants UUID des journaux, devise à côté de chaque montant.

-- Devise des observations du concurrent : les lignes existantes sont en dinars.
ALTER TABLE "obs_competitor" ADD COLUMN "currency" CHAR(3) NOT NULL DEFAULT 'TND';
ALTER TABLE "obs_competitor" ALTER COLUMN "currency" DROP DEFAULT;

-- Devise du coût des appels aux modèles de langage (micro-dollars).
ALTER TABLE "ops_agent_runs" ADD COLUMN "currency" CHAR(3) NOT NULL DEFAULT 'USD';

-- Les compteurs séquentiels deviennent des UUID. PostgreSQL 16 ne génère pas d'UUID v7 :
-- les lignes existantes reçoivent un UUID v4, les nouvelles un UUID v7 généré par Prisma.
-- L'ordre des lignes reste donné par la date (« at », « occurredAt »).
ALTER TABLE "analytics_events" DROP CONSTRAINT "analytics_events_pkey",
DROP COLUMN "id",
ADD COLUMN "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");
ALTER TABLE "analytics_events" ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_pkey",
DROP COLUMN "id",
ADD COLUMN "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");
ALTER TABLE "audit_log" ALTER COLUMN "id" DROP DEFAULT;
