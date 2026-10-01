import Link from 'next/link';
import type { Metadata } from 'next';
import { Shield, Search, BarChart3, Wrench, CheckCircle2, Eye } from 'lucide-react';

export const metadata: Metadata = {
  title: 'TraceEnd — Personal Attack Surface Management',
};

const steps = [
  {
    icon: Search,
    title: 'Discover',
    description: 'Connect your assets — emails, domains, repositories, websites. TraceEnd maps your digital attack surface.',
  },
  {
    icon: BarChart3,
    title: 'Prioritize',
    description: 'Findings are classified by severity and potential impact. Focus on what matters most.',
  },
  {
    icon: Wrench,
    title: 'Remediate',
    description: 'Step-by-step remediation instructions tailored to your environment. Understand the fix, not just the finding.',
  },
  {
    icon: CheckCircle2,
    title: 'Verify',
    description: 'Confirm that your fixes are effective. Track resolution status and maintain an audit trail.',
  },
  {
    icon: Eye,
    title: 'Monitor',
    description: 'Continuous monitoring detects new exposures as they appear. Stay ahead of emerging risks.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-900 rounded-sm flex items-center justify-center">
              <Shield size={14} className="text-white" strokeWidth={2} />
            </div>
            <span className="text-sm font-semibold tracking-tight text-gray-900">TraceEnd</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-75"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-sm hover:bg-gray-800 transition-colors duration-75"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mb-3">
            Personal Attack Surface Management
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed mb-2">
            Discover your exposure. Understand the risk. Fix it. Verify it.
          </p>
          <p className="text-sm text-gray-400 leading-relaxed mb-8 max-w-lg">
            TraceEnd brings breach exposure, asset security, technical findings and
            remediation into one security workspace.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-sm hover:bg-gray-800 transition-colors duration-75"
            >
              Start security assessment
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-sm hover:bg-gray-50 transition-colors duration-75"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* How it works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">How it works</h2>
        <p className="text-sm text-gray-500 mb-10">
          A structured approach to personal security — from discovery to continuous monitoring.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-200">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="bg-white p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={16} className="text-gray-400" strokeWidth={1.5} />
                  <h3 className="text-sm font-semibold text-gray-900">{step.title}</h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* What TraceEnd detects */}
      <section className="border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">What TraceEnd detects</h2>
          <p className="text-sm text-gray-500 mb-8">
            Security findings across your digital presence.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            {[
              'Breach exposure & credential leaks',
              'API key & secret exposure in code',
              'Domain security misconfigurations',
              'DNS security problems',
              'TLS/HTTPS issues',
              'Missing security headers',
              'Public digital footprint exposure',
              'Image metadata & privacy issues',
              'Account security weaknesses',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 py-1">
                <span className="w-1 h-1 rounded-full bg-gray-400 mt-2 shrink-0" />
                <span className="text-sm text-gray-600">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiation */}
      <section className="border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Understanding, not just detection
          </h2>
          <p className="text-sm text-gray-500 mb-8 max-w-lg">
            Every finding includes a plain-English explanation, technical evidence,
            potential impact assessment, and step-by-step remediation instructions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-gray-200 border border-gray-200">
            {[
              {
                title: 'Evidence-based',
                desc: 'Findings originate from deterministic scanners and verifiable security checks. No invented vulnerabilities.',
              },
              {
                title: 'Action over fear',
                desc: 'Clear remediation steps instead of fear-based warnings. Know what to do and how to verify the fix.',
              },
              {
                title: 'Context-aware',
                desc: 'Historical exposure is not the same as current compromise. TraceEnd distinguishes between active risks and past events.',
              },
            ].map((item) => (
              <div key={item.title} className="bg-white p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-900 rounded-sm flex items-center justify-center">
              <Shield size={10} className="text-white" strokeWidth={2} />
            </div>
            <span className="text-xs font-medium text-gray-500">TraceEnd</span>
          </div>
          <span className="text-xs text-gray-400">Personal Attack Surface Management</span>
        </div>
      </footer>
    </div>
  );
}
