import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { askClaude } from '../lib/claude';

export default function ClaudeTest() {
  const [prompt, setPrompt] = useState('Say hello and confirm you are Claude.');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError('');
    setAnswer('');
    const result = await askClaude(prompt);
    if (result.ok) setAnswer(result.text);
    else setError(result.error);
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        className="w-full rounded-md border border-neutral-800 bg-neutral-950 p-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button
        onClick={onSubmit}
        disabled={loading || !prompt.trim()}
        className="inline-flex items-center gap-2 self-start rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {loading ? 'Asking Claude…' : 'Ask Claude'}
      </button>

      {answer && (
        <pre className="whitespace-pre-wrap rounded-md border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-200">
          {answer}
        </pre>
      )}
      {error && (
        <pre className="whitespace-pre-wrap rounded-md border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-300">
          {error}
        </pre>
      )}
    </div>
  );
}
