import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDefaultWorkspace } from '@/lib/services/workspace';
import { addScanJob } from '@/lib/queue';
import { logger } from '@/lib/logger';
import { ScanType, ScanStatus, ScanJobStatus } from '@/generated/prisma/client';
import { scannerRegistry } from '@/lib/scanners';

const log = logger.child({ module: 'api/scans' });

export async function POST(request: NextRequest) {
  try {
    const workspace = await getDefaultWorkspace();
    const body = await request.json();
    const { assetId, scanType } = body;

    if (!assetId) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Asset ID required' } }, { status: 400 });
    }

    const asset = await db.asset.findFirst({
      where: { id: assetId, workspaceId: workspace.id }
    });

    if (!asset) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Asset not found' } }, { status: 404 });
    }

    // Determine applicable scanners
    const type = (scanType as ScanType) || ScanType.FULL;
    const applicableScanners = scannerRegistry.getForAssetType(asset.type);

    if (applicableScanners.length === 0) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: `No scanners available for asset type ${asset.type}` } }, { status: 400 });
    }

    // Create Scan entity
    const scan = await db.scan.create({
      data: {
        type,
        status: ScanStatus.QUEUED,
        workspaceId: workspace.id,
        assetId: asset.id,
      }
    });

    // Enqueue jobs for each applicable scanner
    for (const scanner of applicableScanners) {
      const scanJob = await db.scanJob.create({
        data: {
          jobType: scanner.id,
          status: ScanJobStatus.PENDING,
          scanId: scan.id,
        }
      });

      // Add to BullMQ
      await addScanJob(scanner.id, {
        scanId: scan.id,

        scanJobId: scanJob.id,
        assetId: asset.id,
        assetIdentifier: asset.identifier,
        assetType: asset.type,
      }, {
        jobId: scanJob.id, // Ensure idempotency
      });
    }

    log.info('Scan queued successfully', { scanId: scan.id, assetId });
    return NextResponse.json({ data: scan }, { status: 201 });
  } catch (error) {
    log.error('Failed to queue scan', { error: String(error) });
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to queue scan' } }, { status: 500 });
  }
}
