'use client';

import { useState, useEffect } from 'react';
import { Badge, Button } from '@/components/ui';

export function GithubIntegration() {
  const [status, setStatus] = useState<'LOADING' | 'CONNECTED' | 'NOT_CONNECTED' | 'ERROR'>('LOADING');
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    fetch('/api/integrations/github')
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error.message);
        if (data.data?.status === 'CONNECTED') {
          setStatus('CONNECTED');
          setMetadata(data.data.metadata);
        } else {
          setStatus('NOT_CONNECTED');
        }
      })
      .catch(err => {
        console.error('Failed to load GitHub integration status', err);
        setStatus('ERROR');
      });
  }, []);

  const handleConnect = () => {
    // Redirect to our auth endpoint
    window.location.href = '/api/integrations/github/authorize';
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch('/api/integrations/github', { method: 'DELETE' });
      if (res.ok) {
        setStatus('NOT_CONNECTED');
        setMetadata(null);
      }
    } catch (err) {
      console.error('Failed to disconnect GitHub', err);
    }
  };

  if (status === 'LOADING') {
    return <div className="px-4 py-8 text-center text-sm text-gray-500">Loading integration status...</div>;
  }

  if (status === 'NOT_CONNECTED' || status === 'ERROR') {
    return (
      <div className="px-4 py-6 flex flex-col items-center justify-center text-center">
        <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-900 mb-1">GitHub Integration</p>
        <p className="text-xs text-gray-500 max-w-sm mb-4">
          Connect your GitHub account to synchronize and scan repositories for exposed secrets.
        </p>
        <Button onClick={handleConnect} variant="primary" size="sm">
          Connect GitHub
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
        <span className="text-sm text-gray-500">Status</span>
        <Badge variant="success">Connected</Badge>
      </div>
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
        <span className="text-sm text-gray-500">Account</span>
        <span className="text-sm text-gray-900 font-medium">@{metadata?.username}</span>
      </div>
      <div className="px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-500">Actions</span>
        <button
          onClick={handleDisconnect}
          className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
