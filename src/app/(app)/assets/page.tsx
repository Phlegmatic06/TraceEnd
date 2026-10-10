import type { Metadata } from 'next';
import { Header } from '@/components/layout';
import { Badge, EmptyState, Button } from '@/components/ui';
import { ASSET_TYPE_CONFIG, VERIFICATION_STATUS_CONFIG } from '@/lib/types';
import { db } from '@/lib/db';
import { getDefaultWorkspace } from '@/lib/services/workspace';
import { AddAssetButton } from '@/components/assets/add-asset-button';
import { ImportGithubButton } from '@/components/assets/import-github-button';
import {
  Mail, User, Globe, Monitor, GitFork, GitBranch, ImageIcon, FileText,
} from 'lucide-react';
import Link from 'next/link';
import type { AssetType, VerificationStatus } from '@/generated/prisma/client';

export const metadata: Metadata = { title: 'Assets' };

const assetIcons: Record<AssetType, React.ReactNode> = {
  EMAIL: <Mail size={14} strokeWidth={1.5} />,
  USERNAME: <User size={14} strokeWidth={1.5} />,
  DOMAIN: <Globe size={14} strokeWidth={1.5} />,
  WEBSITE: <Monitor size={14} strokeWidth={1.5} />,
  GITHUB_ACCOUNT: <GitFork size={14} strokeWidth={1.5} />,
  GITHUB_REPOSITORY: <GitBranch size={14} strokeWidth={1.5} />,
  IMAGE: <ImageIcon size={14} strokeWidth={1.5} />,
  OTHER: <FileText size={14} strokeWidth={1.5} />,
};

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function AssetsPage() {
  const workspace = await getDefaultWorkspace();
  if (!workspace) {
    return (
      <>
        <Header title="Assets" />
        <div className="p-6 text-sm text-gray-500">No workspace found. Run the database seed.</div>
      </>
    );
  }

  const assets = await db.asset.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { findings: true, scans: true } },
    },
  });

  return (
    <>
      <Header
        title="Assets"
        description={`${assets.length} asset${assets.length !== 1 ? 's' : ''} monitored`}
        actions={
          <div className="flex items-center gap-2">
            <ImportGithubButton />
            <AddAssetButton />
          </div>
        }
      />

      <div className="p-6">
        {assets.length === 0 ? (
          <div className="border border-gray-200 bg-white">
            <EmptyState
              title="No assets added"
              description="Add your first asset to start monitoring your attack surface."
              action={<AddAssetButton />}
            />
          </div>
        ) : (
          <div className="border border-gray-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-4 py-2.5 font-medium text-gray-500 text-xs">Asset</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500 text-xs w-32">Type</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500 text-xs hidden md:table-cell w-28">Verification</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500 text-xs hidden lg:table-cell w-28">Last scanned</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500 text-xs w-20">Findings</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500 text-xs w-20">Status</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => {
                  const typeConfig = ASSET_TYPE_CONFIG[asset.type as AssetType];
                  const verConfig = VERIFICATION_STATUS_CONFIG[asset.verificationStatus as VerificationStatus];
                  return (
                    <tr key={asset.id} className="border-b border-gray-50 hover:bg-gray-25 transition-colors duration-75">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">{assetIcons[asset.type as AssetType]}</span>
                          <Link href={`/assets/${asset.id}`} className="hover:underline">
                            <code className="text-xs font-mono text-blue-600">{asset.identifier}</code>
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{typeConfig.label}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant={verConfig.variant}>{verConfig.label}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">
                        {formatDate(asset.lastScannedAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 tabular-nums">
                        {asset._count.findings}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={asset.status === 'ACTIVE' ? 'success' : 'muted'}>
                          {asset.status.charAt(0) + asset.status.slice(1).toLowerCase()}
                        </Badge>
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
