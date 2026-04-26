'use client';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { MarketAd } from '@/lib/types';

interface SelectedAdPreviewProps {
  ad: MarketAd;
}

function isYouTube(url: string) {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

function youTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.endsWith('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
  } catch {
    return null;
  }
  return null;
}

export function SelectedAdPreview({ ad }: SelectedAdPreviewProps) {
  const youTubeEmbed = ad.videoUrl ? youTubeEmbedUrl(ad.videoUrl) : null;
  return (
    <Card title="Selected Ad Preview">
      <div className="grid gap-4 md:grid-cols-[280px,1fr]">
        <div className="overflow-hidden rounded-lg bg-black">
          {ad.videoUrl && youTubeEmbed ? (
            <iframe
              src={youTubeEmbed}
              title={`Selected ad ${ad.adId}`}
              allowFullScreen
              className="aspect-video w-full"
            />
          ) : ad.videoUrl ? (
            <video
              src={ad.videoUrl}
              controls
              preload="metadata"
              className="aspect-video w-full bg-black"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center text-xs text-white/60">
              No video URL
            </div>
          )}
        </div>
        <dl className="grid grid-cols-1 gap-2 text-sm">
          <Row label="Source advertiser" value={ad.gameName} />
          <Row label="Ad ID" value={ad.adId} />
          {ad.network && <Row label="Network" value={ad.network} />}
          {ad.format && <Row label="Format" value={ad.format} />}
          {ad.firstSeen && <Row label="First seen" value={ad.firstSeen} />}
          {ad.lastSeen && <Row label="Last seen" value={ad.lastSeen} />}
          {ad.market && <Row label="Market" value={ad.market} />}
          <div className="mt-2">
            <Badge variant={isYouTube(ad.videoUrl ?? '') ? 'accent' : 'neutral'}>
              {isYouTube(ad.videoUrl ?? '') ? 'YouTube source' : 'Direct video'}
            </Badge>
          </div>
        </dl>
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <dt className="min-w-[120px] text-xs uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </dt>
      <dd className="text-sm text-[var(--color-charcoal)]">{value}</dd>
    </div>
  );
}
