// ──────────────────────────────────────────────────────────────
// TraceEnd — Workspace Service
// ──────────────────────────────────────────────────────────────

import { db } from '@/lib/db';
import { NotFoundError, AuthenticationError, AuthorizationError } from '@/lib/errors';
import { auth } from '@/auth';

/**
 * Gets the current authenticated user from NextAuth session.
 */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthenticationError();
  }
  return session.user;
}

/**
 * Gets the default workspace for the currently authenticated user.
 */
export async function getDefaultWorkspace() {
  const user = await getCurrentUser();
  const membership = await db.workspaceMember.findFirst({
    where: { userId: user.id },
    include: {
      workspace: true,
      user: { select: { id: true, name: true, email: true } }
    },
  });

  if (!membership) {
    throw new NotFoundError('Workspace');
  }

  return membership.workspace;
}

/**
 * Ensures the authenticated user has access to the requested workspace.
 */
export async function getWorkspaceById(workspaceId: string) {
  const user = await getCurrentUser();
  
  const membership = await db.workspaceMember.findUnique({
    where: { userId_workspaceId: { workspaceId, userId: user.id } },
    include: { workspace: true },
  });

  if (!membership) {
    // Return NotFound to avoid enumerating workspaces, or AuthorizationError
    throw new AuthorizationError('You do not have access to this workspace');
  }

  return membership.workspace;
}
