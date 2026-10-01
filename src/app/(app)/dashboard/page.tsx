import type { Metadata } from 'next';
import { Header } from '@/components/layout';
import { db } from '@/lib/db';
import { getDefaultWorkspace } from '@/lib/services/workspace';
import { SeverityBadge, Badge } from '@/components/ui';
import { FINDING_STATUS_CONFIG } from '@/lib/types';
import Link from 'next/link';
import type { Severity, FindingStatus } from '@/generated/prisma/client';

export const metadata: Metadata = { title: 'Dashboard' };

async function getDashboardData() {
  // Get default workspace
  const workspace = await getDefaultWorkspace();
  if (!workspace) return null;

  const wId = workspace.id;

  const [severityCounts, resolvedCount, recentFindings, assetCount, scanCount, recentActivity] =
    await Promise.all([
      db.finding.groupBy({
        by: ['severity'],
        where: { workspaceId: wId, status: { notIn: ['RESOLVED', 'FALSE_POSITIVE'] } },
        _count: true,
      }),
      db.finding.count({
        where: { workspaceId: wId, status: { in: ['RESOLVED', 'FALSE_POSITIVE'] } },
      }),
      db.finding.findMany({
        where: { workspaceId: wId },
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        take: 8,
        include: {
          asset: { select: { id: true, type: true, identifier: true, displayName: true } },
        },
      }),
      db.asset.count({ where: { workspaceId: wId } }),
      db.scan.count({ where: { workspaceId: wId } }),
      db.activityEvent.findMany({
        where: { workspaceId: wId },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

  const counts = {
    critical: severityCounts.find((c) => c.severity === 'CRITICAL')?._count ?? 0,
    high: severityCounts.find((c) => c.severity === 'HIGH')?._count ?? 0,
    medium: severityCounts.find((c) => c.severity === 'MEDIUM')?._count ?? 0,
    low: severityCounts.find((c) => c.severity === 'LOW')?._count ?? 0,
    informational: severityCounts.find((c) => c.severity === 'INFORMATIONAL')?._count ?? 0,
    resolved: resolvedCount,
  };

  const totalOpen =
    counts.critical * 10 + counts.high * 6 + counts.medium * 3 + counts.low * 1;
  const posture = Math.max(0, Math.min(100, 100 - Math.min(totalOpen, 100)));

  return {
    workspace,
    counts,
    posture,
    recentFindings,
    assetCount,
    scanCount,
    recentActivity,
  };
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    return (
      <>
        <Header title="Dashboard" />
        <div className="p-6 text-sm text-gray-500">
          No workspace found. Run the database seed to get started.
        </div>
      </>
    );
  }

  const { counts, posture, recentFindings, assetCount, scanCount, recentActivity } = data;

  return (
    <>
      <Header title="Overview" description="Security posture and recent findings" />

      <div className="p-6 space-y-6">
        {/* Top stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200 border border-gray-200">
          <StatCard label="Security Posture" value={`${posture}`} suffix="/ 100" />
          <StatCard label="Open Findings" value={`${counts.critical + counts.high + counts.medium + counts.low}`} />
          <StatCard label="Assets Monitored" value={`${assetCount}`} />
          <StatCard label="Scans Completed" value={`${scanCount}`} />
        </div>

        {/* Severity breakdown */}
        <div className="border border-gray-200 bg-white">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Findings by severity</h2>
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-px bg-gray-100">
            <SeverityCell label="Critical" count={counts.critical} color="bg-severity-critical" />
            <SeverityCell label="High" count={counts.high} color="bg-severity-high" />
            <SeverityCell label="Medium" count={counts.medium} color="bg-severity-medium" />
            <SeverityCell label="Low" count={counts.low} color="bg-gray-400" />
            <SeverityCell label="Info" count={counts.informational} color="bg-gray-300" />
            <SeverityCell label="Resolved" count={counts.resolved} color="bg-status-success" />
          </div>
        </div>

        {/* Priority findings table + Recent activity */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Priority findings — 2 cols */}
          <div className="xl:col-span-2 border border-gray-200 bg-white">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Priority findings</h2>
              <Link
                href="/findings"
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors duration-75"
              >
                View all →
              </Link>
            </div>

            {recentFindings.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-gray-500">
                No findings detected. Start a scan to discover security issues.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-4 py-2 font-medium text-gray-500 text-xs">Severity</th>
                      <th className="px-4 py-2 font-medium text-gray-500 text-xs">Finding</th>
                      <th className="px-4 py-2 font-medium text-gray-500 text-xs hidden md:table-cell">Asset</th>
                      <th className="px-4 py-2 font-medium text-gray-500 text-xs hidden lg:table-cell">Category</th>
                      <th className="px-4 py-2 font-medium text-gray-500 text-xs">Status</th>
                      <th className="px-4 py-2 font-medium text-gray-500 text-xs hidden md:table-cell">Detected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentFindings.map((finding) => (
                      <tr
                        key={finding.id}
                        className="border-b border-gray-50 hover:bg-gray-25 transition-colors duration-75"
                      >
                        <td className="px-4 py-2.5">
                          <SeverityBadge severity={finding.severity as Severity} />
                        </td>
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/findings/${finding.id}`}
                            className="text-gray-900 hover:text-accent font-medium transition-colors duration-75"
                          >
                            {finding.title}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell">
                          <code className="text-xs font-mono text-gray-600">
                            {finding.asset.identifier}
                          </code>
                        </td>
                        <td className="px-4 py-2.5 hidden lg:table-cell text-gray-500 text-xs">
                          {finding.category.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant={FINDING_STATUS_CONFIG[finding.status as FindingStatus].variant}>
                            {FINDING_STATUS_CONFIG[finding.status as FindingStatus].label}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell text-xs text-gray-400">
                          {formatRelativeTime(finding.firstDetectedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent activity — 1 col */}
          <div className="border border-gray-200 bg-white">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Recent activity</h2>
              <Link
                href="/activity"
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors duration-75"
              >
                View all →
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentActivity.map((event) => (
                <div key={event.id} className="px-4 py-2.5">
                  <p className="text-xs text-gray-700 leading-relaxed">{event.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatRelativeTime(event.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="bg-white px-4 py-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold tabular-nums text-gray-900">{value}</span>
        {suffix && <span className="text-sm text-gray-400">{suffix}</span>}
      </div>
    </div>
  );
}

function SeverityCell({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="bg-white px-4 py-3 flex items-center gap-2.5">
      <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} aria-hidden="true" />
      <div>
        <div className="text-lg font-semibold tabular-nums text-gray-900">{count}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}
