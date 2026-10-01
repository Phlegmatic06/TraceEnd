'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui';
import type { Scan } from '@/generated/prisma/client';

export function ScanList({ initialScans, assetId }: { initialScans: Scan[], assetId: string }) {
  const router = useRouter();

  useEffect(() => {
    // Basic polling mechanism if any scan is queued or running
    const hasActiveScans = initialScans.some(s => s.status === 'QUEUED' || s.status === 'RUNNING');
    
    if (hasActiveScans) {
      const interval = setInterval(() => {
        router.refresh();
      }, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [initialScans, router]);

  if (initialScans.length === 0) {
    return <div className="p-4 text-sm text-gray-500">No scans have been run for this asset.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left bg-gray-50">
            <th className="px-4 py-2 font-medium text-gray-500 text-xs">Date</th>
            <th className="px-4 py-2 font-medium text-gray-500 text-xs">Type</th>
            <th className="px-4 py-2 font-medium text-gray-500 text-xs">Status</th>
            <th className="px-4 py-2 font-medium text-gray-500 text-xs">Findings</th>
            <th className="px-4 py-2 font-medium text-gray-500 text-xs">Duration</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {initialScans.map(scan => {
            let durationStr = '—';
            if (scan.startedAt && scan.completedAt) {
              const ms = scan.completedAt.getTime() - scan.startedAt.getTime();
              durationStr = (ms / 1000).toFixed(1) + 's';
            }
            return (
              <tr key={scan.id} className="hover:bg-gray-25">
                <td className="px-4 py-2 text-xs">
                  {scan.createdAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-2 text-xs">{scan.type}</td>
                <td className="px-4 py-2">
                  <Badge 
                    variant={
                      scan.status === 'COMPLETED' ? 'success' : 
                      scan.status === 'FAILED' ? 'danger' : 
                      scan.status === 'RUNNING' ? 'warning' : 'muted'
                    }
                  >
                    {scan.status}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-xs">{scan.findingsCount}</td>
                <td className="px-4 py-2 text-xs text-gray-500">{durationStr}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
