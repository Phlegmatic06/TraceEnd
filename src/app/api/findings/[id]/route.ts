import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDefaultWorkspace } from '@/lib/services/workspace';
import { updateFindingStatusSchema } from '@/lib/validators';
import { toErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'api/findings' });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateFindingStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status',
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const workspace = await getDefaultWorkspace();
    if (!workspace) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'No workspace found' } },
        { status: 404 }
      );
    }

    const finding = await db.finding.findFirst({
      where: { id, workspaceId: workspace.id },
    });

    if (!finding) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Finding not found' } },
        { status: 404 }
      );
    }

    const updated = await db.finding.update({
      where: { id },
      data: {
        status: parsed.data.status,
        resolvedAt: ['RESOLVED', 'FALSE_POSITIVE'].includes(parsed.data.status)
          ? new Date()
          : parsed.data.status === 'OPEN'
            ? null
            : undefined,
      },
    });

    await db.activityEvent.create({
      data: {
        action: 'finding.status_changed',
        description: `Finding status changed to ${parsed.data.status.toLowerCase().replace('_', ' ')}`,
        workspaceId: workspace.id,
        findingId: id,
        metadata: { previousStatus: finding.status, newStatus: parsed.data.status },
      },
    });

    log.info('Finding status updated', { findingId: id, status: parsed.data.status });

    return NextResponse.json({ data: updated });
  } catch (error) {
    log.error('Failed to update finding', { error: String(error) });
    const { error: errResponse, status } = toErrorResponse(error);
    return NextResponse.json({ error: errResponse }, { status });
  }
}
