import type { Layer } from '@/lib/editor';
import { cn } from '@/lib/utils';

const layers = [
  { id: 'top', label: 'Top layer', note: 'The full table the keyboard types without Fn.' },
  {
    id: 'fn',
    label: 'Fn layer',
    note: 'Only the keys you change are sent. Every other Fn combination stays with the firmware. Overrides are remembered in this browser.',
  },
] as const;

type LayerTabsProps = {
  layer: Layer;
  disabled: boolean;
  onChange: (layer: Layer) => void;
};

export function LayerTabs({ layer, disabled, onChange }: LayerTabsProps) {
  const active = layers.find((item) => item.id === layer) ?? layers[0];

  return (
    <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
      <div
        className="inline-flex rounded-control border border-line bg-surface p-1"
        role="tablist"
        aria-label="Layer"
      >
        {layers.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={layer === item.id}
            disabled={disabled}
            className={cn(
              'h-7 rounded-[6px] px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              layer === item.id
                ? 'bg-keycap text-brass shadow-[inset_0_-1px_0_rgba(0,0,0,0.4)]'
                : 'text-muted hover:text-ivory',
            )}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="max-w-md text-xs text-muted sm:text-right">{active.note}</p>
    </div>
  );
}
