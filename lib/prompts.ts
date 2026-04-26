import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const cache = new Map<string, string>();

export async function loadPrompt(slug: string): Promise<string> {
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(`loadPrompt: invalid slug "${slug}"`);
  }
  const cached = cache.get(slug);
  if (cached !== undefined) return cached;
  const file = path.join(process.cwd(), 'prompts', `${slug}.md`);
  const contents = await readFile(file, 'utf8');
  cache.set(slug, contents);
  return contents;
}
