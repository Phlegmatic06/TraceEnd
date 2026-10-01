'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

const assetTypes = [
  { value: 'EMAIL', label: 'Email', placeholder: 'user@example.com' },
  { value: 'DOMAIN', label: 'Domain', placeholder: 'example.com' },
  { value: 'WEBSITE', label: 'Website', placeholder: 'https://example.com' },
  { value: 'GITHUB_ACCOUNT', label: 'GitHub Account', placeholder: 'github.com/username' },
  { value: 'GITHUB_REPOSITORY', label: 'GitHub Repository', placeholder: 'github.com/owner/repo' },
  { value: 'USERNAME', label: 'Username', placeholder: 'username' },
  { value: 'IMAGE', label: 'Image', placeholder: 'https://example.com/image.jpg' },
  { value: 'OTHER', label: 'Other', placeholder: 'Identifier' },
];

export function AddAssetButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('EMAIL');
  const [identifier, setIdentifier] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const selectedType = assetTypes.find((t) => t.value === type);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Identifier is required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          identifier: identifier.trim(),
          displayName: displayName.trim() || identifier.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || 'Failed to add asset');
        return;
      }

      setOpen(false);
      setIdentifier('');
      setDisplayName('');
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} />
        Add asset
      </Button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setOpen(false)} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-gray-200 shadow-lg flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Add asset</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="p-4 space-y-4 flex-1">
            {/* Type */}
            <div>
              <label htmlFor="asset-type" className="block text-xs font-medium text-gray-700 mb-1">
                Asset type
              </label>
              <select
                id="asset-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-sm bg-white text-gray-900 focus:outline-none focus:border-gray-400"
              >
                {assetTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Identifier */}
            <div>
              <label htmlFor="asset-identifier" className="block text-xs font-medium text-gray-700 mb-1">
                Identifier
              </label>
              <input
                id="asset-identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={selectedType?.placeholder}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
                autoFocus
              />
            </div>

            {/* Display Name */}
            <div>
              <label htmlFor="asset-display-name" className="block text-xs font-medium text-gray-700 mb-1">
                Display name <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="asset-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Human-readable label"
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add asset'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
