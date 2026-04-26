'use client';

import { Check } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import {
  AD_CHARACTERISTIC_CATEGORIES,
  type AdCharacteristic,
  type AdCharacteristicCategory,
} from '@/lib/types';

interface CharacteristicChecklistProps {
  characteristics: AdCharacteristic[];
  selectedIds: string[];
  onToggle: (id: string, next: boolean) => void;
}

export function CharacteristicChecklist({
  characteristics,
  selectedIds,
  onToggle,
}: CharacteristicChecklistProps) {
  const grouped = groupByCategory(characteristics);
  const total = characteristics.length;
  const selected = selectedIds.length;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-charcoal)]">
            Characteristics
          </h2>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            {total} traits identified by AI — pick any combination to feed the prompt.
          </p>
        </div>
        <div className="text-xs font-medium text-[var(--color-muted)]">
          <span
            className={cn(
              selected === 0
                ? 'text-[var(--color-muted)]'
                : 'text-[var(--color-accent)]',
            )}
          >
            {selected}
          </span>
          /{total} selected
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {AD_CHARACTERISTIC_CATEGORIES.map((cat) => {
          const items = grouped[cat];
          if (!items || items.length === 0) return null;
          return (
            <CategoryGroup
              key={cat}
              category={cat}
              items={items}
              selectedIds={selectedIds}
              onToggle={onToggle}
            />
          );
        })}
      </div>
    </div>
  );
}

function CategoryGroup({
  category,
  items,
  selectedIds,
  onToggle,
}: {
  category: AdCharacteristicCategory;
  items: AdCharacteristic[];
  selectedIds: string[];
  onToggle: (id: string, next: boolean) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="accent">{category}</Badge>
        <span className="text-xs text-[var(--color-muted)]">
          {items.length} trait{items.length > 1 ? 's' : ''}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((c) => (
          <CharacteristicRow
            key={c.id}
            item={c}
            checked={selectedIds.includes(c.id)}
            onToggle={onToggle}
          />
        ))}
      </ul>
    </div>
  );
}

function CharacteristicRow({
  item,
  checked,
  onToggle,
}: {
  item: AdCharacteristic;
  checked: boolean;
  onToggle: (id: string, next: boolean) => void;
}) {
  return (
    <li>
      <label
        className={cn(
          'flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors',
          checked
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
            : 'border-[var(--color-border)] hover:bg-[var(--color-border)]/40',
        )}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onToggle(item.id, e.target.checked)}
        />
        <CheckBox checked={checked} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-charcoal)]">
            {item.label}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-charcoal)]/80">
            {item.description}
          </p>
          <p className="mt-1 border-l-2 border-[var(--color-accent)]/40 pl-2 text-[11px] italic text-[var(--color-muted)]">
            {item.evidence}
          </p>
        </div>
      </label>
    </li>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
        checked
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
          : 'border-[var(--color-border)] bg-[var(--color-surface)]',
      )}
    >
      {checked && <Check className="size-3.5" />}
    </span>
  );
}

function groupByCategory(
  items: AdCharacteristic[],
): Partial<Record<AdCharacteristicCategory, AdCharacteristic[]>> {
  const out: Partial<Record<AdCharacteristicCategory, AdCharacteristic[]>> = {};
  for (const c of items) {
    const bucket = out[c.category] ?? [];
    bucket.push(c);
    out[c.category] = bucket;
  }
  return out;
}
