// ──────────────────────────────────────────────────────────────
// TraceEnd — Assets Service
// ──────────────────────────────────────────────────────────────

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { NotFoundError, ConflictError } from '@/lib/errors';
import type { CreateAssetInput, PaginationInput } from '@/lib/validators';

const log = logger.child({ module: 'assets-service' });

export async function getAssets(workspaceId: string, pagination: PaginationInput) {
  const skip = (pagination.page - 1) * pagination.limit;

  const [assets, total] = await Promise.all([
    db.asset.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pagination.limit,
      include: {
        _count: { select: { findings: true, scans: true } },
      },
    }),
    db.asset.count({ where: { workspaceId } }),
  ]);

  return {
    assets,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
}

export async function createAsset(workspaceId: string, data: CreateAssetInput) {
  // Check for duplicate identifier within workspace
  const existing = await db.asset.findFirst({
    where: { workspaceId, type: data.type, identifier: data.identifier },
  });

  if (existing) {
    throw new ConflictError(`Asset with identifier "${data.identifier}" already exists`);
  }

  const asset = await db.asset.create({
    data: {
      ...data,
      workspaceId,
    },
  });

  log.info('Asset created', { assetId: asset.id, type: asset.type });

  await db.activityEvent.create({
    data: {
      action: 'asset.created',
      description: `Added ${data.type.toLowerCase()} asset: ${data.displayName}`,
      workspaceId,
      assetId: asset.id,
    },
  });

  return asset;
}

export async function getAssetById(workspaceId: string, assetId: string) {
  const asset = await db.asset.findFirst({
    where: { id: assetId, workspaceId },
    include: {
      _count: { select: { findings: true, scans: true } },
    },
  });

  if (!asset) {
    throw new NotFoundError('Asset', assetId);
  }

  return asset;
}

export async function deleteAsset(workspaceId: string, assetId: string) {
  const asset = await db.asset.findFirst({
    where: { id: assetId, workspaceId },
  });

  if (!asset) {
    throw new NotFoundError('Asset', assetId);
  }

  await db.asset.delete({ where: { id: assetId } });

  log.info('Asset deleted', { assetId, type: asset.type });
}
