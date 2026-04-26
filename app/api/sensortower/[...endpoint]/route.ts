import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

import { errorEnvelope } from '@/lib/api/errors';

// Vercel + project conventions (cf. CLAUDE.md).
export const runtime = 'nodejs';
export const maxDuration = 300;

// Cache à 5 min — la donnée Sensor Tower change peu sur la fenêtre 30j et le
// rate limit 6 req/s rend le re-fetch agressif risqué. La revalidation se fait
// via `next: { revalidate }` côté fetch.
const REVALIDATE_SECONDS = 300;

const SENSOR_TOWER_BASE_URL = 'https://api.sensortower.com/v1';

/**
 * Lit la clé API Sensor Tower depuis l'env serveur.
 * Throw explicite si manquante — on ne fallback PAS silencieusement.
 */
function getSensorTowerKey(): string {
  const key = process.env.SENSOR_TOWER_API_KEY;
  if (!key) {
    throw new Error(
      'SENSOR_TOWER_API_KEY is missing. Add it to .env.local (see .env.local.example).',
    );
  }
  return key;
}

/**
 * Forwarder GET générique vers `https://api.sensortower.com/v1/<endpoint>`.
 *
 * - Catch-all dynamic route : `endpoint` est un array (ex. `['unified', 'ad_intel', 'top_apps']`).
 * - Forwarde TOUS les query params reçus + injecte `auth_token` côté serveur.
 * - Token jamais exposé au browser (lecture `process.env` uniquement).
 * - Cache `next: { revalidate: 300 }` pour limiter la pression rate-limit.
 * - Erreurs 401/403/422/429/5xx propagées avec un envelope clair, pas de fallback silencieux.
 *
 * Le proxy n'est utilisé qu'EN INTERNE par les wrappers de `lib/sensortower/client.ts`
 * (server-to-server). Il accepte aussi des appels du browser uniquement pour
 * le debugging — la route reste server-side, le token n'est jamais leak.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ endpoint: string[] }> },
) {
  const { endpoint } = await ctx.params;

  if (!endpoint || endpoint.length === 0) {
    return NextResponse.json(
      errorEnvelope('VALIDATION', 'Missing endpoint path segments'),
      { status: 422 },
    );
  }

  // Reconstruit le chemin Sensor Tower (ex. "unified/ad_intel/top_apps").
  const path = endpoint.join('/');

  // Lit la clé — throw si manquante, on remonte une 500 explicite plutôt que de silencer.
  let authToken: string;
  try {
    authToken = getSensorTowerKey();
  } catch (e) {
    return NextResponse.json(errorEnvelope('INTERNAL', e), { status: 500 });
  }

  // Compose l'URL upstream avec tous les query params reçus + auth_token.
  const targetUrl = new URL(`${SENSOR_TOWER_BASE_URL}/${path}`);
  for (const [key, value] of req.nextUrl.searchParams.entries()) {
    // Override interdite — on injecte notre auth_token côté serveur.
    if (key === 'auth_token') continue;
    targetUrl.searchParams.append(key, value);
  }
  targetUrl.searchParams.set('auth_token', authToken);

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl.toString(), {
      method: 'GET',
      // Cache server-side. `next.revalidate` est l'API officielle Next 15+ pour
      // contrôler le cache des fetches serveur (pas `cache: 'force-cache'`).
      next: { revalidate: REVALIDATE_SECONDS },
      headers: {
        accept: 'application/json',
      },
    });
  } catch (e) {
    return NextResponse.json(errorEnvelope('UPSTREAM', e), { status: 502 });
  }

  // Log dev des headers de quota Sensor Tower (utile pour ne pas exploser le rate limit).
  if (process.env.NODE_ENV === 'development') {
    const limit = upstream.headers.get('x-api-usage-limit');
    const count = upstream.headers.get('x-api-usage-count');
    if (limit || count) {
      console.log(
        `[sensortower] ${path} — usage ${count ?? '?'}/${limit ?? '?'}`,
      );
    }
  }

  // Lit le body en texte d'abord pour pouvoir reformatter en envelope si erreur.
  const contentType = upstream.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const rawBody = await upstream.text();

  if (!upstream.ok) {
    // Mappe les codes Sensor Tower documentés vers nos codes internes.
    let code: 'VALIDATION' | 'UPSTREAM' = 'UPSTREAM';
    if (upstream.status === 422) code = 'VALIDATION';
    return NextResponse.json(
      errorEnvelope(
        code,
        `Sensor Tower ${path} returned ${upstream.status}: ${rawBody.slice(0, 500)}`,
      ),
      { status: upstream.status },
    );
  }

  if (!isJson) {
    return NextResponse.json(
      errorEnvelope(
        'BAD_RESPONSE',
        `Sensor Tower ${path} returned non-JSON content-type: ${contentType}`,
      ),
      { status: 502 },
    );
  }

  // Re-parse le JSON pour le servir avec le bon content-type et propager le status.
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch (e) {
    return NextResponse.json(errorEnvelope('BAD_RESPONSE', e), { status: 502 });
  }

  return NextResponse.json(parsed, { status: 200 });
}
