import 'server-only';

export function getGeminiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      'GEMINI_API_KEY is missing. Add it to .env.local (see .env.local.example).',
    );
  }
  return key;
}

export function getScenarioKey(): string {
  const key = process.env.SCENARIO_API_KEY;
  if (!key) {
    throw new Error(
      'SCENARIO_API_KEY is missing. Add it to .env.local (see .env.local.example).',
    );
  }
  return key;
}
