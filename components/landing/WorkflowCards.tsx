const STEPS = [
  {
    number: '01',
    title: 'Select a game',
    description: 'Pick a Voodoo game and confirm its category and tags.',
  },
  {
    number: '02',
    title: 'Scan the market',
    description: 'Run a live Sensor Tower scan to retrieve top competitor ads.',
  },
  {
    number: '03',
    title: 'Analyze winning patterns',
    description: 'Use Gemini to surface the patterns behind a winning ad.',
  },
  {
    number: '04',
    title: 'Generate a creative',
    description: 'Produce a 30-second vertical ad via Scenario.',
  },
] as const;

export function WorkflowCards() {
  return (
    <section aria-label="Workflow" className="mx-auto w-full max-w-6xl px-8 pb-24">
      <ol className="relative grid grid-cols-1 gap-8 md:grid-cols-4">
        {/* Connecting line — visible only on md+ between numbers */}
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-5 hidden h-px bg-[--color-border] md:block"
        />
        {STEPS.map((step) => (
          <li key={step.number} className="relative flex flex-col items-start gap-3">
            <span className="relative z-10 inline-flex size-10 items-center justify-center rounded-full bg-[--color-surface] font-mono text-sm font-semibold text-[--color-accent] ring-1 ring-[--color-border]">
              {step.number}
            </span>
            <h3 className="text-base font-semibold text-[--color-charcoal]">{step.title}</h3>
            <p className="text-sm leading-relaxed text-[--color-muted]">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
