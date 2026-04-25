import { cn } from '@/lib/utils';

export function Sidebar() {
  return (
    <nav className="flex h-full flex-col gap-6 p-6" aria-label="Project navigation">
      <div>
        <span className="text-sm font-semibold text-[--color-charcoal]">
          Voodoo Creative Radar
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[--color-muted]">
          Projects
        </span>

        <ul className="flex flex-col gap-1">
          <li>
            <span
              aria-current="page"
              className="flex items-center gap-2 rounded-md bg-[--color-bg] px-3 py-1.5 text-sm font-medium text-[--color-charcoal]"
            >
              <span className="text-[--color-accent]" aria-hidden="true">
                •
              </span>
              Demo Project
            </span>
          </li>
        </ul>
      </div>

      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Multi-project support is a future enhancement"
        className={cn(
          'mt-auto inline-flex items-center justify-start gap-2 rounded-md px-3 py-1.5 text-sm font-medium',
          'cursor-not-allowed opacity-40 text-[--color-charcoal]',
        )}
      >
        + New Project
      </button>
    </nav>
  );
}
