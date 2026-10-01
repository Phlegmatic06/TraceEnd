// ──────────────────────────────────────────────────────────────
// TraceEnd — Activity Service
// ──────────────────────────────────────────────────────────────

import { db } from '@/lib/db';
import type { PaginationInput } from '@/lib/validators';

export async function getActivity(workspaceId: string, pagination: PaginationInput) {
  const skip = (pagination.page - 1) * pagination.limit;

  const [events, total] = await Promise.all([
    db.activityEvent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pagination.limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
        asset: { select: { id: true, type: true, displayName: true } },
        finding: { select: { id: true, title: true, severity: true } },
        scan: { select: { id: true, type: true, status: true } },
      },
    }),
    db.activityEvent.count({ where: { workspaceId } }),
  ]);

  return {
    events,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
}
