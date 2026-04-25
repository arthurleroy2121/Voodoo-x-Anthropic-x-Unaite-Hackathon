import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASE_URL = 'https://api.sensortower.com/v1';

const ALLOWED_PATH_PREFIXES = [
  'ios/',
  'android/',
  'unified/',
];

interface ProxyBody {
  path?: string;
  params?: Record<string, string | number | boolean | string[] | undefined>;
}

function isPathAllowed(path: string): boolean {
  if (path.includes('..') || path.startsWith('/')) return false;
  return ALLOWED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function buildQuery(params: ProxyBody['params'], token: string): string {
  const usp = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        usp.set(key, value.join(','));
      } else {
        usp.set(key, String(value));
      }
    }
  }
  usp.set('auth_token', token);
  return usp.toString();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.SENSORTOWER_API_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'SENSORTOWER_API_TOKEN is not set' });
  }

  const { path, params } = (req.body ?? {}) as ProxyBody;

  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Missing "path" string in body' });
  }

  if (!isPathAllowed(path)) {
    return res.status(400).json({ error: `Path not allowed: ${path}` });
  }

  const url = `${BASE_URL}/${path}?${buildQuery(params, token)}`;

  try {
    const upstream = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
    return res.send(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(502).json({ error: `Upstream fetch failed: ${message}` });
  }
}
