// ──────────────────────────────────────────────────────────────
// TraceEnd — Scans Service
// ──────────────────────────────────────────────────────────────

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { NotFoundError } from '@/lib/errors';
import type { CreateScanInput, PaginationInput } from '@/lib/validators';

const log = logger.child({ module: 'scans-service' });

export async function getScans(workspaceId: string, pagination: PaginationInput) {
  const skip = (pagination.page - 1) * pagination.limit;

  const [scans, total] = await Promise.all([
    db.scan.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pagination.limit,
      include: {
        asset: { select: { id: true, type: true, identifier: true, displayName: true } },
      },
    }),
    db.scan.count({ where: { workspaceId } }),
  ]);

  return {
    scans,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
}

export async function createScan(workspaceId: string, data: CreateScanInput) {
  const asset = await db.asset.findFirst({
    where: { id: data.assetId, workspaceId },
  });

  if (!asset) {
    throw new NotFoundError('Asset', data.assetId);
  }

  const scan = await db.scan.create({
    data: {
      type: data.type,
      workspaceId,
      assetId: data.assetId,
      status: 'QUEUED',
    },
  });

  log.info('Scan created', { scanId: scan.id, type: scan.type, assetId: data.assetId });

  await db.activityEvent.create({
    data: {
      action: 'scan.created',
      description: `${data.type.replace('_', ' ')} scan queued for ${asset.displayName}`,
      workspaceId,
      assetId: data.assetId,
      scanId: scan.id,
    },
  });

  // In production, this is where we would dispatch to a job queue.
  // For now, the scan remains in QUEUED status.

  return scan;
}

export async function getScanById(workspaceId: string, scanId: string) {
  const scan = await db.scan.findFirst({
    where: { id: scanId, workspaceId },
    include: {
      asset: { select: { id: true, type: true, identifier: true, displayName: true } },
      scanJobs: { orderBy: { createdAt: 'asc' } },
      findings: {
        select: { id: true, title: true, severity: true, status: true },
        orderBy: { severity: 'asc' },
      },
    },
  });

  if (!scan) {
    throw new NotFoundError('Scan', scanId);
  }

  return scan;
}
