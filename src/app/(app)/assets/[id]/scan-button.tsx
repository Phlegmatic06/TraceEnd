'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Play, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ScanButton({ assetId }: { assetId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleScan = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/scan`, {
        method: 'POST',
      });
      if (res.ok) {
        // Refresh page to show queued scan
        router.refresh();
      } else {
        const error = await res.json();
        alert(error?.error?.message || 'Failed to start scan');
      }
    } catch (error) {
      alert('Failed to start scan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button size="sm" onClick={handleScan} disabled={isLoading} className="gap-2">
      {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
      Start Scan
    </Button>
  );
}
