import type { Metadata } from 'next';
import { Header } from '@/components/layout';
import { Badge, EmptyState } from '@/components/ui';
import { SCAN_STATUS_CONFIG } from '@/lib/types';
import { db } from '@/lib/db';
import { getDefaultWorkspace } from '@/lib/services/workspace';
import type { ScanStatus } from '@/generated/prisma/client';

export const metadata: Metadata = { title: 'Scans' };

function formatDuration(start: Date | null, end: Date | null): string {
  if (!start) return '—';
  const endTime = end || new Date();
  const diffMs = endTime.getTime() - start.getTime();
  if (diffMs < 1000) return '<1s';
  if (diffMs < 60000) return `${Math.round(diffMs / 1000)}s`;
  return `${Math.round(diffMs / 60000)}m`;
}

function formatDateTime(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function ScansPage() {
  const workspace = await getDefaultWorkspace();
  if (!workspace) {
    return (
      <>
        <Header title="Scans" />
        <div className="p-6 text-sm text-gray-500">No workspace found. Run the database seed.</div>
      </>
    );
  }

  const scans = await db.scan.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: 'desc' },
    include: {
      asset: { select: { id: true, type: true, identifier: true, displayName: true } },
    },
  });

  return (
    <>
      <Header
        title="Scans"
        description="Scan history and status"
      />

      <div className="p-6">
        {scans.length === 0 ? (
          <div className="border border-gray-200 bg-white">
            <EmptyState
              title="No scans yet"
              description="Start a scan from the Assets page to discover security issues."
            />
          </div>
        ) : (
          <div className="border border-gray-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-4 py-2.5 font-medium text-gray-500 text-xs">Scan ID</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500 text-xs">Asset</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500 text-xs hidden md:table-cell">Type</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500 text-xs hidden lg:table-cell">Started</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500 text-xs hidden md:table-cell w-20">Duration</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500 text-xs w-20">Findings</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500 text-xs w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => {
                  const statusConfig = SCAN_STATUS_CONFIG[scan.status as ScanStatus];
                  return (
                    <tr key={scan.id} className="border-b border-gray-50 hover:bg-gray-25 transition-colors duration-75">
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono text-gray-600">{scan.id.slice(0, 8)}</code>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono text-gray-900">{scan.asset.identifier}</code>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                        {scan.type.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">
                        {scan.startedAt ? formatDateTime(scan.startedAt) : '—'}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-400 tabular-nums">
                        {formatDuration(scan.startedAt, scan.completedAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 tabular-nums">
                        {scan.findingsCount}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
