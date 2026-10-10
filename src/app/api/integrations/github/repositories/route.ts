import { NextRequest, NextResponse } from 'next/server';
import { getDefaultWorkspace } from '@/lib/services/workspace';
import { fetchGithubRepositories } from '@/lib/services/integrations';
import { toErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';

const log = logger.child({ module: 'github-repositories-api' });

export async function GET(request: NextRequest) {
  try {
    const workspace = await getDefaultWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Workspace not found' } }, { status: 404 });
    }

    const repositories = await fetchGithubRepositories(workspace.id);

    // Also get existing imported repositories in this workspace to mark them
    const existingAssets = await db.asset.findMany({
      where: {
        workspaceId: workspace.id,
        type: 'GITHUB_REPOSITORY'
      },
      select: { identifier: true }
    });
    
    const existingIds = new Set(existingAssets.map(a => a.identifier));

    const enrichedRepositories = repositories.map((repo: any) => ({
      ...repo,
      isImported: existingIds.has(repo.githubRepositoryId)
    }));

    // Record activity for sync
    await db.activityEvent.create({
      data: {
        action: 'integration.github_sync',
        description: `Synchronized ${repositories.length} GitHub repositories`,
        workspaceId: workspace.id,
      }
    });

    return NextResponse.json({ data: enrichedRepositories });
  } catch (error) {
    log.error('Failed to fetch github repositories', { error: String(error) });
    const { error: errResponse, status } = toErrorResponse(error);
    return NextResponse.json({ error: errResponse }, { status });
  }
}
