'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type MouseEvent } from 'react';

import { cn } from '@/lib/utils';

const BOUNCE_DURATION_MS = 350;

export function SidebarLogo() {
  const router = useRouter();
  const [bouncing, setBouncing] = useState(false);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    setBouncing(true);
    window.setTimeout(() => {
      router.push('/');
    }, BOUNCE_DURATION_MS - 70);
  };

  return (
    <Link
      href="/"
      onClick={handleClick}
      onAnimationEnd={() => setBouncing(false)}
      aria-label="Retour à l'accueil — Voodoo Creative Radar"
      className={cn(
        'inline-flex items-center rounded-md border border-[--color-border] bg-[--color-surface]',
        'px-3 py-2 text-sm font-semibold text-[--color-charcoal]',
        'transition-[transform,box-shadow,border-color,opacity] duration-300 ease-out',
        'hover:-translate-y-0.5 hover:border-[--color-accent]',
        'hover:shadow-[0_0_24px_4px_rgba(233,30,99,0.35)]',
        bouncing &&
          'animate-[springBounce_350ms_cubic-bezier(0.34,1.56,0.64,1)] border-[--color-accent]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent] focus-visible:ring-offset-2',
      )}
    >
      Voodoo Creative Radar
    </Link>
  );
}
