import { Sparkles } from 'lucide-react';
import ClaudeTest from './components/ClaudeTest';

export default function App() {
  return (
    <main className="min-h-full p-8 max-w-3xl mx-auto">
      <header className="mb-8 flex items-center gap-3">
        <Sparkles className="size-6 text-violet-400" />
        <h1 className="text-2xl font-semibold tracking-tight">Voodoo Hack</h1>
        <span className="text-xs text-neutral-500 ml-auto">Voodoo x Unaite x Anthropic — 25–26 April 2026</span>
      </header>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
        <h2 className="text-sm font-medium text-neutral-300 mb-1">Claude smoke test</h2>
        <p className="text-xs text-neutral-500 mb-4">Verifies the serverless API route + API key wiring.</p>
        <ClaudeTest />
      </section>
    </main>
  );
}
