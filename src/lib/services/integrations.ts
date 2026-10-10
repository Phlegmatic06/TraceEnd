import { db } from '@/lib/db';
import { IntegrationType, IntegrationStatus, Prisma } from '@/generated/prisma/client';
import { encrypt, decrypt } from '@/lib/crypto';
import { NotFoundError, AuthorizationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'integrations-service' });

export async function getGithubIntegration(workspaceId: string) {
  return await db.integration.findFirst({
    where: {
      workspaceId,
      type: IntegrationType.GITHUB,
      status: IntegrationStatus.ACTIVE,
    }
  });
}

export async function upsertGithubIntegration(workspaceId: string, accessToken: string, metadata: any) {
  const encryptedToken = encrypt(accessToken);
  
  const existing = await db.integration.findFirst({
    where: {
      workspaceId,
      type: IntegrationType.GITHUB,
    }
  });

  let integration;
  if (existing) {
    integration = await db.integration.update({
      where: { id: existing.id },
      data: {
        status: IntegrationStatus.ACTIVE,
        config: { accessToken: encryptedToken },
        metadata,
        lastSyncAt: new Date(),
      }
    });
  } else {
    integration = await db.integration.create({
      data: {
        type: IntegrationType.GITHUB,
        status: IntegrationStatus.ACTIVE,
        workspaceId,
        config: { accessToken: encryptedToken },
        metadata,
        lastSyncAt: new Date(),
      }
    });
  }

  log.info('GitHub Integration updated', { workspaceId, integrationId: integration.id });
  return integration;
}

export async function disconnectGithubIntegration(workspaceId: string) {
  const integration = await getGithubIntegration(workspaceId);
  if (!integration) {
    throw new NotFoundError('GitHub Integration');
  }

  await db.integration.update({
    where: { id: integration.id },
    data: {
      status: IntegrationStatus.INACTIVE,
      config: Prisma.DbNull,
      metadata: Prisma.DbNull,
    }
  });

  log.info('GitHub Integration disconnected', { workspaceId });
}

export async function getGithubToken(workspaceId: string): Promise<string> {
  const integration = await getGithubIntegration(workspaceId);
  if (!integration || !integration.config || typeof integration.config !== 'object') {
    throw new AuthorizationError('GITHUB_NOT_CONNECTED');
  }

  const config = integration.config as { accessToken?: string };
  if (!config.accessToken) {
    throw new AuthorizationError('GITHUB_NOT_CONNECTED');
  }

  try {
    return decrypt(config.accessToken);
  } catch (error) {
    log.error('Failed to decrypt GitHub token', { error: String(error) });
    throw new AuthorizationError('GITHUB_ACCESS_REVOKED');
  }
}

export async function fetchGithubRepositories(workspaceId: string) {
  const token = await getGithubToken(workspaceId);

  // Use GitHub API to fetch repositories the token can access
  // For GitHub Apps with user-to-server token, it's /user/installations -> repos
  // For standard OAuth it's /user/repos
  const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new AuthorizationError('GITHUB_ACCESS_REVOKED');
    }
    throw new Error(`Failed to fetch repositories: ${response.statusText}`);
  }

  const repos = await response.json();
  
  // Format the data we care about
  return repos.map((repo: any) => ({
    githubRepositoryId: repo.id.toString(),
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    visibility: repo.visibility || (repo.private ? 'private' : 'public'),
    defaultBranch: repo.default_branch,
    url: repo.html_url,
    archived: repo.archived,
    fork: repo.fork,
    updatedAt: repo.updated_at,
  }));
}
