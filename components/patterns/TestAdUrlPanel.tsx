'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useApp } from '@/lib/state';
import type { MarketAd } from '@/lib/types';

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `test-${Date.now().toString(36)}`;
}

export function TestAdUrlPanel() {
  const setSelectedAd = useApp((s) => s.setSelectedAd);
  const [url, setUrl] = useState('');
  const [gameName, setGameName] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      setError('Please paste a valid URL (https://...).');
      return;
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      setError('URL must start with http:// or https://');
      return;
    }

    const ad: MarketAd = {
      id: newId(),
      adId: `test-${Date.now().toString(36)}`,
      gameName: gameName.trim() || 'Test Ad',
      videoUrl: url.trim(),
      format: 'video',
      rankingReason: 'DEV TEST INPUT — supplied manually pending Step 2',
    };
    setSelectedAd(ad);
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-6">
      <div className="mb-4 inline-flex items-center rounded-full bg-amber-300 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-900">
        Dev test input
      </div>
      <h2 className="mb-1 text-base font-semibold text-amber-900">
        Inject an ad URL manually
      </h2>
      <p className="mb-4 text-sm text-amber-800">
        Step 2 (Market Scan) is still under development. Paste a publicly
        fetchable video URL (direct .mp4 or YouTube link) to feed Pattern
        Analysis. Replace with the Top 3 selection once Step 2 ships.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Video URL"
          placeholder="https://example.com/ad.mp4 or https://youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <Input
          label="Source advertiser (display only)"
          placeholder="Royal Match"
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" variant="primary" size="md" className="self-start">
          Use this URL
        </Button>
      </form>
    </div>
  );
}
