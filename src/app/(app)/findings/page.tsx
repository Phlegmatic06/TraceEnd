import type { Metadata } from 'next';
import { Header } from '@/components/layout';
import { FindingsTable } from '@/components/findings/findings-table';
import { FindingsFilters } from '@/components/findings/findings-filters';
import { db } from '@/lib/db';
import { getDefaultWorkspace } from '@/lib/services/workspace';
import type { Prisma, Severity, FindingStatus, FindingCategory } from '@/generated/prisma/client';

export const metadata: Metadata = { title: 'Findings' };

interface FindingsPageProps {
  searchParams: Promise<{
    page?: string;
    severity?: string;
    status?: string;
    category?: string;
    search?: string;
  }>;
}

export default async function FindingsPage({ searchParams }: FindingsPageProps) {
  const params = await searchParams;
  const workspace = await getDefaultWorkspace();
  if (!workspace) return <EmptyWorkspace />;

  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: Prisma.FindingWhereInput = { workspaceId: workspace.id };

  if (params.severity && isValidSeverity(params.severity)) {
    where.severity = params.severity as Severity;
  }
  if (params.status && isValidStatus(params.status)) {
    where.status = params.status as FindingStatus;
  }
  if (params.category && isValidCategory(params.category)) {
    where.category = params.category as FindingCategory;
  }
  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: 'insensitive' } },
      { description: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [findings, total] = await Promise.all([
    db.finding.findMany({
      where,
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
      include: {
        asset: { select: { id: true, type: true, identifier: true, displayName: true } },
      },
    }),
    db.finding.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <Header
        title="Findings"
        description={`${total} finding${total !== 1 ? 's' : ''} across all assets`}
      />
      <div className="p-6 space-y-4">
        <FindingsFilters
          currentSeverity={params.severity}
          currentStatus={params.status}
          currentCategory={params.category}
          currentSearch={params.search}
        />
        <FindingsTable
          findings={findings}
          pagination={{ page, total, totalPages, limit }}
        />
      </div>
    </>
  );
}

function EmptyWorkspace() {
  return (
    <>
      <Header title="Findings" />
      <div className="p-6 text-sm text-gray-500">No workspace found. Run the database seed.</div>
    </>
  );
}

function isValidSeverity(s: string): boolean {
  return ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'].includes(s);
}

function isValidStatus(s: string): boolean {
  return ['OPEN', 'IN_PROGRESS', 'MITIGATED', 'RESOLVED', 'ACCEPTED_RISK', 'FALSE_POSITIVE'].includes(s);
}

function isValidCategory(s: string): boolean {
  return ['SECRETS', 'BREACH_EXPOSURE', 'DOMAIN_SECURITY', 'WEB_SECURITY', 'TLS_SECURITY', 'HEADER_SECURITY', 'DIGITAL_FOOTPRINT', 'IMAGE_METADATA', 'ACCOUNT_SECURITY', 'CONFIGURATION', 'OTHER'].includes(s);
}
