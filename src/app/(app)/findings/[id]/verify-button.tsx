'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function VerifyButton({ findingId, isVerifying }: { findingId: string, isVerifying: boolean }) {
  const [isLoading, setIsLoading] = useState(isVerifying);
  const router = useRouter();

  const handleVerify = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/findings/${findingId}/verify`, {
        method: 'POST',
      });
      if (res.ok) {
        router.refresh();
      } else {
        const error = await res.json();
        alert(error?.error?.message || 'Failed to start verification');
        setIsLoading(false);
      }
    } catch (error) {
      alert('Failed to start verification');
      setIsLoading(false);
    }
  };

  return (
    <Button 
      size="sm" 
      onClick={handleVerify} 
      disabled={isLoading || isVerifying} 
      className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
    >
      {isLoading || isVerifying ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
      Verify Fix
    </Button>
  );
}
