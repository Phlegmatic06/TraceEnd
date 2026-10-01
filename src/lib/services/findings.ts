// ──────────────────────────────────────────────────────────────
// TraceEnd — Findings Service
// Data access and business logic for security findings.
// ──────────────────────────────────────────────────────────────

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { NotFoundError } from '@/lib/errors';
import type { FindingsFilterInput, UpdateFindingStatusInput } from '@/lib/validators';
import type { Prisma } from '@/generated/prisma/client';

const log = logger.child({ module: 'findings-service' });

// Severity sort order for deterministic ordering
const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFORMATIONAL: 4 };

export async function getFindings(workspaceId: string, filters: FindingsFilterInput) {
  const where: Prisma.FindingWhereInput = { workspaceId };

  if (filters.severity) where.severity = filters.severity;
  if (filters.status) where.status = filters.status;
  if (filters.category) where.category = filters.category;
  if (filters.assetId) where.assetId = filters.assetId;
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { slug: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const skip = (filters.page - 1) * filters.limit;

  const orderBy: Prisma.FindingOrderByWithRelationInput =
    filters.sortBy === 'severity'
      ? { severity: filters.sortOrder }
      : { [filters.sortBy]: filters.sortOrder };

  const [findings, total] = await Promise.all([
    db.finding.findMany({
      where,
      orderBy,
      skip,
      take: filters.limit,
      include: {
        asset: { select: { id: true, type: true, identifier: true, displayName: true } },
      },
    }),
    db.finding.count({ where }),
  ]);

  return {
    findings,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}

export async function getFindingById(workspaceId: string, findingId: string) {
  const finding = await db.finding.findFirst({
    where: { id: findingId, workspaceId },
    include: {
      asset: { select: { id: true, type: true, identifier: true, displayName: true } },
      scan: { select: { id: true, type: true, createdAt: true } },
      remediations: {
        include: { steps: { orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      },
      activityEvents: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!finding) {
    throw new NotFoundError('Finding', findingId);
  }

  return finding;
}

export async function updateFindingStatus(
  workspaceId: string,
  findingId: string,
  data: UpdateFindingStatusInput
) {
  const finding = await db.finding.findFirst({
    where: { id: findingId, workspaceId },
  });

  if (!finding) {
    throw new NotFoundError('Finding', findingId);
  }

  const updated = await db.finding.update({
    where: { id: findingId },
    data: {
      status: data.status,
      resolvedAt: ['RESOLVED', 'FALSE_POSITIVE'].includes(data.status)
        ? new Date()
        : data.status === 'OPEN'
          ? null
          : undefined,
    },
  });

  log.info('Finding status updated', { findingId, status: data.status });

  // Create activity event
  await db.activityEvent.create({
    data: {
      action: 'finding.status_changed',
      description: `Finding status changed to ${data.status.toLowerCase().replace('_', ' ')}`,
      workspaceId,
      findingId,
      metadata: { previousStatus: finding.status, newStatus: data.status },
    },
  });

  return updated;
}

export async function getFindingsSummary(workspaceId: string) {
  const [counts, recentFindings] = await Promise.all([
    db.finding.groupBy({
      by: ['severity'],
      where: { workspaceId, status: { notIn: ['RESOLVED', 'FALSE_POSITIVE'] } },
      _count: true,
    }),
    db.finding.findMany({
      where: { workspaceId },
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      take: 10,
      include: {
        asset: { select: { id: true, type: true, identifier: true, displayName: true } },
      },
    }),
  ]);

  const resolvedCount = await db.finding.count({
    where: { workspaceId, status: { in: ['RESOLVED', 'FALSE_POSITIVE'] } },
  });

  const severityCounts = {
    critical: counts.find((c) => c.severity === 'CRITICAL')?._count ?? 0,
    high: counts.find((c) => c.severity === 'HIGH')?._count ?? 0,
    medium: counts.find((c) => c.severity === 'MEDIUM')?._count ?? 0,
    low: counts.find((c) => c.severity === 'LOW')?._count ?? 0,
    informational: counts.find((c) => c.severity === 'INFORMATIONAL')?._count ?? 0,
    resolved: resolvedCount,
  };

  // Simple security posture score: weighted severity ratio
  const totalOpen =
    severityCounts.critical * 10 +
    severityCounts.high * 6 +
    severityCounts.medium * 3 +
    severityCounts.low * 1;
  const maxPossibleDeduction = 100;
  const posture = Math.max(0, Math.min(100, 100 - Math.min(totalOpen, maxPossibleDeduction)));

  return {
    severityCounts,
    securityPosture: posture,
    priorityFindings: recentFindings,
  };
}
