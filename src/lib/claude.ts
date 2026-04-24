export interface AskClaudeOptions {
  model?: string;
  maxTokens?: number;
  system?: string;
}

export interface AskClaudeResult {
  ok: true;
  text: string;
}

export interface AskClaudeError {
  ok: false;
  error: string;
}

export async function askClaude(
  prompt: string,
  options: AskClaudeOptions = {},
): Promise<AskClaudeResult | AskClaudeError> {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, ...options }),
    });

    if (!res.ok) {
      const msg = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${msg}` };
    }

    const data = (await res.json()) as { text?: string; error?: string };
    if (data.error) return { ok: false, error: data.error };
    return { ok: true, text: data.text ?? '' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
