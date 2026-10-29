-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Segment" AS ENUM ('CITY_CAR', 'SEDAN', 'SUV_SMALL', 'SUV_COMPACT', 'SUV_LARGE', 'PICKUP', 'MPV', 'VAN');

-- CreateEnum
CREATE TYPE "Powertrain" AS ENUM ('PETROL', 'DIESEL', 'HEV', 'PHEV', 'BEV');

-- CreateEnum
CREATE TYPE "PilotStatus" AS ENUM ('CONFIRMED', 'TO_CONFIRM', 'TO_IDENTIFY');

-- CreateEnum
CREATE TYPE "ProType" AS ENUM ('DEALER', 'IMPORTER', 'BRAND', 'LEASING', 'BANK', 'INSURER', 'GARAGE', 'EXPERT', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('DEALER_SITE', 'BROCHURE', 'PRICE_LIST', 'PRESS', 'OFFICIAL_JOURNAL', 'COMPETITOR_SITE', 'PHONE_CALL', 'VISIT', 'WRITTEN_QUOTE', 'USER_QUOTE', 'PRO_PORTAL');

-- CreateEnum
CREATE TYPE "ObservationMethod" AS ENUM ('WRITTEN_QUOTE', 'VISIT', 'PHONE_CALL', 'WEBSITE', 'DOCUMENT', 'PRO_PORTAL');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('IN_STOCK', 'ON_ORDER', 'WAITING_LIST', 'DISCONTINUED', 'NO_ANSWER');

-- CreateEnum
CREATE TYPE "CompetitorStatus" AS ENUM ('AVAILABLE', 'ON_ORDER', 'NOT_SHOWN', 'ABSENT');

-- CreateEnum
CREATE TYPE "InterlocutorRole" AS ENUM ('SALESPERSON', 'SALES_MANAGER', 'RECEPTION', 'OTHER');

-- CreateEnum
CREATE TYPE "FactType" AS ENUM ('PRICE', 'AVAILABILITY', 'SPEC', 'RULE');

-- CreateEnum
CREATE TYPE "StagingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('FOUNDER', 'ADMIN', 'VERIFIER', 'INTERN');

-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RuleDomain" AS ENUM ('VAT', 'CONSUMPTION_TAX', 'CUSTOMS', 'REGISTRATION', 'VIGNETTE', 'FCR', 'POPULAR_CAR', 'COMPANY_CAR', 'EV_INCENTIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "RuleStatus" AS ENUM ('DRAFT', 'PROMULGATED', 'IN_FORCE', 'REPEALED');

-- CreateTable
CREATE TABLE "catalog_countries" (
    "code" CHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "minorUnits" INTEGER NOT NULL DEFAULT 3,
    "locales" TEXT[],

    CONSTRAINT "catalog_countries_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "catalog_brands" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "origin" CHAR(2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_models" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "segment" "Segment" NOT NULL,
    "pilotRank" INTEGER,
    "pilotStatus" "PilotStatus",
    "pilotReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_versions" (
    "id" UUID NOT NULL,
    "modelId" UUID NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "powertrain" "Powertrain",
    "isPopularCar" BOOLEAN NOT NULL DEFAULT false,
    "specs" JSONB NOT NULL DEFAULT '{}',
    "isTracked" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "importerId" UUID,
    "embedding" vector(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_pros" (
    "id" UUID NOT NULL,
    "type" "ProType" NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_pros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_sites" (
    "id" UUID NOT NULL,
    "proId" UUID,
    "countryCode" CHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "area" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "googlePlaceId" TEXT,
    "phone" TEXT,
    "openingHours" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_site_brands" (
    "siteId" UUID NOT NULL,
    "brandId" UUID NOT NULL,

    CONSTRAINT "partner_site_brands_pkey" PRIMARY KEY ("siteId","brandId")
);

-- CreateTable
CREATE TABLE "ops_sources" (
    "id" UUID NOT NULL,
    "type" "SourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "countryCode" CHAR(2),
    "reliability" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_documents" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "extractedText" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obs_field_checks" (
    "id" UUID NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL,
    "method" "ObservationMethod" NOT NULL,
    "siteId" UUID NOT NULL,
    "observerId" UUID NOT NULL,
    "interlocutorRole" "InterlocutorRole",
    "answered" BOOLEAN NOT NULL DEFAULT true,
    "durationMinutes" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "obs_field_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obs_price_points" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "siteId" UUID,
    "fieldCheckId" UUID,
    "documentId" UUID,
    "amountMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "includesRegistration" BOOLEAN,
    "extraFeesMinor" INTEGER,
    "offerText" TEXT,
    "offerEndsAt" TIMESTAMP(3),
    "observedAt" TIMESTAMP(3) NOT NULL,
    "method" "ObservationMethod" NOT NULL,
    "confidence" "Confidence" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "obs_price_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obs_availability" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "siteId" UUID,
    "fieldCheckId" UUID,
    "status" "AvailabilityStatus" NOT NULL,
    "delayWeeks" INTEGER,
    "colors" TEXT[],
    "trims" TEXT[],
    "financingMention" TEXT,
    "declaredByPro" BOOLEAN NOT NULL DEFAULT false,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "method" "ObservationMethod" NOT NULL,
    "confidence" "Confidence" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "obs_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obs_competitor" (
    "id" UUID NOT NULL,
    "competitor" TEXT NOT NULL,
    "url" TEXT,
    "versionId" UUID NOT NULL,
    "priceMinor" INTEGER,
    "status" "CompetitorStatus" NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "observerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "obs_competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_freshness" (
    "id" UUID NOT NULL,
    "factType" "FactType" NOT NULL,
    "versionId" UUID NOT NULL,
    "siteId" UUID,
    "lastVerifiedAt" TIMESTAMP(3),
    "halfLifeDays" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "nextCheckAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_freshness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_verification_tasks" (
    "id" UUID NOT NULL,
    "factType" "FactType" NOT NULL,
    "method" "ObservationMethod" NOT NULL,
    "versionId" UUID,
    "siteId" UUID,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "assigneeId" UUID,
    "fieldCheckId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ops_verification_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_time_entries" (
    "id" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "minutes" INTEGER NOT NULL,
    "activity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_staff_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_staff_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ops_agent_runs" (
    "id" UUID NOT NULL,
    "agent" TEXT NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'RUNNING',
    "provider" TEXT,
    "model" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costMicroUsd" INTEGER NOT NULL DEFAULT 0,
    "plan" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "ops_agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_fact_staging" (
    "id" UUID NOT NULL,
    "factType" "FactType" NOT NULL,
    "versionId" UUID,
    "siteId" UUID,
    "payload" JSONB NOT NULL,
    "citations" JSONB NOT NULL,
    "confidence" "Confidence" NOT NULL,
    "status" "StagingStatus" NOT NULL DEFAULT 'PENDING',
    "agentRunId" UUID,
    "documentId" UUID,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_fact_staging_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rules_regulatory" (
    "id" UUID NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "domain" "RuleDomain" NOT NULL,
    "key" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "status" "RuleStatus" NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "validatedBy" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rules_regulatory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subjectId" TEXT,
    "countryCode" CHAR(2),
    "props" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_brands_name_key" ON "catalog_brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_brands_slug_key" ON "catalog_brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_models_slug_key" ON "catalog_models"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_models_pilotRank_key" ON "catalog_models"("pilotRank");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_models_brandId_name_key" ON "catalog_models"("brandId", "name");

-- CreateIndex
CREATE INDEX "catalog_versions_countryCode_idx" ON "catalog_versions"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_versions_modelId_countryCode_name_key" ON "catalog_versions"("modelId", "countryCode", "name");

-- CreateIndex
CREATE INDEX "partner_sites_countryCode_area_idx" ON "partner_sites"("countryCode", "area");

-- CreateIndex
CREATE UNIQUE INDEX "ops_documents_sha256_key" ON "ops_documents"("sha256");

-- CreateIndex
CREATE INDEX "obs_field_checks_siteId_checkedAt_idx" ON "obs_field_checks"("siteId", "checkedAt");

-- CreateIndex
CREATE INDEX "obs_price_points_versionId_observedAt_idx" ON "obs_price_points"("versionId", "observedAt");

-- CreateIndex
CREATE INDEX "obs_availability_versionId_siteId_observedAt_idx" ON "obs_availability"("versionId", "siteId", "observedAt");

-- CreateIndex
CREATE INDEX "obs_competitor_versionId_observedAt_idx" ON "obs_competitor"("versionId", "observedAt");

-- CreateIndex
CREATE INDEX "ops_freshness_nextCheckAt_idx" ON "ops_freshness"("nextCheckAt");

-- CreateIndex
CREATE UNIQUE INDEX "ops_freshness_factType_versionId_siteId_key" ON "ops_freshness"("factType", "versionId", "siteId");

-- CreateIndex
CREATE UNIQUE INDEX "ops_verification_tasks_fieldCheckId_key" ON "ops_verification_tasks"("fieldCheckId");

-- CreateIndex
CREATE INDEX "ops_verification_tasks_status_dueAt_idx" ON "ops_verification_tasks"("status", "dueAt");

-- CreateIndex
CREATE INDEX "ops_time_entries_date_idx" ON "ops_time_entries"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ops_staff_users_email_key" ON "ops_staff_users"("email");

-- CreateIndex
CREATE INDEX "ops_agent_runs_agent_startedAt_idx" ON "ops_agent_runs"("agent", "startedAt");

-- CreateIndex
CREATE INDEX "ops_fact_staging_status_factType_idx" ON "ops_fact_staging"("status", "factType");

-- CreateIndex
CREATE INDEX "rules_regulatory_countryCode_domain_key_effectiveFrom_idx" ON "rules_regulatory"("countryCode", "domain", "key", "effectiveFrom");

-- CreateIndex
CREATE INDEX "analytics_events_name_occurredAt_idx" ON "analytics_events"("name", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_log_entity_entityId_idx" ON "audit_log"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "catalog_models" ADD CONSTRAINT "catalog_models_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "catalog_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_versions" ADD CONSTRAINT "catalog_versions_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "catalog_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_versions" ADD CONSTRAINT "catalog_versions_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "catalog_countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_versions" ADD CONSTRAINT "catalog_versions_importerId_fkey" FOREIGN KEY ("importerId") REFERENCES "partner_pros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_pros" ADD CONSTRAINT "partner_pros_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "catalog_countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_sites" ADD CONSTRAINT "partner_sites_proId_fkey" FOREIGN KEY ("proId") REFERENCES "partner_pros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_sites" ADD CONSTRAINT "partner_sites_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "catalog_countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_site_brands" ADD CONSTRAINT "partner_site_brands_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "partner_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_site_brands" ADD CONSTRAINT "partner_site_brands_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "catalog_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_documents" ADD CONSTRAINT "ops_documents_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ops_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obs_field_checks" ADD CONSTRAINT "obs_field_checks_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "partner_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obs_field_checks" ADD CONSTRAINT "obs_field_checks_observerId_fkey" FOREIGN KEY ("observerId") REFERENCES "ops_staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obs_price_points" ADD CONSTRAINT "obs_price_points_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "catalog_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obs_price_points" ADD CONSTRAINT "obs_price_points_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "partner_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obs_price_points" ADD CONSTRAINT "obs_price_points_fieldCheckId_fkey" FOREIGN KEY ("fieldCheckId") REFERENCES "obs_field_checks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obs_price_points" ADD CONSTRAINT "obs_price_points_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ops_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obs_availability" ADD CONSTRAINT "obs_availability_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "catalog_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obs_availability" ADD CONSTRAINT "obs_availability_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "partner_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obs_availability" ADD CONSTRAINT "obs_availability_fieldCheckId_fkey" FOREIGN KEY ("fieldCheckId") REFERENCES "obs_field_checks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obs_competitor" ADD CONSTRAINT "obs_competitor_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "catalog_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obs_competitor" ADD CONSTRAINT "obs_competitor_observerId_fkey" FOREIGN KEY ("observerId") REFERENCES "ops_staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_freshness" ADD CONSTRAINT "ops_freshness_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "catalog_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_freshness" ADD CONSTRAINT "ops_freshness_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "partner_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_verification_tasks" ADD CONSTRAINT "ops_verification_tasks_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "catalog_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_verification_tasks" ADD CONSTRAINT "ops_verification_tasks_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "partner_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_verification_tasks" ADD CONSTRAINT "ops_verification_tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "ops_staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_verification_tasks" ADD CONSTRAINT "ops_verification_tasks_fieldCheckId_fkey" FOREIGN KEY ("fieldCheckId") REFERENCES "obs_field_checks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_time_entries" ADD CONSTRAINT "ops_time_entries_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "ops_staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_fact_staging" ADD CONSTRAINT "ops_fact_staging_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "ops_agent_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_fact_staging" ADD CONSTRAINT "ops_fact_staging_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ops_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_fact_staging" ADD CONSTRAINT "ops_fact_staging_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "ops_staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rules_regulatory" ADD CONSTRAINT "rules_regulatory_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "catalog_countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
