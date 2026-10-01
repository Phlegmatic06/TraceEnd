// ──────────────────────────────────────────────────────────────
// TraceEnd — Zod Validation Schemas
// Boundary validation for API input, form input, and domain data.
// ──────────────────────────────────────────────────────────────

import { z } from 'zod';

// ─── Asset Schemas ────────────────────────────────────────────

export const AssetTypeEnum = z.enum([
  'EMAIL',
  'USERNAME',
  'DOMAIN',
  'WEBSITE',
  'GITHUB_ACCOUNT',
  'GITHUB_REPOSITORY',
  'IMAGE',
  'OTHER',
]);

export const createAssetSchema = z.object({
  type: AssetTypeEnum,
  identifier: z
    .string()
    .min(1, 'Identifier is required')
    .max(500, 'Identifier too long'),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(200, 'Display name too long'),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;

// ─── Finding Schemas ──────────────────────────────────────────

export const SeverityEnum = z.enum([
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'INFORMATIONAL',
]);

export const FindingStatusEnum = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'MITIGATED',
  'RESOLVED',
  'ACCEPTED_RISK',
  'FALSE_POSITIVE',
]);

export const FindingCategoryEnum = z.enum([
  'SECRETS',
  'BREACH_EXPOSURE',
  'DOMAIN_SECURITY',
  'WEB_SECURITY',
  'TLS_SECURITY',
  'HEADER_SECURITY',
  'DIGITAL_FOOTPRINT',
  'IMAGE_METADATA',
  'ACCOUNT_SECURITY',
  'CONFIGURATION',
  'OTHER',
]);

export const updateFindingStatusSchema = z.object({
  status: FindingStatusEnum,
});

export type UpdateFindingStatusInput = z.infer<typeof updateFindingStatusSchema>;

// ─── Scan Schemas ─────────────────────────────────────────────

export const ScanTypeEnum = z.enum([
  'FULL',
  'BREACH_CHECK',
  'DOMAIN_SECURITY',
  'WEB_SECURITY',
  'GITHUB_SECRETS',
  'METADATA_ANALYSIS',
  'QUICK',
]);

export const createScanSchema = z.object({
  assetId: z.string().cuid(),
  type: ScanTypeEnum,
});

export type CreateScanInput = z.infer<typeof createScanSchema>;

// ─── Pagination ───────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ─── Findings Filter ──────────────────────────────────────────

export const findingsFilterSchema = z.object({
  severity: SeverityEnum.optional(),
  status: FindingStatusEnum.optional(),
  category: FindingCategoryEnum.optional(),
  assetId: z.string().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['severity', 'createdAt', 'title', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  ...paginationSchema.shape,
});

export type FindingsFilterInput = z.infer<typeof findingsFilterSchema>;

// ─── Remediation Schemas ──────────────────────────────────────

export const updateRemediationStepSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'SKIPPED']),
});

export type UpdateRemediationStepInput = z.infer<typeof updateRemediationStepSchema>;
