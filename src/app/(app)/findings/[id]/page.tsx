import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout';
import { SeverityBadge, Badge } from '@/components/ui';
import { FINDING_STATUS_CONFIG } from '@/lib/types';
import { db } from '@/lib/db';
import { getDefaultWorkspace } from '@/lib/services/workspace';
import { RemediationSection } from '@/components/findings/remediation-section';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Severity, FindingStatus } from '@/generated/prisma/client';
import { VerifyButton } from './verify-button';
import { FindingPoller } from './finding-poller';

interface FindingDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: FindingDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const finding = await db.finding.findUnique({ where: { id }, select: { title: true } });
  return { title: finding?.title || 'Finding' };
}

export default async function FindingDetailPage({ params }: FindingDetailPageProps) {
  const { id } = await params;
  const workspace = await getDefaultWorkspace();
  if (!workspace) notFound();

  const finding = await db.finding.findFirst({
    where: { id, workspaceId: workspace.id },
    include: {
      asset: { select: { id: true, type: true, identifier: true, displayName: true } },
      scan: { select: { id: true, type: true, createdAt: true } },
      remediations: {
        include: { steps: { orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      },
      activityEvents: {
        orderBy: { createdAt: 'desc' },
        take: 15,
      },
    },
  });

  if (!finding) notFound();

  const statusConfig = FINDING_STATUS_CONFIG[finding.status as FindingStatus];
  const evidence = finding.evidence as Record<string, unknown> | null;

  return (
    <>
      <Header
        title={finding.title}
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/findings"
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mr-2 transition-colors duration-75"
            >
              <ArrowLeft size={14} />
              Back to findings
            </Link>
            {finding.status !== 'RESOLVED' && <VerifyButton findingId={finding.id} isVerifying={finding.status === 'IN_PROGRESS'} />}
          </div>
        }
      />
      {finding.status === 'IN_PROGRESS' && <FindingPoller />}

      <div className="p-6 space-y-6 max-w-4xl">
        {/* Meta bar */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <SeverityBadge severity={finding.severity as Severity} />
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          <span className="text-gray-400">·</span>
          <span className="text-xs text-gray-500">{finding.category.replace(/_/g, ' ')}</span>
          <span className="text-gray-400">·</span>
          <code className="text-xs font-mono text-gray-600">{finding.asset.identifier}</code>
          <span className="text-gray-400">·</span>
          <span className="text-xs text-gray-400">
            Confidence: {finding.confidence.charAt(0) + finding.confidence.slice(1).toLowerCase()}
          </span>
        </div>

        {/* Overview section */}
        <Section title="What we detected">
          <p className="text-sm text-gray-700 leading-relaxed">{finding.description}</p>
        </Section>

        <Section title="Why this matters">
          <p className="text-sm text-gray-700 leading-relaxed">{finding.plainEnglishExplanation}</p>
        </Section>

        {/* Potential Impact */}
        <Section title="Potential impact">
          <p className="text-sm text-gray-700 leading-relaxed">{finding.potentialImpact}</p>
        </Section>

        {/* Technical Details */}
        {finding.technicalDetails && (
          <Section title="Technical details">
            <pre className="text-xs font-mono text-gray-700 bg-gray-50 border border-gray-200 p-3 overflow-x-auto whitespace-pre-wrap">
              {finding.technicalDetails}
            </pre>
          </Section>
        )}

        {/* Evidence */}
        {evidence && Object.keys(evidence).length > 0 && (
          <Section title="Evidence">
            <div className="bg-gray-50 border border-gray-200 p-3 overflow-x-auto">
              <table className="text-xs font-mono">
                <tbody>
                  {Object.entries(evidence).map(([key, value]) => (
                    <tr key={key}>
                      <td className="pr-4 py-0.5 text-gray-500 align-top whitespace-nowrap">
                        {key}
                      </td>
                      <td className="py-0.5 text-gray-700">
                        {typeof value === 'object'
                          ? JSON.stringify(value, null, 2)
                          : String(value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* Remediation */}
        {finding.remediations.length > 0 && (
          <Section title="Remediation">
            {finding.remediationSummary && (
              <p className="text-sm text-gray-600 mb-4">{finding.remediationSummary}</p>
            )}
            <RemediationSection remediations={finding.remediations} />
          </Section>
        )}

        {/* Activity */}
        {finding.activityEvents.length > 0 && (
          <Section title="Activity">
            <div className="space-y-0 divide-y divide-gray-100">
              {finding.activityEvents.map((event) => (
                <div key={event.id} className="py-2 flex items-start justify-between gap-4">
                  <p className="text-xs text-gray-700">{event.description}</p>
                  <time className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                    {event.createdAt.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Timestamps */}
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
            <div>
              <div className="text-gray-400 mb-0.5">First detected</div>
              {finding.firstDetectedAt.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
            <div>
              <div className="text-gray-400 mb-0.5">Last detected</div>
              {finding.lastDetectedAt.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
            {finding.resolvedAt && (
              <div>
                <div className="text-gray-400 mb-0.5">Resolved</div>
                {finding.resolvedAt.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            )}
            <div>
              <div className="text-gray-400 mb-0.5">Finding ID</div>
              <code className="font-mono">{finding.id}</code>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-gray-200 bg-white">
      <div className="px-4 py-2.5 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}
