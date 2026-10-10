'use client';

import { useState, useEffect } from 'react';
import { Button, Badge } from '@/components/ui';
import { GitBranch, X, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ImportGithubButton() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'LOADING' | 'READY' | 'NOT_CONNECTED' | 'ERROR'>('LOADING');
  const [repos, setRepos] = useState<any[]>([]);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchRepos = async () => {
    setStatus('LOADING');
    setError('');
    try {
      const res = await fetch('/api/integrations/github/repositories');
      if (res.status === 401 || res.status === 403) {
        setStatus('NOT_CONNECTED');
        return;
      }
      
      const data = await res.json();
      if (data.error) {
        if (data.error.code === 'GITHUB_NOT_CONNECTED' || data.error.code === 'GITHUB_ACCESS_REVOKED') {
          setStatus('NOT_CONNECTED');
        } else {
          throw new Error(data.error.message || 'Failed to fetch repositories');
        }
        return;
      }

      setRepos(data.data || []);
      setStatus('READY');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setStatus('ERROR');
    }
  };

  useEffect(() => {
    if (open) {
      fetchRepos();
    }
  }, [open]);



  const handleImport = async (repo: any) => {
    setImporting(repo.githubRepositoryId);
    setError('');

    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'GITHUB_REPOSITORY',
          identifier: repo.githubRepositoryId,
          displayName: repo.fullName,
          metadata: {
            githubRepositoryId: repo.githubRepositoryId,
            owner: repo.owner,
            repositoryName: repo.name,
            fullName: repo.fullName,
            defaultBranch: repo.defaultBranch,
            visibility: repo.visibility,
            url: repo.url,
            archived: repo.archived,
            fork: repo.fork,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || 'Failed to import repository');
        setImporting(null);
        return;
      }

      // Refresh repo list to show as imported
      setRepos(repos.map(r => r.githubRepositoryId === repo.githubRepositoryId ? { ...r, isImported: true } : r));
      router.refresh();
    } catch {
      setError('An unexpected error occurred during import');
    } finally {
      setImporting(null);
    }
  };

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <GitBranch size={14} />
        Import from GitHub
      </Button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setOpen(false)} />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-gray-200 shadow-lg flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Import GitHub Repository</h2>
            {status === 'LOADING' && <RefreshCw size={12} className="animate-spin text-gray-400" />}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && <p className="text-xs text-red-600">{error}</p>}
          
          {status === 'NOT_CONNECTED' && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-600 mb-4">GitHub integration is not configured or access was revoked.</p>
              <Button size="sm" onClick={() => router.push('/settings')}>Go to Settings</Button>
            </div>
          )}

          {status === 'READY' && repos.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">No repositories found.</p>
          )}

          {status === 'READY' && repos.length > 0 && (
            <div className="space-y-2">
              {repos.map(repo => (
                <div key={repo.githubRepositoryId} className="flex items-center justify-between p-3 border border-gray-200 rounded-sm hover:border-gray-300">
                  <div>
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      {repo.fullName}
                      {repo.visibility === 'private' && <Badge variant="muted">Private</Badge>}
                      {repo.archived && <Badge variant="muted">Archived</Badge>}
                    </p>
                    <p className="text-xs text-gray-500">Last updated: {new Date(repo.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={repo.isImported ? 'secondary' : 'primary'}
                    disabled={repo.isImported || importing === repo.githubRepositoryId}
                    onClick={() => handleImport(repo)}
                  >
                    {importing === repo.githubRepositoryId ? 'Importing...' : repo.isImported ? 'Imported' : 'Import'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
