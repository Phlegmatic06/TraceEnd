import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout';
import { Badge } from '@/components/ui';
import { ASSET_TYPE_CONFIG, VERIFICATION_STATUS_CONFIG } from '@/lib/types';
import { db } from '@/lib/db';
import { getDefaultWorkspace } from '@/lib/services/workspace';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { AssetType, VerificationStatus } from '@/generated/prisma/client';
import { ScanButton } from './scan-button';
import { ScanList } from './scan-list';

interface AssetDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: AssetDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const asset = await db.asset.findUnique({ where: { id }, select: { identifier: true } });
  return { title: asset?.identifier || 'Asset' };
}

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const { id } = await params;
  const workspace = await getDefaultWorkspace();
  if (!workspace) notFound();

  const asset = await db.asset.findFirst({
    where: { id, workspaceId: workspace.id },
    include: {
      findings: {
        orderBy: { severity: 'desc' },
      },
      scans: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      }
    },
  });

  if (!asset) notFound();

  const typeConfig = ASSET_TYPE_CONFIG[asset.type as AssetType];
  const verConfig = VERIFICATION_STATUS_CONFIG[asset.verificationStatus as VerificationStatus];
  
  const canScan = asset.type === 'DOMAIN' || asset.type === 'WEBSITE';

  return (
    <>
      <Header
        title={asset.identifier}
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/assets"
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mr-2 transition-colors duration-75"
            >
              <ArrowLeft size={14} />
              Back to assets
            </Link>
            {canScan && <ScanButton assetId={asset.id} />}
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-4xl">
        {/* Meta bar */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="muted">{typeConfig.label}</Badge>
          <Badge variant={verConfig.variant}>{verConfig.label}</Badge>
          <span className="text-gray-400">·</span>
          <span className="text-xs text-gray-500">
            Added on {asset.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <span className="text-gray-400">·</span>
          <Badge variant={asset.status === 'ACTIVE' ? 'success' : 'muted'}>
            {asset.status.charAt(0) + asset.status.slice(1).toLowerCase()}
          </Badge>
        </div>

        {/* Scans section */}
        <section className="border border-gray-200 bg-white">
          <div className="px-4 py-2.5 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-900">Recent Scans</h2>
          </div>
          <div className="p-0">
            <ScanList initialScans={asset.scans} assetId={asset.id} />
          </div>
        </section>

        {/* Findings summary section */}
        <section className="border border-gray-200 bg-white">
          <div className="px-4 py-2.5 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Findings</h2>
          </div>
          <div className="p-4">
            {asset.findings.length === 0 ? (
              <p className="text-sm text-gray-500">No findings detected yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {asset.findings.slice(0, 5).map(f => (
                  <div key={f.id} className="flex justify-between items-center p-2 border border-gray-100 rounded">
                    <Link href={`/findings/${f.id}`} className="text-sm text-blue-600 hover:underline">{f.title}</Link>
                    <Badge variant={f.severity === 'CRITICAL' ? 'danger' : f.severity === 'HIGH' ? 'danger' : 'muted'}>
                      {f.severity}
                    </Badge>
                  </div>
                ))}
                {asset.findings.length > 5 && (
                  <Link href="/findings" className="text-xs text-gray-500 mt-2 hover:underline">View all {asset.findings.length} findings</Link>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
