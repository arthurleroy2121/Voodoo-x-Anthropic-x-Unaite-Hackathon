'use client';

import { Play } from 'lucide-react';

import { useApp } from '@/lib/state';
import { cn } from '@/lib/utils';
import { formatNumberCompactFR } from '@/lib/formatters';
import type { MarketAd } from '@/lib/types';
import type { DashboardAd as DashboardAdType, NetworkAlias } from '@/lib/sensortower/types';

// ─────────────────────────────────────────────────────────────────────────────
// EXCEPTION DESIGN SYSTEM — couleurs des logos network tiers
// ─────────────────────────────────────────────────────────────────────────────
// Ces 3 hex codes sont des éléments de marque tierce (Meta, TikTok, YouTube) et
// constituent la SEULE exception autorisée à la règle "0 couleur hors tokens".
// Documentés ici pour grep-blacklist lors de la QA finale (cf. DECISIONS.md).
const NETWORK_BADGE_STYLES: Record<NetworkAlias, { bg: string; fg: string; label: string }> = {
  Meta: { bg: '#1877F2', fg: '#ffffff', label: 'Meta' },
  TikTok: { bg: '#000000', fg: '#FF0050', label: 'TikTok' },
  Youtube: { bg: '#FF0000', fg: '#ffffff', label: 'YouTube' },
};

// ─────────────────────────────────────────────────────────────────────────────

export interface AdCardProps {
  ad: DashboardAdType;
}

/**
 * AdCard — thumbnail 9/16 + métadata sous le thumbnail.
 *
 * Au clic :
 *   1. Convertit `DashboardAd` (type API) → `MarketAd` (type Zustand existant).
 *   2. Pousse `setSelectedAd(marketAd)`.
 *   3. Bascule l'onglet vers `patterns` via `setStep('patterns')`.
 *
 * On garde la nav INTERNE à `/project` plutôt que `router.push('/pattern')` pour
 * rester cohérent avec l'AppShell + sidebar + multi-projets existants.
 */
export function AdCard({ ad }: AdCardProps) {
  const setSelectedAd = useApp((s) => s.setSelectedAd);
  const setStep = useApp((s) => s.setStep);

  const networkStyle = NETWORK_BADGE_STYLES[ad.networkAlias];
  const isVideo = ad.format === 'video';

  function handleClick() {
    const marketAd: MarketAd = adapt(ad);
    setSelectedAd(marketAd);
    setStep('patterns');
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-left shadow-sm transition-all',
        'hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(233,30,99,0.4)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2',
      )}
      aria-label={`Sélectionner l'ad ${ad.gameName} sur ${networkStyle.label}`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-[var(--color-bg)]">
        {ad.thumbUrl ? (
          // S3-hosted asset → <img> natif (cf. décision design system, pas de next/image config).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ad.thumbUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[var(--color-muted)]">
            <span className="font-mono text-xs">Aperçu indisponible</span>
          </div>
        )}

        {/* Overlay gradient bas */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent"
          aria-hidden="true"
        />

        {/* Badge network — couleurs tiers documentées plus haut */}
        <span
          className="absolute left-3 top-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: networkStyle.bg, color: networkStyle.fg }}
        >
          {networkStyle.label}
        </span>

        {/* Play icon centrée si vidéo */}
        {isVideo && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors group-hover:bg-[var(--color-accent)]">
              <Play className="size-6 fill-current" />
            </span>
          </div>
        )}

        {/* Nom du jeu en bas du thumbnail */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="line-clamp-2 text-sm font-semibold text-white drop-shadow-md">
            {ad.gameName}
          </p>
          {ad.publisherName && (
            <p className="line-clamp-1 text-xs text-white/80 drop-shadow">
              {ad.publisherName}
            </p>
          )}
        </div>
      </div>

      {/* Footer card */}
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-lg font-semibold text-[var(--color-charcoal)]">
            {formatNumberCompactFR(ad.creativesCount)}
          </span>
          <span className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
            Creatives
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <FormatTag>{ad.format}</FormatTag>
          {ad.videoDurationSec != null && (
            <FormatTag>{Math.round(ad.videoDurationSec)} s</FormatTag>
          )}
        </div>
      </div>
    </button>
  );
}

interface FormatTagProps {
  children: React.ReactNode;
}

function FormatTag({ children }: FormatTagProps) {
  return (
    <span className="inline-flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-0.5 font-mono text-xs text-[var(--color-muted)]">
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter DashboardAd (sensortower types) → MarketAd (Zustand types)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convertit un `DashboardAd` (output API dashboard) en `MarketAd` (type accepté par
 * Zustand `setSelectedAd`). Les champs vidéo/image utilisent les URLs S3 telles que
 * retournées par Sensor Tower (pas d'auth_token requis pour le download).
 */
function adapt(ad: DashboardAdType): MarketAd {
  const stableFormat: MarketAd['format'] =
    ad.format === 'video' || ad.format === 'image' || ad.format === 'playable'
      ? ad.format
      : 'unknown';

  const isVideo = ad.format === 'video';

  // exactOptionalPropertyTypes: true → on ne peut pas passer `prop: undefined`.
  // On compose dynamiquement seulement les champs non-undefined.
  const base: MarketAd = {
    id: ad.creativeId,
    adId: ad.creativeId,
    gameName: ad.gameName,
    network: ad.networkAlias,
    format: stableFormat,
  };

  if (ad.creativeUrl) base.creativeUrl = ad.creativeUrl;
  if (ad.creativeUrl && isVideo) base.videoUrl = ad.creativeUrl;
  if (ad.creativeUrl && !isVideo && ad.format === 'image') base.imageUrl = ad.creativeUrl;
  if (ad.thumbUrl) base.thumbnailUrl = ad.thumbUrl;

  return base;
}

// Re-export the API DashboardAd type for callers building lists.
export type { DashboardAdType as DashboardAd };
