import { NextRequest, NextResponse } from 'next/server';
import { getDefaultWorkspace } from '@/lib/services/workspace';
import { disconnectGithubIntegration, getGithubIntegration } from '@/lib/services/integrations';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { toErrorResponse } from '@/lib/errors';

const log = logger.child({ module: 'github-integration-api' });

export async function GET(request: NextRequest) {
  try {
    const workspace = await getDefaultWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Workspace not found' } }, { status: 404 });
    }

    const integration = await getGithubIntegration(workspace.id);
    
    if (!integration) {
      return NextResponse.json({ data: { status: 'NOT_CONNECTED' } });
    }

    // Never return the token in the response
    return NextResponse.json({
      data: {
        status: 'CONNECTED',
        metadata: integration.metadata,
        lastSyncAt: integration.lastSyncAt,
      }
    });
  } catch (error) {
    const { error: errResponse, status } = toErrorResponse(error);
    return NextResponse.json({ error: errResponse }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const workspace = await getDefaultWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Workspace not found' } }, { status: 404 });
    }

    await disconnectGithubIntegration(workspace.id);

    await db.activityEvent.create({
      data: {
        action: 'integration.github_disconnected',
        description: `GitHub account disconnected`,
        workspaceId: workspace.id,
      }
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    const { error: errResponse, status } = toErrorResponse(error);
    return NextResponse.json({ error: errResponse }, { status });
  }
}
