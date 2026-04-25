import 'server-only';

import type { MarketScanConfig, MarketScanResult } from '@/lib/types';

/**
 * Calls Sensor Tower live to fetch market ads matching config.
 * Implemented in Phase 4 (REQ-step2-market-scan).
 */
export async function fetchSensorTowerAds(
  _config: MarketScanConfig,
): Promise<MarketScanResult> {
  throw new Error('fetchSensorTowerAds not implemented in Phase 1 — see Phase 4');
}
