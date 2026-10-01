import Link from 'next/link';
import { SeverityBadge, Badge, EmptyState, Button } from '@/components/ui';
import { FINDING_STATUS_CONFIG } from '@/lib/types';
import type { Severity, FindingStatus, Finding, Asset } from '@/generated/prisma/client';

type FindingWithAsset = Finding & {
  asset: Pick<Asset, 'id' | 'type' | 'identifier' | 'displayName'>;
};

interface FindingsTableProps {
  findings: FindingWithAsset[];
  pagination: {
    page: number;
    total: number;
    totalPages: number;
    limit: number;
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

export function FindingsTable({ findings, pagination }: FindingsTableProps) {
  if (findings.length === 0) {
    return (
      <div className="border border-gray-200 bg-white">
        <EmptyState
          title="No findings detected"
          description="Security findings discovered during scans will appear here."
          action={
            <Link href="/scans">
              <Button variant="secondary" size="sm">Start a scan</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="px-4 py-2.5 font-medium text-gray-500 text-xs w-28">Severity</th>
              <th className="px-4 py-2.5 font-medium text-gray-500 text-xs">Finding</th>
              <th className="px-4 py-2.5 font-medium text-gray-500 text-xs hidden md:table-cell">Asset</th>
              <th className="px-4 py-2.5 font-medium text-gray-500 text-xs hidden lg:table-cell">Category</th>
              <th className="px-4 py-2.5 font-medium text-gray-500 text-xs w-28">Status</th>
              <th className="px-4 py-2.5 font-medium text-gray-500 text-xs hidden md:table-cell w-24">Detected</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((finding) => {
              const statusConfig = FINDING_STATUS_CONFIG[finding.status as FindingStatus];
              return (
                <tr
                  key={finding.id}
                  className="border-b border-gray-50 hover:bg-gray-25 transition-colors duration-75"
                >
                  <td className="px-4 py-3">
                    <SeverityBadge severity={finding.severity as Severity} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/findings/${finding.id}`}
                      className="text-gray-900 hover:text-accent font-medium transition-colors duration-75"
                    >
                      {finding.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <code className="text-xs font-mono text-gray-600">
                      {finding.asset.identifier}
                    </code>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                    {finding.category.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-400">
                    {formatRelativeTime(finding.firstDetectedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            {pagination.page > 1 && (
              <Link
                href={`/findings?page=${pagination.page - 1}`}
                className="px-2 py-1 border border-gray-300 rounded-sm hover:bg-gray-50 transition-colors duration-75"
              >
                Previous
              </Link>
            )}
            {pagination.page < pagination.totalPages && (
              <Link
                href={`/findings?page=${pagination.page + 1}`}
                className="px-2 py-1 border border-gray-300 rounded-sm hover:bg-gray-50 transition-colors duration-75"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
