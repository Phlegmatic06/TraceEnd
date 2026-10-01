import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDefaultWorkspace } from '@/lib/services/workspace';
import { toErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { scanQueue } from '@/lib/queue';
import { ScanStatus, ScanJobStatus, ScanType } from '@/generated/prisma/client';

const log = logger.child({ module: 'api/assets/scan' });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspace = await getDefaultWorkspace();
    if (!workspace) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'No workspace found' } },
        { status: 404 }
      );
    }

    const asset = await db.asset.findFirst({
      where: { id, workspaceId: workspace.id },
    });

    if (!asset) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Asset not found' } },
        { status: 404 }
      );
    }

    // Support only DOMAIN and WEBSITE for now (Phase 2 constraint)
    if (asset.type !== 'DOMAIN' && asset.type !== 'WEBSITE') {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'Scanning is only supported for Domains and Websites in this phase' } },
        { status: 400 }
      );
    }

    // Create Scan
    const scan = await db.scan.create({
      data: {
        workspaceId: workspace.id,
        assetId: asset.id,
        status: ScanStatus.QUEUED,
        type: ScanType.DOMAIN_SECURITY,
      },
    });

    // Create ScanJob for domain-security-baseline
    const scanJob = await db.scanJob.create({
      data: {
        scanId: scan.id,
        jobType: 'domain-security-baseline',
        status: ScanJobStatus.PENDING,
      },
    });

    // Enqueue job
    await scanQueue.add('domain-security-baseline', {
      scanId: scan.id,
      scanJobId: scanJob.id,
      assetId: asset.id,
      assetIdentifier: asset.identifier,
      assetType: asset.type,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 }
    });

    // Record Activity
    await db.activityEvent.create({
      data: {
        action: 'scan.queued',
        description: `Manual scan queued for ${asset.identifier}`,
        workspaceId: workspace.id,
        assetId: asset.id,
        scanId: scan.id,
      },
    });

    log.info('Scan queued successfully', { scanId: scan.id, assetId: asset.id });

    return NextResponse.json({ data: scan }, { status: 201 });
  } catch (error) {
    log.error('Failed to queue scan', { error: String(error) });
    const { error: errResponse, status } = toErrorResponse(error);
    return NextResponse.json({ error: errResponse }, { status });
  }
}
