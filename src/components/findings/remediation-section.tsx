import { Badge } from '@/components/ui';
import { CheckCircle2, Circle, MinusCircle } from 'lucide-react';
import type { Remediation, RemediationStep, RemediationStepStatus } from '@/generated/prisma/client';

type RemediationWithSteps = Remediation & { steps: RemediationStep[] };

interface RemediationSectionProps {
  remediations: RemediationWithSteps[];
}

const effortLabels: Record<string, string> = {
  TRIVIAL: 'Trivial',
  LOW: 'Low effort',
  MODERATE: 'Moderate effort',
  HIGH: 'High effort',
  COMPLEX: 'Complex',
};

const stepStatusIcons: Record<RemediationStepStatus, React.ReactNode> = {
  COMPLETED: <CheckCircle2 size={14} className="text-status-success shrink-0" />,
  PENDING: <Circle size={14} className="text-gray-300 shrink-0" />,
  SKIPPED: <MinusCircle size={14} className="text-gray-300 shrink-0" />,
};

export function RemediationSection({ remediations }: RemediationSectionProps) {
  return (
    <div className="space-y-4">
      {remediations.map((rem) => (
        <div key={rem.id} className="border border-gray-100 rounded-sm">
          {/* Remediation header */}
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2 flex-wrap">
            {rem.environment && (
              <Badge variant="default">{rem.environment}</Badge>
            )}
            <span className="text-xs text-gray-500">{effortLabels[rem.estimatedEffort] || rem.estimatedEffort}</span>
            <span className="text-xs text-gray-400">
              · {rem.steps.filter((s) => s.status === 'COMPLETED').length}/{rem.steps.length} steps completed
            </span>
          </div>

          {/* Steps */}
          <div className="divide-y divide-gray-50">
            {rem.steps.map((step) => (
              <div key={step.id} className="px-3 py-3">
                <div className="flex items-start gap-2">
                  {stepStatusIcons[step.status]}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      <span className="text-xs text-gray-400 mr-1.5">{step.order}.</span>
                      {step.title}
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed mb-2">
                      {step.explanation}
                    </p>
                    {step.codeSnippet && (
                      <pre className="text-xs font-mono text-gray-700 bg-gray-50 border border-gray-200 p-2.5 overflow-x-auto whitespace-pre-wrap mb-2">
                        {step.codeSnippet}
                      </pre>
                    )}
                    {step.docUrl && (
                      <a
                        href={step.docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline"
                      >
                        Documentation →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
