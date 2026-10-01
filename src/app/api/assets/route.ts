import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDefaultWorkspace } from '@/lib/services/workspace';
import { createAssetSchema } from '@/lib/validators';
import { toErrorResponse, ConflictError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'api/assets' });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid asset data',
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    // In production, workspace would come from the authenticated session
    const workspace = await getDefaultWorkspace();
    if (!workspace) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'No workspace found' } },
        { status: 404 }
      );
    }

    // Check for duplicate
    const existing = await db.asset.findFirst({
      where: {
        workspaceId: workspace.id,
        type: parsed.data.type,
        identifier: parsed.data.identifier,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: `Asset with identifier "${parsed.data.identifier}" already exists`,
          },
        },
        { status: 409 }
      );
    }

    const asset = await db.asset.create({
      data: {
        ...parsed.data,
        workspaceId: workspace.id,
      },
    });

    // Create activity event
    await db.activityEvent.create({
      data: {
        action: 'asset.created',
        description: `Added ${parsed.data.type.toLowerCase()} asset: ${parsed.data.displayName}`,
        workspaceId: workspace.id,
        assetId: asset.id,
      },
    });

    log.info('Asset created via API', { assetId: asset.id, type: asset.type });

    return NextResponse.json({ data: asset }, { status: 201 });
  } catch (error) {
    log.error('Failed to create asset', { error: String(error) });
    const { error: errResponse, status } = toErrorResponse(error);
    return NextResponse.json({ error: errResponse }, { status });
  }
}
