import 'server-only';

/**
 * Loads a prompt template from prompts/<slug>.md.
 * Implemented in Phase 6 — used by gemini.ts, scenario.ts.
 */
export async function loadPrompt(_slug: string): Promise<string> {
  throw new Error('loadPrompt not implemented in Phase 1 — see Phase 6');
}
