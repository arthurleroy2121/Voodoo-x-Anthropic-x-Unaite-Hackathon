export function Hero() {
  return (
    <section className="flex flex-col items-center px-8 pt-24 pb-12 text-center">
      <h1 className="text-5xl font-semibold tracking-tight text-[var(--color-charcoal)] md:text-6xl">
        Voodoo Creative Radar
      </h1>
      <p className="mt-4 text-xl text-[var(--color-muted)]">
        From Market Signals to Testable Creatives
      </p>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--color-muted)]">
        Analyse market ads, extract winning creative patterns, and generate a testable 15-second ad for a selected Voodoo game.
      </p>
    </section>
  );
}
