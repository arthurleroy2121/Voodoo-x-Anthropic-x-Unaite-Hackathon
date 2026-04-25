'use client';

import { useState } from 'react';

import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { useApp } from '@/lib/state';

const GAMES = [
  { id: 'marble-sort', name: 'Marble Sort', category: 'Puzzle' },
  { id: 'control-mob', name: 'Control Mob', category: 'Battle' },
] as const;

type GameId = (typeof GAMES)[number]['id'];
type ScanPeriod = '7d' | '30d' | '90d';

const SCAN_PERIOD_OPTIONS: { value: ScanPeriod; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

interface GameIdentityProps {
  onStartMarketScan: () => void;
}

export function GameIdentity({ onStartMarketScan }: GameIdentityProps) {
  const [selectedGameId, setSelectedGameId] = useState<GameId | ''>('');
  const [scanPeriod, setScanPeriod] = useState<ScanPeriod>('7d');
  const setGameIdentity = useApp((s) => s.setGameIdentity);
  const setMarketScanConfig = useApp((s) => s.setMarketScanConfig);

  const selectedGame =
    GAMES.find((g) => g.id === selectedGameId) ?? null;

  const categoryLabel = selectedGame ? selectedGame.category : '—';

  function handleStart() {
    if (!selectedGame) return;
    setGameIdentity({
      gameId: selectedGame.id,
      gameName: selectedGame.name,
      category: selectedGame.category,
      tags: [],
    });
    setMarketScanConfig({
      category: selectedGame.category,
      tags: [],
      numberOfAds: 30,
      timeRange: scanPeriod,
      market: 'US',
    });
    onStartMarketScan();
  }

  return (
    <div style={{ maxWidth: '28rem' }}>
      <Card
        title="Game Identity"
        description="Select the game to analyze for this creative campaign."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Select
            label="Game"
            value={selectedGameId}
            onChange={(e) =>
              setSelectedGameId(e.target.value as GameId | '')
            }
            style={{ width: '100%' }}
          >
            <option value="" disabled>
              Select a game…
            </option>
            {GAMES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
            }}
          >
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Game Category
            </span>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                alignSelf: 'flex-start',
                padding: '0.5rem 0.875rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: 500,
                background: selectedGame ? '#E91E63' : '#f3f4f6',
                color: selectedGame ? '#ffffff' : '#9ca3af',
                transition: 'all 0.15s ease',
              }}
            >
              {categoryLabel}
            </div>
          </div>

          <Select
            label="Scan period"
            value={scanPeriod}
            onChange={(e) => setScanPeriod(e.target.value as ScanPeriod)}
            style={{ width: '100%' }}
          >
            {SCAN_PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>

          <button
            type="button"
            disabled={!selectedGame}
            onClick={handleStart}
            style={{
              width: '100%',
              marginTop: '0.5rem',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#1a1a1a',
              background: selectedGame ? '#ffffff' : '#fafafa',
              border: `2px solid ${selectedGame ? '#E91E63' : '#e5e5e5'}`,
              borderRadius: '0.5rem',
              cursor: selectedGame ? 'pointer' : 'not-allowed',
              opacity: selectedGame ? 1 : 0.6,
              transition: 'all 0.15s ease',
              boxShadow: selectedGame
                ? '0 1px 2px rgba(0,0,0,0.05)'
                : 'none',
            }}
            onMouseEnter={(e) => {
              if (selectedGame) {
                e.currentTarget.style.background = '#E91E63';
                e.currentTarget.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedGame) {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.color = '#1a1a1a';
              }
            }}
          >
            Start Market Scan →
          </button>
        </div>
      </Card>
    </div>
  );
}
