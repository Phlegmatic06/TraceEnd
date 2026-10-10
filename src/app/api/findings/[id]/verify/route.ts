import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDefaultWorkspace } from '@/lib/services/workspace';
import { validateFindingTransition } from '@/lib/services/state-machine';
import { toErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { addScanJob } from '@/lib/queue';
import { ScanStatus, ScanJobStatus, ScanType } from '@/generated/prisma/client';

const log = logger.child({ module: 'api/findings/verify' });

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

    const finding = await db.finding.findFirst({
      where: { id, workspaceId: workspace.id },
      include: { asset: true }
    });

    if (!finding) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Finding not found' } },
        { status: 404 }
      );
    }

    validateFindingTransition(finding.status as any, 'IN_PROGRESS');

    // Update finding status to IN_PROGRESS for verification
    await db.finding.update({
      where: { id },
      data: { status: 'IN_PROGRESS' }
    });

    let scanType: any = ScanType.DOMAIN_SECURITY;
    let jobType = 'domain-security-baseline';

    if (finding.asset.type === 'GITHUB_REPOSITORY') {
      scanType = ScanType.GITHUB_SECRETS;
      jobType = 'github-repository-scan';
    }

    // Create a new scan focused on verifying this asset
    const scan = await db.scan.create({
      data: {
        workspaceId: workspace.id,
        assetId: finding.assetId,
        status: ScanStatus.QUEUED,
        type: scanType,
      },
    });

    const scanJob = await db.scanJob.create({
      data: {
        scanId: scan.id,
        jobType: jobType,
        status: ScanJobStatus.PENDING,
      },
    });

    await addScanJob(jobType, {
      scanId: scan.id,
      scanJobId: scanJob.id,
      assetId: finding.assetId,
      assetIdentifier: finding.asset.identifier,
      assetType: finding.asset.type,
      verifyFindingSlug: finding.slug 
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 }
    });

    await db.activityEvent.create({
      data: {
        action: 'finding.verification_started',
        description: `Verification started for finding: ${finding.title}`,
        workspaceId: workspace.id,
        findingId: finding.id,
        assetId: finding.assetId,
        scanId: scan.id,
      },
    });

    log.info('Verification scan queued', { findingId: id, scanId: scan.id });

    return NextResponse.json({ data: scan }, { status: 201 });
  } catch (error) {
    log.error('Failed to queue verification', { error: String(error) });
    const { error: errResponse, status } = toErrorResponse(error);
    return NextResponse.json({ error: errResponse }, { status });
  }
}
