import { cn } from '@/lib/utils';

export type View = 'keys' | 'screen';

const views = [
  { id: 'keys', label: 'Keys', note: 'Remap keys on the top and Fn layers.' },
  { id: 'screen', label: 'Screen', note: 'Set the clock on the keyboard screen.' },
] as const;

type ViewTabsProps = {
  view: View;
  disabled: boolean;
  onChange: (view: View) => void;
};

export function ViewTabs({ view, disabled, onChange }: ViewTabsProps) {
  const active = views.find((item) => item.id === view) ?? views[0];

  return (
    <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
      <div
        className="inline-flex rounded-control border border-line bg-surface p-1"
        role="tablist"
        aria-label="View"
      >
        {views.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={view === item.id}
            disabled={disabled}
            className={cn(
              'h-7 rounded-[6px] px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              view === item.id
                ? 'bg-keycap text-ivory shadow-[inset_0_-1px_0_rgba(0,0,0,0.4)]'
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
