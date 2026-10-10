-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('EMAIL', 'USERNAME', 'DOMAIN', 'WEBSITE', 'GITHUB_ACCOUNT', 'GITHUB_REPOSITORY', 'IMAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ScanType" AS ENUM ('FULL', 'BREACH_CHECK', 'DOMAIN_SECURITY', 'WEB_SECURITY', 'GITHUB_SECRETS', 'METADATA_ANALYSIS', 'QUICK');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ScanJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FindingCategory" AS ENUM ('SECRETS', 'BREACH_EXPOSURE', 'DOMAIN_SECURITY', 'WEB_SECURITY', 'TLS_SECURITY', 'HEADER_SECURITY', 'DIGITAL_FOOTPRINT', 'IMAGE_METADATA', 'ACCOUNT_SECURITY', 'CONFIGURATION', 'OTHER');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'MITIGATED', 'RESOLVED', 'ACCEPTED_RISK', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('CONFIRMED', 'HIGH', 'MEDIUM', 'LOW', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "RemediationEffort" AS ENUM ('TRIVIAL', 'LOW', 'MODERATE', 'HIGH', 'COMPLEX');

-- CreateEnum
CREATE TYPE "RemediationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "RemediationStepStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('GITHUB', 'GITLAB', 'SLACK', 'EMAIL', 'WEBHOOK', 'OTHER');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "identifier" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "lastScannedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scans" (
    "id" TEXT NOT NULL,
    "type" "ScanType" NOT NULL,
    "status" "ScanStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "findingsCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_jobs" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" "ScanJobStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB,
    "result" JSONB,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scanId" TEXT NOT NULL,

    CONSTRAINT "scan_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "FindingCategory" NOT NULL,
    "severity" "Severity" NOT NULL,
    "status" "FindingStatus" NOT NULL DEFAULT 'OPEN',
    "confidence" "Confidence" NOT NULL DEFAULT 'HIGH',
    "description" TEXT NOT NULL,
    "plainEnglishExplanation" TEXT NOT NULL,
    "technicalDetails" TEXT,
    "potentialImpact" TEXT NOT NULL,
    "remediationSummary" TEXT,
    "evidence" JSONB,
    "metadata" JSONB,
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assetId" TEXT NOT NULL,
    "scanId" TEXT,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remediations" (
    "id" TEXT NOT NULL,
    "environment" TEXT,
    "estimatedEffort" "RemediationEffort" NOT NULL DEFAULT 'MODERATE',
    "status" "RemediationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "findingId" TEXT NOT NULL,

    CONSTRAINT "remediations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remediation_steps" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "codeSnippet" TEXT,
    "codeLanguage" TEXT,
    "docUrl" TEXT,
    "status" "RemediationStepStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "remediationId" TEXT NOT NULL,

    CONSTRAINT "remediation_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "assetId" TEXT,
    "findingId" TEXT,
    "scanId" TEXT,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'INACTIVE',
    "config" JSONB,
    "metadata" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspaces_slug_idx" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspace_members_workspaceId_idx" ON "workspace_members"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_userId_workspaceId_key" ON "workspace_members"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX "assets_workspaceId_type_idx" ON "assets"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "assets_workspaceId_status_idx" ON "assets"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "assets_identifier_idx" ON "assets"("identifier");

-- CreateIndex
CREATE INDEX "scans_workspaceId_status_idx" ON "scans"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "scans_assetId_idx" ON "scans"("assetId");

-- CreateIndex
CREATE INDEX "scans_createdAt_idx" ON "scans"("createdAt");

-- CreateIndex
CREATE INDEX "scan_jobs_scanId_idx" ON "scan_jobs"("scanId");

-- CreateIndex
CREATE INDEX "scan_jobs_status_priority_idx" ON "scan_jobs"("status", "priority");

-- CreateIndex
CREATE INDEX "findings_workspaceId_severity_status_idx" ON "findings"("workspaceId", "severity", "status");

-- CreateIndex
CREATE INDEX "findings_assetId_idx" ON "findings"("assetId");

-- CreateIndex
CREATE INDEX "findings_scanId_idx" ON "findings"("scanId");

-- CreateIndex
CREATE INDEX "findings_slug_idx" ON "findings"("slug");

-- CreateIndex
CREATE INDEX "findings_category_idx" ON "findings"("category");

-- CreateIndex
CREATE INDEX "findings_createdAt_idx" ON "findings"("createdAt");

-- CreateIndex
CREATE INDEX "remediations_findingId_idx" ON "remediations"("findingId");

-- CreateIndex
CREATE INDEX "remediation_steps_remediationId_idx" ON "remediation_steps"("remediationId");

-- CreateIndex
CREATE INDEX "activity_events_workspaceId_createdAt_idx" ON "activity_events"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_events_action_idx" ON "activity_events"("action");

-- CreateIndex
CREATE INDEX "integrations_workspaceId_idx" ON "integrations"("workspaceId");

-- CreateIndex
CREATE INDEX "notification_preferences_workspaceId_idx" ON "notification_preferences"("workspaceId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_jobs" ADD CONSTRAINT "scan_jobs_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediations" ADD CONSTRAINT "remediations_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_steps" ADD CONSTRAINT "remediation_steps_remediationId_fkey" FOREIGN KEY ("remediationId") REFERENCES "remediations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "findings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

