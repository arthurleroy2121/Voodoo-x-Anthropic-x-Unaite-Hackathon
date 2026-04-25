import Link from 'next/link';

export function LandingCTA() {
  return (
    <div className="flex justify-center px-8 pb-12">
      <Link
        href="/project"
        className="inline-flex items-center gap-2 rounded-md bg-[--color-accent] px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent] focus-visible:ring-offset-2"
      >
        Get Started
      </Link>
    </div>
  );
}
