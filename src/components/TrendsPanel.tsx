import { useState } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import { detectHyperCasualTrends, type TrendCandidate } from '../lib/trends';

type Os = 'ios' | 'android';

export default function TrendsPanel() {
  const [os, setOs] = useState<Os>('ios');
  const [country, setCountry] = useState('US');
  const [topN, setTopN] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<TrendCandidate[]>([]);
  const [evaluated, setEvaluated] = useState(0);

  async function onDetect() {
    setLoading(true);
    setError('');
    setResults([]);
    const out = await detectHyperCasualTrends({
      os,
      countries: [country],
      topN,
    });
    if (out.ok) {
      setResults(out.candidates);
      setEvaluated(out.evaluated);
    } else {
      setError(out.error);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs text-neutral-400">
          OS
          <select
            value={os}
            onChange={(e) => setOs(e.target.value as Os)}
            className="mt-1 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-sm"
          >
            <option value="ios">iOS</option>
            <option value="android">Android</option>
          </select>
        </label>

        <label className="flex flex-col text-xs text-neutral-400">
          Country
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
            className="mt-1 w-20 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-sm font-mono"
          />
        </label>

        <label className="flex flex-col text-xs text-neutral-400">
          Top N
          <input
            type="number"
            min={5}
            max={100}
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            className="mt-1 w-20 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-sm font-mono"
          />
        </label>

        <button
          onClick={onDetect}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <TrendingUp className="size-4" />}
          {loading ? 'Scanning…' : 'Detect rising hyper-casual'}
        </button>
      </div>

      {error && (
        <pre className="whitespace-pre-wrap rounded-md border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-300">
          {error}
        </pre>
      )}

      {results.length > 0 && (
        <div className="overflow-hidden rounded-md border border-neutral-800">
          <div className="border-b border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-400">
            {evaluated} apps evaluated · sorted by momentum-weighted downloads
          </div>
          <table className="w-full text-sm">
            <thead className="bg-neutral-950 text-xs text-neutral-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">Game</th>
                <th className="px-3 py-2 text-left font-medium">Publisher</th>
                <th className="px-3 py-2 text-right font-medium">Recent (7d)</th>
                <th className="px-3 py-2 text-right font-medium">Momentum</th>
                <th className="px-3 py-2 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {results.map((c, i) => (
                <tr
                  key={c.app_id}
                  className="border-t border-neutral-900 hover:bg-neutral-900/40"
                >
                  <td className="px-3 py-2 text-neutral-500">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-neutral-100">{c.name}</td>
                  <td className="px-3 py-2 text-neutral-400">{c.publisher}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {c.recent_downloads.toLocaleString()}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono ${
                      c.momentum >= 1.5
                        ? 'text-emerald-400'
                        : c.momentum < 0.8
                          ? 'text-red-400'
                          : 'text-neutral-300'
                    }`}
                  >
                    {c.momentum < 0 ? '∞' : `${c.momentum}×`}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-violet-300">{c.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
