import type { Metadata } from 'next';
import { Header } from '@/components/layout';
import { EmptyState } from '@/components/ui';
import { db } from '@/lib/db';
import { getDefaultWorkspace } from '@/lib/services/workspace';
import {
  Shield, Radar, Box, AlertTriangle, CheckCircle2, ArrowRight,
} from 'lucide-react';

export const metadata: Metadata = { title: 'Activity' };

const actionIcons: Record<string, React.ReactNode> = {
  'finding.created': <AlertTriangle size={14} className="text-severity-medium" strokeWidth={1.5} />,
  'finding.status_changed': <ArrowRight size={14} className="text-gray-400" strokeWidth={1.5} />,
  'finding.resolved': <CheckCircle2 size={14} className="text-status-success" strokeWidth={1.5} />,
  'scan.created': <Radar size={14} className="text-gray-400" strokeWidth={1.5} />,
  'scan.started': <Radar size={14} className="text-status-warning" strokeWidth={1.5} />,
  'scan.completed': <Radar size={14} className="text-status-success" strokeWidth={1.5} />,
  'asset.created': <Box size={14} className="text-accent" strokeWidth={1.5} />,
};

function getActionIcon(action: string): React.ReactNode {
  return actionIcons[action] || <Shield size={14} className="text-gray-400" strokeWidth={1.5} />;
}

function formatDateTime(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateGroup(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default async function ActivityPage() {
  const workspace = await getDefaultWorkspace();
  if (!workspace) {
    return (
      <>
        <Header title="Activity" />
        <div className="p-6 text-sm text-gray-500">No workspace found. Run the database seed.</div>
      </>
    );
  }

  const events = await db.activityEvent.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Group events by day
  const grouped = new Map<string, typeof events>();
  for (const event of events) {
    const key = formatDateGroup(event.createdAt);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(event);
  }

  return (
    <>
      <Header
        title="Activity"
        description="Audit trail of security events"
      />

      <div className="p-6">
        {events.length === 0 ? (
          <div className="border border-gray-200 bg-white">
            <EmptyState
              title="No activity yet"
              description="Activity from scans, findings, and asset changes will appear here."
            />
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([dateLabel, dayEvents]) => (
              <div key={dateLabel}>
                <h2 className="text-xs font-medium text-gray-500 mb-2">{dateLabel}</h2>
                <div className="border border-gray-200 bg-white divide-y divide-gray-50">
                  {dayEvents.map((event) => (
                    <div key={event.id} className="px-4 py-2.5 flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">{getActionIcon(event.action)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700">{event.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <time className="text-xs text-gray-400">
                            {event.createdAt.toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </time>
                          {event.user && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span className="text-xs text-gray-400">{event.user.name || event.user.email}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
