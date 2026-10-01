import type { Metadata } from 'next';
import { Header } from '@/components/layout';
import { Badge } from '@/components/ui';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <>
      <Header title="Settings" description="Workspace and account configuration" />

      <div className="p-6 space-y-6 max-w-3xl">
        {/* Workspace */}
        <SettingsSection title="Workspace">
          <SettingsRow label="Name" value="Personal Workspace" />
          <SettingsRow label="Slug" value="personal" mono />
          <SettingsRow label="Plan" value={<Badge variant="default">Development</Badge>} />
        </SettingsSection>

        {/* Account */}
        <SettingsSection title="Account">
          <SettingsRow label="Email" value="dev@traceend.local" mono />
          <SettingsRow label="Authentication" value={<Badge variant="muted">Not configured</Badge>} />
        </SettingsSection>

        {/* Integrations */}
        <SettingsSection title="Integrations">
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-500 mb-1">No integrations configured</p>
            <p className="text-xs text-gray-400">
              GitHub, Slack, and webhook integrations will be available in a future release.
            </p>
          </div>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title="Notifications">
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-500 mb-1">Notification preferences</p>
            <p className="text-xs text-gray-400">
              Email and webhook notification settings will be available in a future release.
            </p>
          </div>
        </SettingsSection>

        {/* Danger Zone */}
        <SettingsSection title="Danger zone" danger>
          <div className="px-4 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900 font-medium">Delete workspace</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Permanently delete this workspace and all associated data.
              </p>
            </div>
            <button
              className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-sm hover:bg-red-50 transition-colors duration-75"
              disabled
            >
              Delete
            </button>
          </div>
        </SettingsSection>
      </div>
    </>
  );
}

function SettingsSection({
  title,
  children,
  danger,
}: {
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section className={`border bg-white ${danger ? 'border-red-200' : 'border-gray-200'}`}>
      <div className={`px-4 py-2.5 border-b ${danger ? 'border-red-200' : 'border-gray-200'}`}>
        <h2 className={`text-sm font-semibold ${danger ? 'text-red-700' : 'text-gray-900'}`}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function SettingsRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50 last:border-b-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
